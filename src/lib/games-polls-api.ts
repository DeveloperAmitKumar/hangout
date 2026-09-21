"use client";

import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import type { GameSession, GameType, Poll, TicTacToeState, WordGuessState } from "@/types";

type PollRow = Database["public"]["Tables"]["polls"]["Row"];
type OptionRow = Database["public"]["Tables"]["poll_options"]["Row"];
type VoteRow = Database["public"]["Tables"]["poll_votes"]["Row"];
type GameRow = Database["public"]["Tables"]["game_sessions"]["Row"];

// ── polls ────────────────────────────────────────────────────────────────

function toPoll(
  row: PollRow,
  options: OptionRow[],
  votes: VoteRow[]
): Poll {
  return {
    id: row.id,
    roomId: row.room_id,
    question: row.question,
    options: options
      .filter((o) => o.poll_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, label: o.label })),
    votes: Object.fromEntries(votes.filter((v) => v.poll_id === row.id).map((v) => [v.member_id, v.option_id])),
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
  };
}

export async function fetchPolls(roomId: string): Promise<Poll[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: pollRows } = await sb.from("polls").select("*").eq("room_id", roomId).order("created_at", { ascending: false });
  if (!pollRows || pollRows.length === 0) return [];
  const ids = pollRows.map((p) => p.id);
  const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
    sb.from("poll_options").select("*").in("poll_id", ids).order("position"),
    sb.from("poll_votes").select("*").in("poll_id", ids),
  ]);
  return pollRows.map((p) => toPoll(p, optionRows ?? [], voteRows ?? []));
}

export async function createLivePoll(
  roomId: string,
  createdBy: string,
  question: string,
  labels: string[]
): Promise<Poll> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: pollRow, error } = await sb
    .from("polls")
    .insert({ room_id: roomId, question: question.trim(), created_by: createdBy })
    .select()
    .single();
  if (error || !pollRow) throw new Error(error?.message ?? "Failed to create poll");
  const { data: optionRows, error: optErr } = await sb
    .from("poll_options")
    .insert(labels.slice(0, 6).map((label, i) => ({ poll_id: pollRow.id, label: label.trim(), position: i })))
    .select();
  if (optErr) throw new Error(optErr.message);
  return toPoll(pollRow, optionRows ?? [], []);
}

export async function voteLivePoll(pollId: string, memberId: string, optionId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("poll_votes")
    .upsert({ poll_id: pollId, member_id: memberId, option_id: optionId }, { onConflict: "poll_id,member_id" });
  if (error) throw new Error(error.message);
}

export async function closeLivePoll(pollId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("polls").update({ is_closed: true }).eq("id", pollId);
  if (error) throw new Error(error.message);
}

export function subscribeToPolls(roomId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const ch = sb
    .channel(`polls:${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `room_id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, onChange)
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}

// ── games ────────────────────────────────────────────────────────────────

function toGame(row: GameRow): GameSession {
  return {
    id: row.id,
    roomId: row.room_id,
    type: row.type,
    status: row.status,
    players: row.players ?? [],
    spectators: row.spectators ?? [],
    scores: row.scores ?? {},
    state: row.state as unknown as GameSession["state"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchGames(roomId: string): Promise<GameSession[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("game_sessions").select("*").eq("room_id", roomId).order("created_at");
  return (data ?? []).map(toGame);
}

/** Get the live session of a type, or create it from the given initial snapshot. */
export async function ensureGame(
  roomId: string,
  type: GameType,
  init: { players: string[]; spectators: string[]; scores: Record<string, number>; state: TicTacToeState | WordGuessState }
): Promise<GameSession> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: existing } = await sb
    .from("game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .eq("type", type)
    .eq("status", "in-progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return toGame(existing);
  const { data, error } = await sb
    .from("game_sessions")
    .insert({
      room_id: roomId,
      type,
      players: init.players,
      spectators: init.spectators,
      scores: init.scores,
      state: init.state as unknown as Record<string, unknown>,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create game");
  return toGame(data);
}

export async function saveGame(
  id: string,
  patch: Partial<Pick<GameSession, "status" | "players" | "spectators" | "scores" | "state">>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("game_sessions")
    .update({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.players ? { players: patch.players } : {}),
      ...(patch.spectators ? { spectators: patch.spectators } : {}),
      ...(patch.scores ? { scores: patch.scores } : {}),
      ...(patch.state ? { state: patch.state as unknown as Record<string, unknown> } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Ensure both game types have a live session; returns the pair. */
export async function ensureRoomGames(
  roomId: string,
  memberIds: string[]
): Promise<GameSession[]> {
  const players = memberIds.length >= 2 ? memberIds.slice(0, 2) : [memberIds[0] ?? "solo", memberIds[0] ?? "solo"];
  const [ttt, word] = await Promise.all([
    ensureGame(roomId, "tictactoe", {
      players,
      spectators: memberIds.slice(2),
      scores: {},
      state: {
        board: Array(9).fill(null),
        turnMemberId: players[0],
        winnerId: null,
        isDraw: false,
        winningLine: null,
        challenge: null,
      },
    }),
    ensureGame(roomId, "wordguess", {
      players: [],
      spectators: [],
      scores: {},
      state: {
        word: "POPCORN",
        revealedIndices: [0],
        hint: "You hear it popping at the movies",
        category: "Snacks",
        round: 1,
        winnerId: null,
        guesses: [],
      },
    }),
  ]);
  return [ttt, word];
}

export function subscribeToGames(roomId: string, onGame: (g: GameSession) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const ch = sb
    .channel(`games:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_sessions", filter: `room_id=eq.${roomId}` },
      (payload) => onGame(toGame(payload.new as GameRow))
    )
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}
