"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Gamepad2,
  Lock,
  MessageCircle,
  Share2,
  Timer,
  Users,
} from "lucide-react";
import { RoomProvider, useRoom, type LiveSeed } from "@/lib/room-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchRoomByToken,
  readMemberId,
  refetchMembers,
  setOnline,
  subscribeToPresence,
  subscribeToRoom,
  uploadRoomPhoto,
} from "@/lib/rooms-api";
import { fetchPolls, ensureRoomGames, subscribeToGames, subscribeToPolls } from "@/lib/games-polls-api";
import { fetchThreads, subscribeToDms } from "@/lib/dm-api";
import { useCountdown } from "@/hooks/use-room";
import { formatCountdown, validateImageFile } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import { ChatFeed, ChatInput, Lightbox } from "@/components/chat/chat";
import { MembersTab } from "@/components/room/members";
import { SettingsButton } from "@/components/room/settings";
import { PrivateChat } from "@/components/room/private-chat";
import { TicTacToe } from "@/components/games/tictactoe";
import { WordGuess } from "@/components/games/wordguess";
import { PollsTab } from "@/components/polls/polls";
import { ChatSkeleton } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RoomTab } from "@/types";

const TABS: { value: RoomTab; label: string; icon: typeof MessageCircle }[] = [
  { value: "chat", label: "Chat", icon: MessageCircle },
  { value: "games", label: "Games", icon: Gamepad2 },
  { value: "polls", label: "Polls", icon: BarChart3 },
  { value: "members", label: "Members", icon: Users },
];

function RoomInner() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { room, members, me, sendMessage, threads, isLive, onlineIds, amRemoved } = useRoom();
  const { remainingMs, expired: timerExpired } = useCountdown(room.expiresAt);
  const [tab, setTab] = useState<RoomTab>("chat");
  const [gameTab, setGameTab] = useState<"tictactoe" | "wordguess">("tictactoe");
  const [chatMode, setChatMode] = useState<"group" | "private">("group");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [peerToOpen, setPeerToOpen] = useState<string | null>(null);
  const [forceExpired, setForceExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // Brief skeleton to demonstrate loading state
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(t);
  }, []);

  const expired = timerExpired || forceExpired;
  // Live: presence is truth (closes/leaves drop out instantly). Mock: DB flag.
  const isOnline = (id: string, fallback: boolean) =>
    isLive ? onlineIds.includes(id) : fallback;
  const onlineCount = members.filter((m) => isOnline(m.id, m.isOnline)).length;
  const unreadTotal = threads
    .filter((t) => t.memberAId === me.id || t.memberBId === me.id)
    .reduce((n, t) => n + t.unreadCount, 0);

  function share() {
    const link = `${window.location.origin}/join/${params.token ?? room.inviteToken}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    toast({ title: "Invite link copied!", description: link, variant: "success" });
  }

  function onPhoto(file: File) {
    const err = validateImageFile(file);
    if (err) {
      toast({ title: "Couldn't share that photo", description: err, variant: "error" });
      return;
    }
    if (isLive) {
      // LIVE: upload to Supabase Storage, share the public URL in chat
      toast({ title: "Uploading photo…", variant: "default" });
      void uploadRoomPhoto(room.id, file)
        .then((url) => sendMessage(url, "image"))
        .then((ok) => {
          if (ok === false) toast({ title: "Photo didn't send", description: "Slow down — wait 10 seconds between messages.", variant: "error" });
          else toast({ title: "Photo shared 📸", variant: "success" });
        })
        .catch((e: Error) => {
          toast({ title: "Upload failed", description: e.message, variant: "error" });
        });
      return;
    }
    const url = URL.createObjectURL(file);
    void sendMessage(url, "image");
    toast({ title: "Photo shared 📸", variant: "success" });
  }

  function messageMember(memberId: string) {
    setPeerToOpen(memberId);
    setThreadId(null);
    setChatMode("private");
    setTab("chat");
  }

  if (amRemoved) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-zinc-900" role="alert">
          <p className="text-lg font-extrabold">You were removed</p>
          <p className="mt-1 text-sm text-zinc-500">
            The host removed you from <strong>{room.name}</strong>.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white"
          >
            Back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-100 dark:bg-zinc-950 md:h-screen md:overflow-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-indigo-100 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3">
          <button
            onClick={() => router.push("/")}
            aria-label="Back to home"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-indigo-50 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <Image
            src="/logo.png"
            alt="Hangout logo"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold tracking-tight">{room.name}</h1>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> {members.length}/7 · {onlineCount} online
              </span>
              <span aria-hidden>·</span>
              <span
                className={cn(
                  "flex items-center gap-1 font-bold",
                  expired ? "text-rose-500" : remainingMs < 5 * 60 * 1000 ? "text-amber-600" : "text-indigo-600 dark:text-indigo-300"
                )}
                role="timer"
                aria-label={expired ? "Room expired" : `Time remaining: ${formatCountdown(remainingMs)}`}
              >
                <Timer className="h-3.5 w-3.5" aria-hidden />
                {expired ? "Expired" : formatCountdown(remainingMs)}
              </span>
            </p>
          </div>
          {!isLive && (
            <button
              onClick={() => setForceExpired((v) => !v)}
              aria-pressed={forceExpired}
              title="Demo toggle: simulate the timer hitting zero"
              aria-label="Demo toggle: simulate room expiry"
              className={cn(
                "flex h-11 items-center gap-1 rounded-xl px-2.5 text-xs font-bold",
                forceExpired ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
              )}
            >
              <Lock className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{forceExpired ? "Un-expire (demo)" : "Expire (demo)"}</span>
            </button>
          )}
          <SettingsButton token={params.token ?? room.inviteToken} />
          <button
            onClick={share}
            aria-label="Copy invite link"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25"
          >
            <Share2 className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {expired && (
          <div role="alert" className="bg-rose-500 px-3 py-1.5 text-center text-xs font-bold text-white">
            ⏰ Session ended — this room is now read-only (demo). Chat, games, polls & DMs are locked.
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 p-0 md:min-h-0 md:p-4">
        {/* Sidebar (desktop) */}
        <nav
          aria-label="Room sections"
          className="hidden w-52 shrink-0 flex-col gap-1 rounded-2xl bg-white p-2 shadow-md ring-1 ring-indigo-100 self-start sticky top-20 dark:bg-zinc-900 dark:ring-white/10 md:flex"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              aria-current={tab === t.value ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-bold transition",
                tab === t.value
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-zinc-600 hover:bg-indigo-50 dark:text-zinc-300 dark:hover:bg-white/5"
              )}
            >
              <t.icon className="h-4.5 w-4.5" aria-hidden />
              {t.label}
              {t.value === "chat" && unreadTotal > 0 && (
                <Badge tone="rose">{unreadTotal}</Badge>
              )}
            </button>
          ))}
          <div className="mt-2 rounded-xl bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900 dark:bg-white/5 dark:text-indigo-100">
            {isLive
              ? "🟢 Live room — chat syncs in realtime via Supabase."
              : "Frontend preview — everything runs on local mock data. No network calls."}
          </div>
        </nav>

        {/* Main panel */}
        <main className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-900 md:min-h-0 md:rounded-2xl md:shadow-xl md:ring-1 md:ring-indigo-100 md:dark:ring-white/10">
          {tab === "chat" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex gap-1.5 border-b border-indigo-100 p-2 dark:border-white/10" role="tablist" aria-label="Chat type">
                {(["group", "private"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={chatMode === m}
                    onClick={() => setChatMode(m)}
                    className={cn(
                      "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold",
                      chatMode === m
                        ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-50"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5"
                    )}
                  >
                    {m === "group" ? "Group chat" : "Private"}
                    {m === "private" && unreadTotal > 0 && <Badge tone="rose">{unreadTotal}</Badge>}
                  </button>
                ))}
              </div>
              {loading ? (
                <ChatSkeleton />
              ) : chatMode === "group" ? (
                <>
                  <ChatFeed onImageOpen={(src, alt) => setLightbox({ src, alt })} />
                  <ChatInput disabled={expired} onPhoto={onPhoto} />
                </>
              ) : (
                <PrivateChat
                  activeThreadId={threadId}
                  disabled={expired}
                  initialPeer={peerToOpen}
                  onSelect={(id, peerName) => {
                    setThreadId(id);
                    setPeerToOpen(null);
                    if (peerName) toast({ title: `Private chat with ${peerName}`, variant: "default" });
                  }}
                />
              )}
            </div>
          )}

          {tab === "games" && (
            <div className="flex min-h-0 flex-1 flex-col" aria-label="Mini games">
              <div className="flex gap-1.5 border-b border-indigo-100 p-2 dark:border-white/10" role="tablist" aria-label="Choose a game">
                {(
                  [
                    { value: "tictactoe", label: "⭕ Tic Tac Toe" },
                    { value: "wordguess", label: "🔤 Word Guess" },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.value}
                    role="tab"
                    aria-selected={gameTab === g.value}
                    onClick={() => setGameTab(g.value)}
                    className={cn(
                      "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold",
                      gameTab === g.value
                        ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-50"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3 overflow-y-auto p-3 md:p-4" role="tabpanel">
                {loading ? (
                  <div className="h-64 animate-pulse rounded-2xl bg-indigo-100 dark:bg-white/10" />
                ) : gameTab === "tictactoe" ? (
                  <TicTacToe disabled={expired} />
                ) : (
                  <WordGuess disabled={expired} />
                )}
              </div>
            </div>
          )}

          {tab === "polls" && (loading ? <ChatSkeleton /> : <PollsTab disabled={expired} />)}

          {tab === "members" && (
            loading ? <ChatSkeleton /> : <MembersTab onMessage={(id) => messageMember(id)} />
          )}
        </main>
      </div>

      {/* Bottom tab nav (mobile) */}
      <nav
        aria-label="Room sections"
        className="sticky bottom-0 z-40 border-t border-indigo-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-zinc-900/95 md:hidden"
      >
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              aria-current={tab === t.value ? "page" : undefined}
              aria-label={`${t.label} tab${t.value === "chat" && unreadTotal > 0 ? `, ${unreadTotal} unread private messages` : ""}`}
              className={cn(
                "relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
                tab === t.value ? "text-indigo-600 dark:text-indigo-300" : "text-zinc-400"
              )}
            >
              {tab === t.value && (
                <span aria-hidden className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" />
              )}
              <t.icon className="h-5 w-5" aria-hidden />
              {t.label}
              {t.value === "chat" && unreadTotal > 0 && (
                <span aria-hidden className="absolute right-1/2 top-1 flex h-5 min-w-5 translate-x-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                  {unreadTotal}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <Lightbox src={lightbox?.src ?? null} alt={lightbox?.alt ?? ""} onClose={() => setLightbox(null)} />
    </div>
  );
}

/** Realtime sync + presence for live (Supabase) rooms. No-op for mock rooms. */
function LiveSync() {
  const {
    room, members, me, isLive,
    ingestMessage, ingestMembers, ingestRoom, ingestPolls, upsertGame,
    threads, ingestThreads, ingestDm, bumpUnread, markThreadRead, dmFocus,
    setOnlineIds,
  } = useRoom();
  const { toast } = useToast();
  const focusRef = useRef(dmFocus);
  const threadsRef = useRef(threads);
  const membersRef = useRef(members);
  useEffect(() => {
    focusRef.current = dmFocus;
    threadsRef.current = threads;
    membersRef.current = members;
  }, [dmFocus, threads, members]);

  useEffect(() => {
    if (!isLive) return;
    const unsubRoom = subscribeToRoom(room.id, {
      onMessage: ingestMessage,
      onMembers: () => {
        void refetchMembers(room.id).then(ingestMembers);
      },
      onRoom: ingestRoom,
    });
    const unsubPolls = subscribeToPolls(room.id, () => {
      void fetchPolls(room.id).then(ingestPolls);
    });
    const unsubGames = subscribeToGames(room.id, upsertGame);
    const unsubPresence = subscribeToPresence(room.id, me.id, setOnlineIds);
    const unsubDms = subscribeToDms(room.id, {
      onThread: () => {
        void fetchThreads(room.id).then(ingestThreads);
      },
      onMessage: (m) => {
        ingestDm(m);
        // Only threads I belong to, and never echo my own sends
        const thread = threadsRef.current.find((t) => t.id === m.threadId);
        if (!thread || m.senderId === me.id) return;
        if (focusRef.current === m.threadId) {
          markThreadRead(m.threadId);
          return;
        }
        bumpUnread(m.threadId);
        const sender = membersRef.current.find((x) => x.id === m.senderId);
        toast({
          title: `New private message from ${sender?.displayName ?? "someone"} 💬`,
          description: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
          variant: "default",
        });
      },
    });
    void setOnline(me.id, true);
    const off = () => {
      void setOnline(me.id, false);
    };
    window.addEventListener("beforeunload", off);
    return () => {
      window.removeEventListener("beforeunload", off);
      off();
      unsubRoom();
      unsubPolls();
      unsubGames();
      unsubPresence();
      unsubDms();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, room.id, me.id, ingestRoom]);

  return null;
}

function RoomNotFound({ token }: { token: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-zinc-900" role="alert">
        <p className="text-lg font-extrabold">Room not found</p>
        <p className="mt-1 text-sm text-zinc-500">
          No live room matches invite <code className="font-mono">{token}</code>. It may have expired and been purged.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white"
        >
          Back home
        </button>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token ?? "demo123";
  const live = isSupabaseConfigured;
  const [seed, setSeed] = useState<LiveSeed | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(() =>
    isSupabaseConfigured ? "loading" : "ready"
  );

  useEffect(() => {
    if (!live) return;
    const meId = readMemberId(token);
    if (!meId) {
      // No-login identity lives in sessionStorage; without it, join first.
      router.replace(`/join/${token}`);
      return;
    }
    void fetchRoomByToken(token).then((data) => {
      if (!data) {
        setStatus("missing");
        return;
      }
      if (!data.members.some((m) => m.id === meId)) {
        router.replace(`/join/${token}`);
        return;
      }
      // Seed game sessions on first visit so moves have a row to persist to.
      void (async () => {
        let games = data.games;
        try {
          const ensured = await ensureRoomGames(
            data.room.id,
            data.members.map((m) => m.id)
          );
          if (ensured.length > 0) games = ensured;
        } catch {
          /* fall back to whatever was fetched */
        }
          setSeed({ room: data.room, members: data.members, messages: data.messages, polls: data.polls, games, threads: data.threads, dms: data.dms, meId });
        setStatus("ready");
      })();
    });
  }, [live, token, router]);

  if (!live) {
    return (
      <RoomProvider>
        <RoomInner />
      </RoomProvider>
    );
  }
  if (status === "missing") return <RoomNotFound token={token} />;
  if (status === "loading" || !seed) {
    return (
      <div className="min-h-full bg-zinc-100 p-4 dark:bg-zinc-950" aria-label="Loading room">
        <div className="mx-auto max-w-6xl">
          <ChatSkeleton />
        </div>
      </div>
    );
  }
  return (
    <RoomProvider seed={seed}>
      <LiveSync />
      <RoomInner />
    </RoomProvider>
  );
}
