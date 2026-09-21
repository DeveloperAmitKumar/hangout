"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listPublicRooms, type PublicRoomEntry } from "@/lib/rooms-api";
import { formatCountdown } from "@/lib/utils";
import { useCountdown } from "@/hooks/use-room";

function RoomCard({ entry }: { entry: PublicRoomEntry }) {
  const router = useRouter();
  const { remainingMs } = useCountdown(entry.room.expiresAt);
  const full = entry.memberCount >= 7;
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-black text-white"
      >
        {entry.room.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold">{entry.room.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden /> {entry.memberCount}/7
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" aria-hidden /> {formatCountdown(remainingMs)} left
          </span>
        </p>
      </div>
      <Button
        size="sm"
        disabled={full}
        onClick={() => router.push(`/join/${entry.room.inviteToken}`)}
        aria-label={full ? `${entry.room.name} is full` : `Join ${entry.room.name}`}
      >
        {full ? "Full" : "Join"}
      </Button>
    </Card>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const live = isSupabaseConfigured;
  const [rooms, setRooms] = useState<PublicRoomEntry[]>([]);
  const [loading, setLoading] = useState(live);

  useEffect(() => {
    if (!live) return;
    listPublicRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, [live]);

  return (
    <div className="min-h-full bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-500 dark:from-indigo-950 dark:via-violet-950 dark:to-zinc-950">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-4">
        <button
          onClick={() => router.push("/")}
          aria-label="Back to home"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Image
            src="/logo.png"
            alt="Hangout logo"
            width={48}
            height={48}
            className="h-12 w-12 object-cover"
          />
          Public rooms
        </h1>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-16" aria-label="Public rooms list">
        {!live && (
          <Card className="p-6 text-center">
            <p className="font-bold">Connect Supabase to browse public rooms</p>
            <p className="mt-1 text-sm text-zinc-500">
              The rooms browser needs the backend. Set the env vars and restart the dev server.
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => router.push("/")}>
              Back home
            </Button>
          </Card>
        )}
        {live && loading && (
          <div className="space-y-3" aria-label="Loading public rooms">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}
        {live && !loading && rooms.length === 0 && (
          <Card className="p-6">
            <EmptyState
              icon={Globe}
              title="No public rooms right now"
              hint="Be the first — create a playground and set it to Public so strangers can stumble in and have fun."
              action={
                <Link
                  href="/"
                  className="flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white"
                >
                  Create a public room
                </Link>
              }
            />
          </Card>
        )}
        {live &&
          !loading &&
          rooms.map((entry) => <RoomCard key={entry.room.id} entry={entry} />)}
        {live && !loading && rooms.length > 0 && (
          <p className="pt-1 text-center text-xs text-white/70">
            Showing live public rooms — jump into a random group and have fun 🎉
          </p>
        )}
      </main>
    </div>
  );
}
