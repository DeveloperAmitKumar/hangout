"use client";

import { getSupabase } from "@/lib/supabase";
import { fetchGames, fetchPolls } from "@/lib/games-polls-api";
import { fetchThreadMessages, fetchThreads } from "@/lib/dm-api";
import type { Database } from "@/lib/database.types";
import type { GameSession, Member, Message, Poll, PrivateMessage, PrivateThread, Room } from "@/types";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type JoinError = "not-found" | "expired" | "full" | "wrong-password" | "blocked";

/** SHA-256 hex of a room password (client-side, v1). */
export async function hashPassword(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hangout:${password}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const AVATAR_POOL = [47, 12, 32, 59, 15, 5, 26, 41];

function token(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toRoom(row: RoomRow, origin: string): Room {
  return {
    id: row.id,
    name: row.name,
    hostId: row.host_id ?? "",
    sessionDurationMinutes: row.session_duration_minutes,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    inviteToken: row.invite_token,
    inviteLink: `${origin}/join/${row.invite_token}`,
    visibility: row.visibility ?? "private",
    hasPassword: Boolean(row.password_hash),
  };
}

function toMember(row: MemberRow, roomId: string): Member {
  return {
    id: row.id,
    roomId,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? `https://i.pravatar.cc/96?img=${AVATAR_POOL[row.display_name.length % AVATAR_POOL.length]}`,
    isHost: row.is_host,
    isOnline: row.is_online,
    joinedAt: row.joined_at,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    type: row.type,
    content: row.content,
    reactions: row.reactions ?? {},
    createdAt: row.created_at,
  };
}

/** Create a room + host member. Throws on failure. */
export async function createRoom(input: {
  name: string;
  hostName: string;
  durationMinutes: number;
  visibility: "private" | "public";
  password?: string;
}): Promise<{ room: Room; me: Member }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  if (input.visibility === "public" && input.password) {
    throw new Error("Public rooms can't have passwords");
  }
  const origin = window.location.origin;
  const inviteToken = token();
  const expiresAt = new Date(Date.now() + input.durationMinutes * 60_000).toISOString();
  const password_hash =
    input.visibility === "private" && input.password?.trim()
      ? await hashPassword(input.password.trim())
      : null;

  const { data: roomRow, error: roomErr } = await sb
    .from("rooms")
    .insert({
      name: input.name.trim(),
      session_duration_minutes: input.durationMinutes,
      invite_token: inviteToken,
      expires_at: expiresAt,
      visibility: input.visibility,
      password_hash,
    })
    .select()
    .single();
  if (roomErr || !roomRow) throw new Error(roomErr?.message ?? "Failed to create room");

  const { data: memRow, error: memErr } = await sb
    .from("members")
    .insert({ room_id: roomRow.id, display_name: input.hostName.trim(), is_host: true })
    .select()
    .single();
  if (memErr || !memRow) throw new Error(memErr?.message ?? "Failed to add host");

  await sb.from("rooms").update({ host_id: memRow.id }).eq("id", roomRow.id);
  await sb.from("messages").insert({
    room_id: roomRow.id,
    sender_id: null,
    type: "system",
    content: `${input.hostName.trim()} created the playground · ${input.durationMinutes} min session`,
  });

  return {
    room: toRoom({ ...roomRow, host_id: memRow.id }, origin),
    me: toMember(memRow, roomRow.id),
  };
}

export async function fetchRoomByToken(
  inviteToken: string
): Promise<{ room: Room; members: Member[]; messages: Message[]; polls: Poll[]; games: GameSession[]; threads: PrivateThread[]; dms: PrivateMessage[] } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: roomRow } = await sb.from("rooms").select("*").eq("invite_token", inviteToken).single();
  if (!roomRow) return null;
  const [{ data: memberRows }, { data: messageRows }, polls, games, threads] = await Promise.all([
    sb.from("members").select("*").eq("room_id", roomRow.id).order("joined_at"),
    sb.from("messages").select("*").eq("room_id", roomRow.id).order("created_at").limit(200),
    fetchPolls(roomRow.id),
    fetchGames(roomRow.id),
    fetchThreads(roomRow.id),
  ]);
  const dms = await fetchThreadMessages(threads.map((t) => t.id));
  return {
    room: toRoom(roomRow, window.location.origin),
    members: (memberRows ?? []).map((m) => toMember(m, roomRow.id)),
    messages: (messageRows ?? []).map(toMessage),
    polls,
    games,
    threads,
    dms,
  };
}

/** Pre-join check: room state + whether a password is needed (no member created). */
export async function fetchJoinInfo(
  inviteToken: string
): Promise<
  | { status: "not-found" }
  | { status: "expired"; name: string }
  | { status: "full"; name: string }
  | { status: "ok"; name: string; hasPassword: boolean; memberCount: number; roomId: string }
> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: roomRow } = await sb.from("rooms").select("*").eq("invite_token", inviteToken).single();
  if (!roomRow) return { status: "not-found" };
  if (new Date(roomRow.expires_at).getTime() <= Date.now()) return { status: "expired", name: roomRow.name };
  const { count } = await sb.from("members").select("id", { count: "exact", head: true }).eq("room_id", roomRow.id);
  if ((count ?? 0) >= 7) return { status: "full", name: roomRow.name };
  return { status: "ok", name: roomRow.name, hasPassword: Boolean(roomRow.password_hash), memberCount: count ?? 0, roomId: roomRow.id };
}

/** Join by invite token. Returns JoinError instead of throwing for expected cases. */
export async function joinRoom(
  inviteToken: string,
  displayName: string,
  password?: string
): Promise<{ room: Room; me: Member } | { error: JoinError }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: roomRow } = await sb.from("rooms").select("*").eq("invite_token", inviteToken).single();
  if (!roomRow) return { error: "not-found" };
  if (new Date(roomRow.expires_at).getTime() <= Date.now()) return { error: "expired" };
  if (roomRow.password_hash) {
    const hash = await hashPassword(password ?? "");
    if (hash !== roomRow.password_hash) return { error: "wrong-password" };
  }
  // Blocked names can't come back (case-insensitive exact match)
  const { data: blockRows } = await sb
    .from("room_blocks")
    .select("display_name")
    .eq("room_id", roomRow.id);
  if (
    (blockRows ?? []).some(
      (b) => b.display_name.toLowerCase() === displayName.trim().toLowerCase()
    )
  ) {
    return { error: "blocked" };
  }

  const { count } = await sb.from("members").select("id", { count: "exact", head: true }).eq("room_id", roomRow.id);
  if ((count ?? 0) >= 7) return { error: "full" };

  const { data: memRow, error } = await sb
    .from("members")
    .insert({ room_id: roomRow.id, display_name: displayName.trim() })
    .select()
    .single();
  if (error || !memRow) {
    if (error?.message.includes("full")) return { error: "full" };
    if (error?.message.includes("expired")) return { error: "expired" };
    throw new Error(error?.message ?? "Failed to join room");
  }
  await sb.from("messages").insert({
    room_id: roomRow.id,
    sender_id: null,
    type: "system",
    content: `${displayName.trim()} joined the playground`,
  });
  return { room: toRoom(roomRow, window.location.origin), me: toMember(memRow, roomRow.id) };
}

export async function persistMessage(msg: {
  id: string;
  roomId: string;
  senderId: string | null;
  type: Message["type"];
  content: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("messages").insert({
    id: msg.id,
    room_id: msg.roomId,
    sender_id: msg.senderId,
    type: msg.type,
    content: msg.content,
  });
  if (error) throw new Error(error.message);
}

export async function persistReaction(messageId: string, reactions: Record<string, string[]>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("messages").update({ reactions }).eq("id", messageId);
  if (error) throw new Error(error.message);
}

export async function setOnline(memberId: string, isOnline: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("members").update({ is_online: isOnline }).eq("id", memberId);
}

/** Host: rename the playground (syncs live to everyone). */
export async function renameLiveRoom(roomId: string, name: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("rooms").update({ name: name.trim().slice(0, 48) }).eq("id", roomId);
  if (error) throw new Error(error.message);
}

/** Host: end the session now — room flips to read-only for everyone. */
export async function endLiveSession(roomId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("rooms")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export interface RoomBlock {
  id: string;
  roomId: string;
  displayName: string;
  createdAt: string;
}

/** Host: block a name (called on kick) + remove the member. */
export async function blockLiveMember(
  roomId: string,
  memberId: string,
  displayName: string,
  byId: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const clean = displayName.trim();
  const { data: rows } = await sb.from("room_blocks").select("id,display_name").eq("room_id", roomId);
  const already = (rows ?? []).some((r) => r.display_name.toLowerCase() === clean.toLowerCase());
  if (!already) {
    const { error: insErr } = await sb
      .from("room_blocks")
      .insert({ room_id: roomId, display_name: clean, blocked_by: byId });
    // 23505 = raced duplicate block; safe to ignore
    if (insErr && (insErr as { code?: string }).code !== "23505") throw new Error(insErr.message);
  }
  const { error } = await sb.from("members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function fetchBlocks(roomId: string): Promise<RoomBlock[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("room_blocks")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    displayName: b.display_name,
    createdAt: b.created_at,
  }));
}

export async function unblockLiveMember(blockId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("room_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
}

/**
 * Leave a room: host transfers to the earliest-joined remaining member,
 * a system message is posted, and your member row is deleted (frees the spot).
 */
export async function leaveLiveRoom(roomId: string, meId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: members } = await sb
    .from("members")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at");
  const me = (members ?? []).find((m) => m.id === meId);
  const others = (members ?? []).filter((m) => m.id !== meId);
  if (me?.is_host && others.length > 0) {
    const next = others[0];
    await sb.from("members").update({ is_host: true }).eq("id", next.id);
    await sb.from("rooms").update({ host_id: next.id }).eq("id", roomId);
  }
  await sb.from("messages").insert({
    room_id: roomId,
    sender_id: null,
    type: "system",
    content: `${me?.display_name ?? "Someone"} left the playground`,
  });
  await sb.from("members").delete().eq("id", meId);
}

/** Realtime: new messages + member inserts/updates/deletes + room updates. Returns unsubscribe. */
export function subscribeToRoom(
  roomId: string,
  handlers: { onMessage: (m: Message) => void; onMembers: () => void; onRoom: (r: Room) => void }
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const ch = sb
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onMessage(toMessage(payload.new as MessageRow))
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "members", filter: `room_id=eq.${roomId}` },
      () => handlers.onMembers()
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => handlers.onRoom(toRoom(payload.new as RoomRow, origin))
    )
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}

export async function refetchMembers(roomId: string): Promise<Member[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("members").select("*").eq("room_id", roomId).order("joined_at");
  return (data ?? []).map((m) => toMember(m, roomId));
}

export interface PublicRoomEntry {
  room: Room;
  memberCount: number;
}

/** Live, non-expired public rooms newest-first (for the /rooms browser). */
export async function listPublicRooms(limit = 50): Promise<PublicRoomEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: rows } = await sb
    .from("rooms")
    .select("*")
    .eq("visibility", "public")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const counts = await Promise.all(
    rows.map((r) => sb.from("members").select("id", { count: "exact", head: true }).eq("room_id", r.id))
  );
  return rows.map((r, i) => ({ room: toRoom(r, origin), memberCount: counts[i].count ?? 0 }));
}

export async function uploadRoomPhoto(roomId: string, file: File): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("hangout-photos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from("hangout-photos").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a profile avatar, returns its public URL. */
export async function uploadAvatar(memberId: string, file: File): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const path = `${memberId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("hangout-avatars").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return sb.storage.from("hangout-avatars").getPublicUrl(path).data.publicUrl;
}

export async function updateMemberAvatar(memberId: string, avatarUrl: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("members").update({ avatar_url: avatarUrl }).eq("id", memberId);
  if (error) throw new Error(error.message);
}
/** Realtime presence: who's actually connected right now. Returns unsubscribe. */
export function subscribeToPresence(
  roomId: string,
  meId: string,
  onSync: (onlineIds: string[]) => void
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const ch = sb.channel(`presence:${roomId}`, { config: { presence: { key: meId } } });
  ch.on("presence", { event: "sync" }, () => {
    onSync(Object.keys(ch.presenceState()));
  });
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      void ch.track({ at: new Date().toISOString() });
    }
  });
  return () => {
    void ch.untrack();
    sb.removeChannel(ch);
  };
}

export interface SavedProfile {
  name: string;
  avatarDataUrl: string | null;
}

const PROFILE_KEY = "hangout:profile";
const MAX_SAVED_AVATAR_BYTES = 300 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Remember name (+ small avatar) in this browser for prefill next time. */
export async function saveProfile(name: string, file?: File | null): Promise<void> {
  try {
    let avatarDataUrl: string | null = readProfile()?.avatarDataUrl ?? null;
    if (file && file.size <= MAX_SAVED_AVATAR_BYTES) {
      try {
        avatarDataUrl = await fileToDataUrl(file);
      } catch {
        /* keep previous */
      }
    }
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: name.trim(), avatarDataUrl }));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function readProfile(): SavedProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProfile;
    if (!parsed || typeof parsed.name !== "string") return null;
    return { name: parsed.name, avatarDataUrl: parsed.avatarDataUrl ?? null };
  } catch {
    return null;
  }
}

/** sessionStorage key for "my member id" per invite token (no-login identity). */
export function stashMemberId(inviteToken: string, memberId: string) {
  try {
    window.sessionStorage.setItem(`hangout:me:${inviteToken}`, memberId);
  } catch {
    /* ignore */
  }
}

export function readMemberId(inviteToken: string): string | null {
  try {
    return window.sessionStorage.getItem(`hangout:me:${inviteToken}`);
  } catch {
    return null;
  }
}

export function clearMemberId(inviteToken: string) {
  try {
    window.sessionStorage.removeItem(`hangout:me:${inviteToken}`);
  } catch {
    /* ignore */
  }
}
