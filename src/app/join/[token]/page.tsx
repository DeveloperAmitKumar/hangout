"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Clock, Lock, SearchX, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Input, Label } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/lib/toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchJoinInfo, joinRoom, stashMemberId, updateMemberAvatar, uploadAvatar, type JoinError } from "@/lib/rooms-api";
import { validateImageFile } from "@/lib/utils";
import { useLocalAvatar } from "@/hooks/use-room";
import { cn } from "@/lib/utils";

type PreviewState = "ok" | "full" | "expired" | "notfound";

const STATES: { value: PreviewState; label: string }[] = [
  { value: "ok", label: "Joinable" },
  { value: "full", label: "Room full" },
  { value: "expired", label: "Expired" },
  { value: "notfound", label: "Not found" },
];

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { preview, file: avatarFile, onFile } = useLocalAvatar();
  const token = params.token ?? "demo123";
  const live = isSupabaseConfigured;
  const [name, setName] = useState("");
  const [previewState, setPreviewState] = useState<PreviewState>("ok");
  const [joining, setJoining] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [checking, setChecking] = useState(live);

  const ERROR_COPY: Record<JoinError, { title: string; description: string }> = {
    full: { title: "This room is full", description: "Playgrounds hold max 7 members." },
    expired: { title: "This room has expired", description: "The session timer hit zero." },
    "not-found": { title: "Room not found", description: "Check the link and try again." },
    "wrong-password": { title: "Wrong password", description: "That password doesn't match this room." },
  };

  // LIVE: pre-check the room so we can show its name + password prompt up front
  useEffect(() => {
    if (!live) return;
    fetchJoinInfo(token)
      .then((info) => {
        if (info.status === "ok") {
          setRoomName(info.name);
          setNeedsPassword(info.hasPassword);
        } else {
          setPreviewState(info.status === "not-found" ? "notfound" : info.status);
        }
      })
      .catch(() => setPreviewState("notfound"))
      .finally(() => setChecking(false));
  }, [live, token]);

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Enter a display name to join", variant: "error" });
      return;
    }
    if (live) {
      // LIVE: real join — full/expired/not-found/wrong-password come from the database.
      setJoining(true);
      setPwError(false);
      joinRoom(token, name.trim(), password || undefined)
        .then(async (res) => {
          if ("error" in res) {
            const copy = ERROR_COPY[res.error];
            if (res.error === "wrong-password") {
              setPwError(true);
            } else {
              setPreviewState(res.error === "not-found" ? "notfound" : res.error);
            }
            toast({ title: copy.title, description: copy.description, variant: "error" });
            return;
          }
          if (avatarFile && !validateImageFile(avatarFile)) {
            try {
              const url = await uploadAvatar(res.me.id, avatarFile);
              await updateMemberAvatar(res.me.id, url);
            } catch (e) {
              console.error("Avatar upload failed", e);
            }
          }
          stashMemberId(token, res.me.id);
          toast({ title: `Welcome, ${name.trim()}!`, description: "Opening your room…", variant: "success" });
          router.push(`/room/${token}`);
        })
        .catch((err: Error) => {
          toast({ title: "Couldn't join", description: err.message, variant: "error" });
        })
        .finally(() => setJoining(false));
      return;
    }
    if (previewState !== "ok") return;
    toast({ title: `Welcome, ${name.trim()}!`, description: "Opening the mock room…", variant: "success" });
    router.push(`/room/${token}`);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-500 px-4 py-12 dark:from-indigo-950 dark:via-violet-950 dark:to-zinc-950">
      <Card className="w-full max-w-md p-6" aria-label="Join playground">
        <h1 className="text-2xl font-extrabold tracking-tight">Join playground</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {live && roomName ? (
            <>Joining <strong className="text-zinc-900 dark:text-white">{roomName}</strong> · </>
          ) : null}
          Invite <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-white/10">{token}</code> ·
          no signup needed.
        </p>
        {live && checking && (
          <p role="status" className="mt-3 text-sm text-zinc-500">Checking invite…</p>
        )}

        {!live && (
        <div className="mt-4 rounded-2xl bg-indigo-50 p-3 dark:bg-white/5">
          <p id="preview-label" className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Preview states (demo toggle)
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-labelledby="preview-label">
            {STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={previewState === s.value}
                onClick={() => setPreviewState(s.value)}
                className={cn(
                  "min-h-[44px] rounded-xl border px-1 text-xs font-bold",
                  previewState === s.value
                    ? "border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow"
                    : "border-indigo-200 bg-white text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          </div>
        )}
        {previewState === "ok" && (
          <form onSubmit={join} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi"
                maxLength={24}
                autoComplete="nickname"
              />
            </div>
            <div>
              <Label id="join-avatar">Avatar (preview only)</Label>
              <div className="flex items-center gap-3" role="group" aria-labelledby="join-avatar">
                <Avatar src={preview ?? "https://i.pravatar.cc/96?img=12"} name={name || "You"} size={52} />
                <label
                  htmlFor="join-avatar-upload"
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-white/20 dark:text-indigo-200 dark:hover:bg-white/5"
                >
                  <Upload className="h-4 w-4" aria-hidden /> Upload photo
                </label>
                <input
                  id="join-avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload avatar image"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </div>
            </div>
            {live && needsPassword && (
              <div>
                <Label htmlFor="room-password">Room password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                  <Input
                    id="room-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPwError(false);
                    }}
                    placeholder="Enter the room password"
                    maxLength={64}
                    autoComplete="current-password"
                    aria-invalid={pwError}
                    className={pwError ? "border-rose-400 pl-10" : "pl-10"}
                  />
                </div>
                {pwError && (
                  <p role="alert" className="mt-1 text-xs font-bold text-rose-600">Wrong password — try again.</p>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={joining || (live && checking)}>
              {joining ? "Joining…" : "Join playground"}
            </Button>
          </form>
        )}

        {previewState === "full" && (
          <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
            <Users className="mx-auto h-8 w-8 text-amber-500" aria-hidden />
            <p className="mt-2 font-bold">This room is full</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Playgrounds hold max 7 members (including host).</p>
            <Button variant="secondary" className="mt-3" onClick={() => setPreviewState("ok")}>Back to join form</Button>
          </div>
        )}
        {previewState === "expired" && (
          <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
            <Clock className="mx-auto h-8 w-8 text-rose-500" aria-hidden />
            <p className="mt-2 font-bold">This room has expired</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">The session timer hit zero — rooms auto-purge after expiry.</p>
            <Button variant="secondary" className="mt-3" onClick={() => setPreviewState("ok")}>Back to join form</Button>
          </div>
        )}
        {previewState === "notfound" && (
          <div role="alert" className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
            <SearchX className="mx-auto h-8 w-8 text-zinc-400" aria-hidden />
            <p className="mt-2 font-bold">Room not found</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Check the link — this invite token doesn&apos;t match any room.</p>
            <Button variant="secondary" className="mt-3" onClick={() => setPreviewState("ok")}>Back to join form</Button>
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">Join your friends and fav person who invited you!🎉
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> 
        </p>
      </Card>
    </div>
  );
}
