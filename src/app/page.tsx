"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Gamepad2,
  Image as ImageIcon,
  BarChart3,
  MessageCircle,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Input, Label } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/lib/toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createRoom, stashMemberId, updateMemberAvatar, uploadAvatar } from "@/lib/rooms-api";
import { validateImageFile } from "@/lib/utils";
import { useLocalAvatar } from "@/hooks/use-room";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hr" },
  { value: 120, label: "2 hr" },
  { value: -1, label: "Custom" },
];

const FEATURES = [
  { icon: MessageCircle, title: "Group chat", hint: "Real-time text + emoji for the whole room" },
  { icon: Users, title: "Private DMs", hint: "1-to-1 side threads from the member list" },
  { icon: Gamepad2, title: "Mini games", hint: "Tic Tac Toe + group word guessing" },
  { icon: ImageIcon, title: "Photo sharing", hint: "JPG/PNG/WEBP up to 5MB, inline in chat" },
  { icon: BarChart3, title: "Quick polls", hint: "2–6 options with live bar-chart results" },
  { icon: Clock, title: "Ephemeral", hint: "Auto read-only + purge when time runs out" },
];

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const { preview, file: avatarFile, onFile } = useLocalAvatar();
  const [playground, setPlayground] = useState("Friday Movie Night");
  const [host, setHost] = useState("");
  const [duration, setDuration] = useState(60);
  const [custom, setCustom] = useState("90");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!playground.trim() || !host.trim()) {
      toast({ title: "Add a playground + host name", variant: "error" });
      return;
    }
    const mins = duration === -1 ? Math.max(5, parseInt(custom || "60", 10)) : duration;
    setCreating(true);
    if (isSupabaseConfigured) {
      // LIVE: create a real room + host member in Supabase.
      createRoom({
        name: playground.trim(),
        hostName: host.trim(),
        durationMinutes: mins,
        visibility,
        password: visibility === "private" ? password : undefined,
      })
        .then(async ({ room, me }) => {
          // Upload host avatar if one was picked (best-effort, room works regardless)
          if (avatarFile && !validateImageFile(avatarFile)) {
            try {
              const url = await uploadAvatar(me.id, avatarFile);
              await updateMemberAvatar(me.id, url);
            } catch (e) {
              console.error("Avatar upload failed", e);
            }
          }
          stashMemberId(room.inviteToken, me.id);
          router.push(`/created/${room.inviteToken}?name=${encodeURIComponent(room.name)}&mins=${mins}`);
        })
        .catch((err: Error) => {
          setCreating(false);
          toast({ title: "Couldn't create room", description: err.message, variant: "error" });
        });
      return;
    }
    // FRONTEND-ONLY: no room is created server-side; navigate to the mock room.
    window.setTimeout(() => {
      router.push(`/created/demo123?name=${encodeURIComponent(playground.trim())}&mins=${mins}`);
    }, 600);
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-500 dark:from-indigo-950 dark:via-violet-950 dark:to-zinc-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-white">
          <Image
            src="/logo.png"
            alt="Hangout logo"
            width={64}
            height={64}
            priority
            className="h-16 w-16 object-cover"
          />
          <span className="text-lg font-extrabold tracking-tight">Hangout</span>
          {!isSupabaseConfigured && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
              Its 100% Free!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rooms"
            className="flex min-h-[44px] items-center rounded-xl bg-white/15 px-4 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
          >
            🌍 Rooms
          </Link>
          <Link
            href="/join/demo123"
            className="flex min-h-[44px] items-center rounded-xl bg-white/15 px-4 text-sm font-bold text-white backdrop-blur hover:bg-white/25"
          >
            Join a room
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-16 pt-4 md:grid-cols-[1.1fr_1fr] md:pt-8">
        <section aria-label="Intro" className="text-white">
          <h1 className="max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
            Spin up a group hangout in seconds.
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">
            No login. Up to 7 friends. Chat, play, share photos and vote — then it disappears when
            the timer ends.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white/12 p-3 backdrop-blur transition hover:bg-white/20"
              >
                <f.icon className="h-5 w-5" aria-hidden />
                <p className="mt-2 text-[13px] font-bold">{f.title}</p>
                <p className="text-xs leading-snug text-white/75">{f.hint}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-white/70">
            <Zap className="h-4 w-4" aria-hidden /> This prototype runs on local mock data — nothing
            is saved or sent anywhere.
          </p>
        </section>

        <Card className="h-fit p-5 md:p-6 max-md:order-first md:order-none" aria-label="Create playground form">
          <h2 className="text-xl font-extrabold tracking-tight">Create Playground</h2>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            Under 30 seconds — we&apos;ll fake the rest with mock data.
          </p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="playground">Playground name</Label>
              <Input
                id="playground"
                value={playground}
                onChange={(e) => setPlayground(e.target.value)}
                placeholder="e.g. Friday Movie Night"
                maxLength={48}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="host">Your name</Label>
              <Input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. Anya"
                maxLength={24}
                autoComplete="nickname"
              />
            </div>
            <div>
              <Label id="avatar-label">Avatar {isSupabaseConfigured ? "(JPG/PNG/WEBP, ≤5MB)" : "(preview only, stays on device)"}</Label>
              <div className="flex items-center gap-3" role="group" aria-labelledby="avatar-label">
                <Avatar
                  src={preview ?? "https://i.pravatar.cc/96?img=47"}
                  name={host || "You"}
                  size={52}
                />
                <label
                  htmlFor="avatar-upload"
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-white/20 dark:text-indigo-200 dark:hover:bg-white/5"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  {preview ? "Change photo" : "Upload photo"}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload avatar image"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </div>
            </div>
            <div>
              <Label id="duration-label">Session duration</Label>
              <div
                className="grid grid-cols-4 gap-2"
                role="radiogroup"
                aria-labelledby="duration-label"
              >
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    role="radio"
                    aria-checked={duration === d.value}
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "min-h-[44px] rounded-xl border px-2 text-sm font-bold transition",
                      duration === d.value
                        ? "border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25"
                        : "border-indigo-200 bg-white text-zinc-700 hover:bg-indigo-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {duration === -1 && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    aria-label="Custom duration in minutes"
                    type="number"
                    min={5}
                    max={480}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-zinc-500">minutes (5–480)</span>
                </div>
              )}
            </div>
            <div>
              <Label id="visibility-label">Room visibility</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="visibility-label">
                {(
                  [
                    { value: "private", label: "🔒 Private", hint: "Invite link only" },
                    { value: "public", label: "🌍 Public", hint: "Listed on /rooms" },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={visibility === v.value}
                    onClick={() => setVisibility(v.value)}
                    className={cn(
                      "min-h-[44px] rounded-xl border px-2 py-1.5 text-sm transition",
                      visibility === v.value
                        ? "border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25"
                        : "border-indigo-200 bg-white text-zinc-700 hover:bg-indigo-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
                    )}
                  >
                    <span className="block font-bold">{v.label}</span>
                    <span className={cn("block text-[11px]", visibility === v.value ? "text-white/80" : "text-zinc-400")}>{v.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            {visibility === "private" ? (
              <div>
                <Label htmlFor="room-password">Password (optional)</Label>
                <Input
                  id="room-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for link-only access"
                  maxLength={64}
                  autoComplete="new-password"
                />
              </div>
            ) : (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-100">
                🌍 Public rooms are listed on the Rooms page — anyone can join, no password allowed.
              </p>
            )}
            <Button type="submit" className="w-full text-base" disabled={creating}>
              {creating ? "Creating…" : "Create Playground ✨"}
            </Button>
            <p className="text-center text-xs text-zinc-400">
              Submitting opens a fake room seeded from mock data.
            </p>
          </form>
        </Card>
      </main>
    </div>
  );
}
