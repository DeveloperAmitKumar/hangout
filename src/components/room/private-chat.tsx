"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, MessageCircle } from "lucide-react";
import { useRoom } from "@/lib/room-store";
import { useToast } from "@/lib/toast";
import { otherMember } from "@/lib/mock-data";
import { formatClock } from "@/lib/utils";
import { Avatar, Badge } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export function PrivateChat({
  activeThreadId,
  onSelect,
  disabled,
  initialPeer,
}: {
  activeThreadId: string | null;
  onSelect: (id: string | null, peerName?: string) => void;
  disabled: boolean;
  initialPeer: string | null;
}) {
  const { threads, privateMessages, members, me, sendPrivate, markThreadRead, openThread, setDmFocus } = useRoom();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myThreads = threads.filter((t) => t.memberAId === me.id || t.memberBId === me.id);

  // Deep-link from Members tab: open (or create) thread with peer
  useEffect(() => {
    if (initialPeer) {
      void openThread(initialPeer)
        .then((id) => {
          onSelect(id);
          markThreadRead(id);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPeer]);

  // Track which thread is on screen so LiveSync can toast only for background DMs
  useEffect(() => {
    setDmFocus(activeThreadId);
    return () => setDmFocus(null);
  }, [activeThreadId, setDmFocus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, privateMessages.length]);

  useEffect(() => {
    if (activeThreadId) markThreadRead(activeThreadId);
  }, [activeThreadId, markThreadRead]);

  if (!activeThreadId) {
    return (
      <div className="flex h-full flex-col p-3 md:p-4" aria-label="Private threads">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Only you + the other member can read these
        </p>
        {myThreads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No private chats yet"
            hint="Open the Members tab and tap “Message” on anyone to start a 1-to-1 side thread."
          />
        ) : (
          <ul className="space-y-2 overflow-y-auto">
            {myThreads.map((t) => {
              const other = otherMember(t, me.id, members);
              const last = [...privateMessages].reverse().find((m) => m.threadId === t.id);
              if (!other) return null;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t.id, other.displayName)}
                    aria-label={`Open private chat with ${other.displayName}${t.unreadCount ? `, ${t.unreadCount} unread` : ""}`}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-md shadow-indigo-600/5 ring-1 ring-indigo-100 hover:ring-indigo-300 dark:bg-zinc-900 dark:ring-white/10"
                  >
                    <Avatar src={other.avatarUrl} name={other.displayName} size={44} online={other.isOnline} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        {other.displayName}
                        {t.unreadCount > 0 && (
                          <Badge tone="rose">{t.unreadCount} new</Badge>
                        )}
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {last ? last.content : "Say hi 👋"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const thread = threads.find((t) => t.id === activeThreadId);
  const other = thread ? otherMember(thread, me.id, members) : undefined;
  const msgs = privateMessages.filter((m) => m.threadId === activeThreadId);

  return (
    <div className="flex h-full flex-col" aria-label={`Private chat with ${other?.displayName ?? "member"}`}>
      <div className="flex items-center gap-2 border-b border-indigo-100 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/80">
        <button
          onClick={() => onSelect(null)}
          aria-label="Back to private thread list"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-indigo-50 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        {other && <Avatar src={other.avatarUrl} name={other.displayName} size={36} online={other.isOnline} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{other?.displayName}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            <Lock className="h-3 w-3" aria-hidden /> Private · disappears with the room
          </p>
        </div>
      </div>

      <div className="slim-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3" role="log" aria-label="Private messages" aria-live="polite">
        {msgs.length === 0 && (
          <p className="rounded-2xl bg-indigo-50 p-3 text-center text-[13px] text-zinc-500 dark:bg-white/5">
            No messages yet — say hi! Only the two of you can see this thread.
          </p>
        )}
        {msgs.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  mine
                    ? "max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm text-white shadow"
                    : "max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm shadow ring-1 ring-indigo-100 dark:bg-zinc-800 dark:ring-white/10"
                }
              >
                {m.content}
                <span className={`mt-0.5 block text-[11px] ${mine ? "text-white/70" : "text-zinc-400"}`}>
                  {formatClock(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {announce && (
        <p role="status" className="sr-only">
          {announce}
        </p>
      )}

      <form
        className="flex items-center gap-1.5 border-t border-indigo-100 bg-white/90 p-2.5 dark:border-white/10 dark:bg-zinc-900/90"
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled || !draft.trim()) return;
          const body = draft;
          setDraft("");
          void sendPrivate(activeThreadId, body).then((ok) => {
            if (!ok) {
              setDraft(body);
              toast({ title: "Message didn't send", description: "Check your connection and retry.", variant: "error" });
            } else {
              setAnnounce("Message sent");
            }
          });
        }}
      >
        <label htmlFor="dm-input" className="sr-only">
          Message {other?.displayName} privately
        </label>
        <input
          id="dm-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={disabled ? "Room expired — read-only" : `Message ${other?.displayName ?? ""}…`}
          disabled={disabled}
          maxLength={500}
          autoComplete="off"
          className="min-h-[44px] flex-1 rounded-full border border-indigo-200 bg-zinc-50 px-4 text-base disabled:opacity-60 dark:border-white/15 dark:bg-zinc-800 md:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label="Send private message"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
}
