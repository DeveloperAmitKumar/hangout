"use client";

import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import type { PrivateMessage, PrivateThread } from "@/types";

type ThreadRow = Database["public"]["Tables"]["private_threads"]["Row"];
type DmRow = Database["public"]["Tables"]["private_messages"]["Row"];

export function toThread(row: ThreadRow, unreadCount = 0): PrivateThread {
  return {
    id: row.id,
    roomId: row.room_id,
    memberAId: row.member_a_id,
    memberBId: row.member_b_id,
    unreadCount,
    updatedAt: row.updated_at,
  };
}

export function toDm(row: DmRow): PrivateMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function fetchThreads(roomId: string): Promise<PrivateThread[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("private_threads")
    .select("*")
    .eq("room_id", roomId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((t) => toThread(t));
}

export async function fetchThreadMessages(threadIds: string[]): Promise<PrivateMessage[]> {
  const sb = getSupabase();
  if (!sb || threadIds.length === 0) return [];
  const { data } = await sb
    .from("private_messages")
    .select("*")
    .in("thread_id", threadIds)
    .order("created_at")
    .limit(500);
  return (data ?? []).map(toDm);
}

/** Get-or-create a 1-to-1 thread for any pair (order-independent). */
export async function ensureThreadFor(
  roomId: string,
  aId: string,
  bId: string
): Promise<PrivateThread> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: existing } = await sb
    .from("private_threads")
    .select("*")
    .eq("room_id", roomId)
    .or(`and(member_a_id.eq.${aId},member_b_id.eq.${bId}),and(member_a_id.eq.${bId},member_b_id.eq.${aId})`)
    .maybeSingle();
  if (existing) return toThread(existing);
  const { data, error } = await sb
    .from("private_threads")
    .insert({ room_id: roomId, member_a_id: aId, member_b_id: bId })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to open thread");
  return toThread(data);
}

/** Get-or-create a 1-to-1 thread (order-independent). */
export async function ensureThread(
  roomId: string,
  meId: string,
  otherId: string
): Promise<PrivateThread> {
  return ensureThreadFor(roomId, meId, otherId);
}

export async function sendLiveDm(threadId: string, senderId: string, content: string): Promise<PrivateMessage> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data, error } = await sb
    .from("private_messages")
    .insert({ thread_id: threadId, sender_id: senderId, content: content.trim() })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to send message");
  await sb.from("private_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
  return toDm(data);
}

export function subscribeToDms(
  roomId: string,
  handlers: { onThread: () => void; onMessage: (m: PrivateMessage) => void }
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const ch = sb
    .channel(`dms:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "private_threads", filter: `room_id=eq.${roomId}` },
      handlers.onThread
    )
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, (payload) =>
      handlers.onMessage(toDm(payload.new as DmRow))
    )
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}
