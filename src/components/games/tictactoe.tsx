"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Eye, Lock, PhoneCall, PhoneOff, RotateCcw, Swords } from "lucide-react";
import { useRoom } from "@/lib/room-store";
import { useToast } from "@/lib/toast";
import { DmThreadView } from "@/components/room/private-chat";
import type { TicTacToeState } from "@/types";
import { Avatar, Badge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TicTacToe({ disabled }: { disabled: boolean }) {
  const { ttt, members, me, playTtt, rematchTtt, challengePlayer, answerChallenge, openMatchThread } = useRoom();
  const { toast } = useToast();
  const s = ttt.state as TicTacToeState;
  const challenge = s.challenge ?? null;
  const byId = new Map(members.map((m) => [m.id, m]));
  const [pX, pO] = ttt.players;
  const turnName = byId.get(s.turnMemberId)?.displayName ?? "—";
  const winner = s.winnerId ? byId.get(s.winnerId) : null;
  const challenger = challenge ? byId.get(challenge.fromId) : undefined;
  const challenged = challenge ? byId.get(challenge.toId) : undefined;
  const iAmChallenged = challenge?.toId === me.id;
  const iAmChallenger = challenge?.fromId === me.id;
  const opponents = members.filter((m) => m.id !== me.id);

  // Private match chat between the two players (spectators can't see it)
  const iAmPlayer = (pX === me.id || pO === me.id) && pX !== pO;
  const [matchThreadId, setMatchThreadId] = useState<string | null>(null);
  useEffect(() => {
    if (!iAmPlayer || !pX || !pO) return;
    let alive = true;
    openMatchThread(pX, pO)
      .then((id) => {
        if (alive) setMatchThreadId(id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pX, pO, iAmPlayer, openMatchThread]);

  // Ring the challenged player the moment a call-out for them appears
  const seenChallenge = useRef<string | null>(null);
  useEffect(() => {
    if (challenge && iAmChallenged) {
      const key = `${challenge.fromId}@${ttt.updatedAt}`;
      if (seenChallenge.current !== key) {
        seenChallenge.current = key;
        toast({
          title: `📞 ${challenger?.displayName ?? "Someone"} is calling you to play Tic Tac Toe!`,
          description: "Accept the challenge below.",
          variant: "default",
        });
      }
    } else if (!challenge) {
      seenChallenge.current = null;
    }
  }, [challenge, iAmChallenged, challenger?.displayName, ttt.updatedAt, toast]);

  return (
    <section aria-label="Tic Tac Toe game" className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-indigo-100 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold">
          ⭕ Tic Tac Toe
          <Badge tone={ttt.status === "in-progress" ? "emerald" : "zinc"}>
            {ttt.status === "in-progress" ? "Live" : "Finished"}
          </Badge>
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {[pX, pO].map((pid, i) => {
            const m = pid ? byId.get(pid) : undefined;
            if (!m) return null;
            return (
              <span key={pid} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 font-bold dark:bg-white/10">
                <Avatar src={m.avatarUrl} name={m.displayName} size={20} />
                {m.displayName} · {i === 0 ? "X" : "O"}
                {m.id === me.id && " (you)"}
              </span>
            );
          })}
        </div>
      </div>

      {!s.winnerId && !s.isDraw && ttt.status === "in-progress" && !challenge && (
        <p role="status" className="mt-2 text-[13px] font-semibold text-indigo-700 dark:text-indigo-200">
          {s.turnMemberId === me.id ? "Your turn" : `${turnName}'s turn`} ·{" "}
          {s.turnMemberId === pX ? "X" : "O"} to play
        </p>
      )}

      {/* Call-out banner */}
      {challenge && (
        <div
          role="alert"
          className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25"
        >
          {iAmChallenged ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4" aria-hidden />
                {challenger?.displayName} is calling you to play! 📞
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => answerChallenge(true)}
                  disabled={disabled}
                  aria-label="Accept tic tac toe challenge"
                  className="flex min-h-[40px] items-center rounded-lg bg-white px-3 text-[13px] font-extrabold text-indigo-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => answerChallenge(false)}
                  disabled={disabled}
                  aria-label="Decline tic tac toe challenge"
                  className="flex min-h-[40px] items-center rounded-lg bg-white/20 px-3 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  Decline
                </button>
              </span>
            </div>
          ) : iAmChallenger ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Calling {challenged?.displayName}… waiting for answer ⏳</span>
              <button
                onClick={() => answerChallenge(false)}
                disabled={disabled}
                aria-label="Cancel tic tac toe challenge"
                className="flex min-h-[40px] items-center gap-1 rounded-lg bg-white/20 px-3 text-[13px] font-bold disabled:opacity-50"
              >
                <PhoneOff className="h-3.5 w-3.5" aria-hidden /> Cancel
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5">
              <Swords className="h-4 w-4" aria-hidden />
              {challenger?.displayName} is calling {challenged?.displayName} to play!
            </p>
          )}
        </div>
      )}

      {(s.winnerId || s.isDraw) && (
        <div
          role="status"
          className={cn(
            "mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-bold",
            s.winnerId
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100"
              : "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100"
          )}
        >
          <span>
            {s.winnerId ? `🏆 ${winner?.displayName} wins!` : "🤝 It's a draw!"}
          </span>
          <Button size="sm" variant="secondary" onClick={rematchTtt} disabled={disabled} aria-label="Start a rematch">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rematch
          </Button>
        </div>
      )}

      <div className="mx-auto mt-3 grid max-w-[300px] grid-cols-3 gap-2" role="grid" aria-label="Tic Tac Toe board">
        {s.board.map((mark, i) => {
          const hot = s.winningLine?.includes(i);
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={`Cell ${i + 1}${mark ? `, ${mark}` : ", empty"}`}
              disabled={disabled || !!mark || !!s.winnerId || s.isDraw || ttt.status !== "in-progress"}
              onClick={() => playTtt(i)}
              className={cn(
                "flex h-[88px] items-center justify-center rounded-2xl text-4xl font-black transition",
                hot
                  ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 dark:bg-emerald-500/20"
                  : mark === "X"
                    ? "bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-indigo-200"
                    : mark === "O"
                      ? "bg-violet-50 text-violet-600 dark:bg-white/10 dark:text-violet-200"
                      : "bg-zinc-50 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-white/10",
                "disabled:cursor-default"
              )}
            >
              {mark}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Spectator queue:{" "}
          {ttt.spectators.map((id) => byId.get(id)?.displayName).filter(Boolean).join(", ") || "empty"}
        </span>
        <span className="flex items-center gap-1">
          <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          Score — {ttt.players.map((id) => `${byId.get(id)?.displayName}: ${ttt.scores[id] ?? 0}`).join(" · ")}
        </span>
      </div>
      {ttt.status === "finished" && !disabled && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={rematchTtt}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Hand turn to next in queue & rematch
        </Button>
      )}

      {/* Challenge a friend */}
      {!challenge && (
        <div className="mt-3 rounded-2xl bg-indigo-50/70 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
            <Swords className="h-3.5 w-3.5" aria-hidden /> Challenge a friend to play
          </p>
          <ul className="mt-2 space-y-1.5">
            {opponents.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <Avatar src={o.avatarUrl} name={o.displayName} size={28} online={o.isOnline} />
                <span className="flex-1 truncate text-[13px] font-bold">{o.displayName}</span>
                <button
                  onClick={() => {
                    challengePlayer(o.id);
                    toast({ title: `Calling ${o.displayName}… 📞`, description: "They'll see your challenge instantly.", variant: "default" });
                  }}
                  disabled={disabled}
                  aria-label={`Challenge ${o.displayName} to tic tac toe`}
                  className="flex min-h-[40px] items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-xs font-extrabold text-white shadow disabled:opacity-50"
                >
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden /> Challenge
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Accepting a challenge starts a fresh match — challenger plays X.
          </p>
        </div>
      )}

      {/* Match chat: private thread between the two players */}
      {pX && pO && pX !== pO && (
        <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-indigo-100 dark:ring-white/10">
          <p className="flex items-center gap-1.5 bg-indigo-50/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:bg-white/5 dark:text-indigo-200">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Match chat · just the two players
          </p>
          {iAmPlayer && matchThreadId ? (
            <div className="flex h-72 flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
              <DmThreadView
                threadId={matchThreadId}
                disabled={disabled}
                emptyHint="Trash-talk here — only you two can read this. 😉"
              />
            </div>
          ) : (
            <p className="bg-zinc-50/50 px-3 py-2.5 text-xs text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
              🔒 {byId.get(pX)?.displayName} and {byId.get(pO)?.displayName} have a private
              match chat — only visible to them.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
