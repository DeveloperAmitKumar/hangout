"use client";

import { useState } from "react";
import { BarChart3, Lock, Plus, X } from "lucide-react";
import { useRoom } from "@/lib/room-store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function PollsTab({ disabled }: { disabled: boolean }) {
  const { polls, members, me, vote, createPoll, closePoll } = useRoom();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const byId = new Map(members.map((m) => [m.id, m]));

  function addOption() {
    if (options.length >= 6) return;
    setOptions((o) => [...o, ""]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) {
      toast({ title: "Add a question + at least 2 options", variant: "error" });
      return;
    }
    const q = question;
    void createPoll(q, clean.slice(0, 6)).then((ok) => {
      if (!ok) {
        toast({ title: "Couldn't save poll", description: "Check your connection and retry.", variant: "error" });
        return;
      }
      toast({ title: "Poll created! 🗳️", variant: "success" });
      setQuestion("");
      setOptions(["", ""]);
      setShowForm(false);
    });
  }

  return (
    <div className="space-y-3 overflow-y-auto p-3 md:p-4" aria-label="Quick polls">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold">
          <BarChart3 className="h-4 w-4 text-indigo-600" aria-hidden /> Quick Polls
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)} disabled={disabled} aria-expanded={showForm}>
          {showForm ? <X className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
          {showForm ? "Cancel" : "New poll"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          aria-label="Create a poll"
          className="space-y-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-indigo-100 dark:bg-zinc-900 dark:ring-white/10"
        >
          <div>
            <Label htmlFor="poll-q">Question</Label>
            <Input
              id="poll-q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What should we do first?"
              maxLength={120}
            />
          </div>
          <div>
            <Label id="poll-opts">Options (2–6)</Label>
            <div className="space-y-1.5" role="group" aria-labelledby="poll-opts">
              {options.map((o, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={o}
                    onChange={(e) => setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                    placeholder={`Option ${i + 1}`}
                    maxLength={48}
                    aria-label={`Poll option ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Remove option ${i + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-white/10"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-1.5 flex min-h-[40px] items-center gap-1 text-[13px] font-bold text-indigo-600 dark:text-indigo-300"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add option ({options.length}/6)
              </button>
            )}
          </div>
          <Button type="submit" className="w-full">Create poll</Button>
        </form>
      )}

      {polls.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No polls yet"
          hint="Any member can create one with 2–6 options. Votes update instantly in this demo."
        />
      )}

      {polls.map((p) => {
        const total = Object.keys(p.votes).length;
        const myVote = p.votes[me.id];
        const creator = byId.get(p.createdBy)?.displayName ?? "Someone";
        return (
          <article
            key={p.id}
            aria-label={`Poll: ${p.question}`}
            className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-indigo-100 dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-extrabold leading-snug">{p.question}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  by {creator} · {total} vote{total === 1 ? "" : "s"} · single choice
                </p>
              </div>
              <Badge tone={p.isClosed ? "zinc" : "emerald"}>{p.isClosed ? "Closed" : "Live"}</Badge>
            </div>
            <div className="mt-3 space-y-2" role={p.isClosed ? undefined : "radiogroup"} aria-label={`Vote options for ${p.question}`}>
              {p.options.map((opt) => {
                const count = Object.values(p.votes).filter((v) => v === opt.id).length;
                const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                const selected = myVote === opt.id;
                return (
                  <button
                    key={opt.id}
                    disabled={disabled || p.isClosed}
                    role={p.isClosed ? undefined : "radio"}
                    aria-checked={p.isClosed ? undefined : selected}
                    onClick={() => {
                      void vote(p.id, opt.id).then((ok) => {
                        if (!ok) toast({ title: "Vote didn't save", description: "Check your connection and retry.", variant: "error" });
                      });
                    }}
                    className={cn(
                      "relative block min-h-[44px] w-full overflow-hidden rounded-xl px-3 py-2 text-left text-sm ring-1 transition",
                      selected
                        ? "font-bold ring-2 ring-indigo-500"
                        : "ring-indigo-100 hover:ring-indigo-300 dark:ring-white/10",
                      p.isClosed && "cursor-default"
                    )}
                    aria-label={`${opt.label}, ${count} votes, ${pct} percent${selected ? ", your vote" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all",
                        selected ? "bg-indigo-200/80 dark:bg-indigo-500/30" : "bg-indigo-50 dark:bg-white/5"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative flex items-center justify-between gap-2">
                      <span>{opt.label}{selected && " ✓"}</span>
                      <span className="text-xs font-bold text-zinc-500">{count} · {pct}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {p.isClosed ? "Voting closed" : myVote ? "Tap an option to change your vote" : "Tap an option to vote"}
              </p>
              {!p.isClosed && (
                <button
                  onClick={() => {
                    void closePoll(p.id).then((ok) => {
                      toast({ title: ok ? "Poll closed" : "Couldn't close poll", variant: ok ? "default" : "error" });
                    });
                  }}
                  disabled={disabled}
                  aria-label={`Close poll: ${p.question}`}
                  className="flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-white/10"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Close poll
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
