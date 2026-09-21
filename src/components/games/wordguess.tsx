"use client";

import { useState } from "react";
import { Lightbulb, Play, Trophy } from "lucide-react";
import { useRoom } from "@/lib/room-store";
import type { WordGuessState } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Avatar, Badge } from "@/components/ui/avatar";
import { useToast } from "@/lib/toast";

export function WordGuess({ disabled }: { disabled: boolean }) {
  const { word, members, me, guessWord, revealHint, nextWord } = useRoom();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const s = word.state as WordGuessState;
  const byId = new Map(members.map((m) => [m.id, m]));
  const winner = s.winnerId ? byId.get(s.winnerId) : null;
  const board = s.word.split("").map((ch, i) => (s.revealedIndices.includes(i) ? ch : null));
  const ranked = [...members].sort((a, b) => (word.scores[b.id] ?? 0) - (word.scores[a.id] ?? 0));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || !draft.trim()) return;
    const result = guessWord(draft);
    if (result === true) toast({ title: "Correct! +10 points 🎉", variant: "success" });
    else if (result === false) toast({ title: "Not quite — try again!", variant: "default" });
    setDraft("");
  }

  return (
    <section aria-label="Word guessing game" className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-indigo-100 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold">
          🔤 Word Guess · Round {s.round}
          <Badge tone="indigo">{s.category}</Badge>
        </h3>
        <Badge tone={word.status === "in-progress" ? "emerald" : "zinc"}>
          {word.status === "in-progress" ? (s.winnerId ? "Solved" : "Live") : "Round over"}
        </Badge>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="status" aria-label={`Word with ${s.word.length - s.revealedIndices.length} letters hidden`}>
        {board.map((ch, i) => (
          <span
            key={i}
            aria-hidden={!!ch}
            className={`flex h-11 w-9 items-center justify-center rounded-xl text-lg font-black ${
              ch
                ? "bg-gradient-to-b from-indigo-500 to-violet-500 text-white shadow"
                : "bg-zinc-100 text-transparent dark:bg-white/10"
            }`}
          >
            {ch ?? "•"}
          </span>
        ))}
        <span className="sr-only">
          {s.word.length} letters, {s.revealedIndices.length} revealed
        </span>
      </div>

      <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Hint: {s.hint}
      </p>

      {winner ? (
        <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100">
          🎉 {winner.displayName} guessed “{s.word}” first! +10 pts
        </p>
      ) : (
        <form onSubmit={submit} className="mt-2 flex gap-1.5">
          <label htmlFor="word-guess" className="sr-only">Guess the word</label>
          <Input
            id="word-guess"
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="TYPE YOUR GUESS"
            maxLength={16}
            disabled={disabled}
            autoComplete="off"
            className="uppercase tracking-widest"
          />
          <Button type="submit" disabled={disabled || !draft.trim()} aria-label="Submit guess">
            Guess
          </Button>
        </form>
      )}

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" size="sm" onClick={revealHint} disabled={disabled || !!s.winnerId}>
          <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Reveal a letter
        </Button>
        <Button variant="outline" size="sm" onClick={nextWord} disabled={disabled} aria-label="Start next word">
          <Play className="h-3.5 w-3.5" aria-hidden /> {s.winnerId ? "Next word" : "Skip word"}
        </Button>
      </div>

      <div className="mt-3 border-t border-indigo-50 pt-2 dark:border-white/10">
        <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
          <Trophy className="h-3.5 w-3.5" aria-hidden /> Live scoreboard
        </p>
        <ul className="mt-1.5 space-y-1">
          {ranked.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 text-[13px]">
              <span className="w-4 text-zinc-400">{i + 1}.</span>
              <Avatar src={m.avatarUrl} name={m.displayName} size={22} />
              <span className="flex-1 font-semibold">{m.displayName}{m.id === me.id && " (you)"}</span>
              <span className="font-black text-indigo-600 dark:text-indigo-300">{word.scores[m.id] ?? 0} pts</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
