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

/** Get-or-create a 1-to-1 thread (order-independent). */
export async function ensureThread(
  roomId: string,
  meId: string,
  otherId: string
): Promise<PrivateThread> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: existing } = await sb
    .from("private_threads")
    .select("*")
    .eq("room_id", roomId)
    .or(
      `and(member_a_id.eq.${meId},member_b_id.eq.${otherId}),and(member_a_id.eq.${otherId},member_b_id.eq.${meId})`
    )
    .maybeSingle();
  if (existing) return toThread(existing);
  const { data, error } = await sb
    .from("private_threads")
    .insert({ room_id: roomId, member_a_id: meId, member_b_id: otherId })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to open thread");
  return toThread(data);
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
