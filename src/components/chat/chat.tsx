"use client";

import { useEffect, useRef, useState } from "react";import { ArrowDown, Crown, Smile, X } from "lucide-react";
import type { Member, Message } from "@/types";
import { useRoom } from "@/lib/room-store";
import { useToast } from "@/lib/toast";
import { formatClock } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const QUICK_EMOJIS = ["❤️", "😂", "😮", "🔥", "👍", "🎉"];
const PICKER_EMOJIS = ["😀", "😂", "😍", "🤔", "👍", "🙏", "🎉", "🔥", "❤️", "😮", "😭", "🍿", "🎬", "⚽", "✨", "👀"];

export function ChatFeed({ onImageOpen }: { onImageOpen: (src: string, alt: string) => void }) {
  const { messages, members, me } = useRoom();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = useState(false);
  const [stick, setStick] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick) el.scrollTop = el.scrollHeight;
  }, [messages.length, stick]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowPill(!nearBottom);
    setStick(nearBottom);
  }

  function scrollBottom() {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setShowPill(false);
      setStick(true);
    }
  }

  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-label="Group chat messages"
        aria-live="polite"
        className="slim-scroll h-full space-y-3 overflow-y-auto px-3 py-4 md:px-5"
      >
        {messages.map((m) => {
          if (m.type === "system") return <SystemBubble key={m.id} message={m} />;
          const sender = m.senderId ? byId.get(m.senderId) : undefined;
          const mine = m.senderId === me.id;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              sender={sender}
              mine={mine}
              onImageOpen={onImageOpen}
            />
          );
        })}
        <TypingRow />
      </div>
      {showPill && (
        <button
          onClick={scrollBottom}
          aria-label="Scroll to newest messages"
          className="absolute bottom-3 left-1/2 flex min-h-[44px] -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30"
        >
          <ArrowDown className="h-4 w-4" aria-hidden /> New messages
        </button>
      )}
    </div>
  );
}

function SystemBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-white/10 dark:text-indigo-200">
        {message.content}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  sender,
  mine,
  onImageOpen,
}: {
  message: Message;
  sender: Member | undefined;
  mine: boolean;
  onImageOpen: (src: string, alt: string) => void;
}) {
  const { toggleReaction, me } = useRoom();
  const [showReacts, setShowReacts] = useState(false);
  const name = sender?.displayName ?? "Unknown";

  return (
    <div className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <Avatar src={sender?.avatarUrl ?? ""} name={name} size={32} />
      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {name}
          {sender?.isHost && <Crown className="h-3 w-3 text-amber-500" aria-label="Host" />}
          <span aria-hidden>·</span>
          <time>{formatClock(message.createdAt)}</time>
        </p>
        {message.type === "image" ? (
          <button
            onClick={() => onImageOpen(message.content, `Photo shared by ${name}`)}
            aria-label={`Expand photo shared by ${name}`}
            className="overflow-hidden rounded-2xl shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-100 focus-visible:outline-2 dark:ring-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.content}
              alt={`Photo shared by ${name}`}
              loading="lazy"
              className="max-h-56 w-auto object-cover"
            />
          </button>
        ) : (
          <div
            className={
              message.type === "emoji"
                ? "text-3xl leading-snug"
                : mine
                  ? "rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm leading-relaxed text-white shadow-lg shadow-indigo-600/20"
                  : "rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-sm leading-relaxed text-zinc-900 shadow-md shadow-indigo-600/5 ring-1 ring-indigo-100 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-white/10"
            }
          >
            {message.content}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {Object.entries(message.reactions).map(([emoji, ids]) =>
            ids.length === 0 ? null : (
              <button
                key={emoji}
                onClick={() => toggleReaction(message.id, emoji)}
                aria-label={`React with ${emoji}, ${ids.length} reactions`}
                aria-pressed={ids.includes(me.id)}
                className={`flex min-h-[28px] items-center gap-1 rounded-full px-2 text-xs font-bold ring-1 ${
                  ids.includes(me.id)
                    ? "bg-indigo-100 text-indigo-800 ring-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-100"
                    : "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/10"
                }`}
              >
                <span aria-hidden>{emoji}</span> {ids.length}
              </button>
            )
          )}
          <button
            onClick={() => setShowReacts((v) => !v)}
            aria-label={showReacts ? "Hide quick reactions" : `Add quick reaction to message from ${name}`}
            aria-expanded={showReacts}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 opacity-0 hover:bg-indigo-100 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <Smile className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {showReacts && (
          <div className="mt-1 flex gap-0.5 rounded-full bg-white p-1 shadow-xl ring-1 ring-indigo-100 dark:bg-zinc-800 dark:ring-white/10" role="toolbar" aria-label="Quick reactions">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  toggleReaction(message.id, e);
                  setShowReacts(false);
                }}
                aria-label={`React with ${e}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-indigo-50 dark:hover:bg-white/10"
              >
                <span aria-hidden>{e}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingRow() {
  const { typingNames } = useRoom();
  if (typingNames.length === 0) return null;
  return (
    <div className="flex items-center gap-2 pl-10" aria-label={`${typingNames.join(", ")} typing`}>
      <span className="flex items-center gap-1 rounded-full bg-white px-3 py-2 shadow ring-1 ring-indigo-100 dark:bg-zinc-800 dark:ring-white/10">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-indigo-500" />
        ))}
      </span>
      <span className="text-xs italic text-zinc-400">{typingNames.join(", ")} typing…</span>
    </div>
  );
}

export function ChatInput({
  disabled,
  onPhoto,
}: {
  disabled: boolean;
  onPhoto: (file: File) => void;
}) {
  const { sendMessage } = useRoom();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const COOLDOWN_MS = 10_000;

  // Tick so the cooldown countdown updates live
  useEffect(() => {
    if (lastSentAt === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [lastSentAt]);

  const cooldownLeft = Math.max(0, Math.ceil((lastSentAt + COOLDOWN_MS - now) / 1000));
  const cooling = cooldownLeft > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (disabled || cooling || !text.trim()) return;
    const body = text;
    const isEmojiOnly = /^[\p{Emoji}\p{Extended_Pictographic}\s]+$/u.test(body.trim());
    setText("");
    void sendMessage(body, isEmojiOnly ? "emoji" : "text").then((ok) => {
      // Start the cooldown on every attempt; server enforces it too (10s trigger)
      setLastSentAt(Date.now());
      setNow(Date.now());
      if (!ok) toast({ title: "Message didn't send", description: "Slow down — wait 10 seconds between messages.", variant: "error" });
    });
  }

  return (
    <div className="relative border-t border-indigo-100 bg-white/90 p-2.5 backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
      {pickerOpen && (
        <div
          className="absolute bottom-full left-2.5 right-2.5 mb-2 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-indigo-100 dark:bg-zinc-800 dark:ring-white/10"
          role="dialog"
          aria-label="Emoji picker"
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-500">Pick an emoji</span>
            <button
              onClick={() => setPickerOpen(false)}
              aria-label="Close emoji picker"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {PICKER_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText((t) => t + e);
                  setPickerOpen(false);
                }}
                aria-label={`Insert ${e}`}
                className="flex h-11 w-full items-center justify-center rounded-xl text-xl hover:bg-indigo-50 dark:hover:bg-white/10"
              >
                <span aria-hidden>{e}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Share a photo (JPG, PNG or WEBP, up to 5MB)"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhoto(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Share a photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={disabled}
          aria-label="Open emoji picker"
          aria-expanded={pickerOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-white/10"
        >
          <Smile className="h-5 w-5" aria-hidden />
        </button>
        <label htmlFor="chat-input" className="sr-only">
          Type a message
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Room expired — read-only" : cooling ? `Slow down… wait ${cooldownLeft}s` : "Message the group…"}
          disabled={disabled}
          maxLength={500}
          autoComplete="off"
          className="min-h-[44px] flex-1 rounded-full border border-indigo-200 bg-zinc-50 px-4 text-base focus:border-indigo-500 focus:outline-2 focus:outline-indigo-500 disabled:opacity-60 dark:border-white/15 dark:bg-zinc-800 md:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || cooling || !text.trim()}
          aria-label={cooling ? `Wait ${cooldownLeft} seconds before sending` : "Send message"}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 disabled:opacity-40"
        >
          {cooling ? (
            <span className="relative flex h-7 w-7 items-center justify-center" aria-hidden>
              <svg viewBox="0 0 28 28" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 11}
                  strokeDashoffset={2 * Math.PI * 11 * (1 - Math.min(1, (now - lastSentAt) / COOLDOWN_MS))}
                />
              </svg>
              <span className="text-xs font-black">{cooldownLeft}</span>
            </span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Group chat embedded under a game (e.g. Word Guess) — reuses the same live
 * group feed, not a separate channel.
 */
export function GameChatBox({
  disabled,
  onPhoto,
  title = "Group chat",
}: {
  disabled: boolean;
  onPhoto: (file: File) => void;
  title?: string;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-indigo-100 dark:ring-white/10">
      <p className="bg-indigo-50/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:bg-white/5 dark:text-indigo-200">
        💬 {title} · same as the Chat tab
      </p>
      <div className="flex h-80 flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
        <ChatFeed onImageOpen={(src, alt) => setLightbox({ src, alt })} />
        <ChatInput disabled={disabled} onPhoto={onPhoto} />
      </div>
      <Lightbox src={lightbox?.src ?? null} alt={lightbox?.alt ?? ""} onClose={() => setLightbox(null)} />
    </div>
  );
}

export function Lightbox({ src, alt, onClose }: { src: string | null; alt: string; onClose: () => void }) {  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!src) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Expanded photo: ${alt}`}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        aria-label="Close photo viewer"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        onClick={onClose}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
