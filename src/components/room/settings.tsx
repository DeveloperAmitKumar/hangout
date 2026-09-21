"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Crown,
  Link2,
  LogOut,
  Pencil,
  Settings2,
  TimerOff,
  Trash2,
  X,
} from "lucide-react";
import { useRoom } from "@/lib/room-store";
import { clearMemberId } from "@/lib/rooms-api";
import { useToast } from "@/lib/toast";
import { Avatar, Badge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

export function SettingsButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open room settings"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
      >
        <Settings2 className="h-5 w-5" aria-hidden />
      </button>
      {open && <SettingsDialog token={token} onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const {
    room, members, me, isLive,
    renameRoom, endSession, removeMember, leaveRoom,
  } = useRoom();
  const { toast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(room.name);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${token}` : `/join/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard unavailable — still confirm */
    }
    setCopied(true);
    toast({ title: "Invite link copied!", description: link, variant: "success" });
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function saveName() {
    if (!draftName.trim()) return;
    setBusy(true);
    const ok = await renameRoom(draftName);
    setBusy(false);
    if (ok) {
      setEditing(false);
      toast({ title: "Playground renamed ✨", variant: "success" });
    } else {
      toast({ title: "Couldn't rename", description: "Check your connection and retry.", variant: "error" });
    }
  }

  async function doEnd() {
    setBusy(true);
    const ok = await endSession();
    setBusy(false);
    if (ok) {
      toast({ title: "Session ended ⏰", description: "The room is now read-only.", variant: "default" });
      onClose();
    } else {
      toast({ title: "Couldn't end session", variant: "error" });
    }
  }

  async function doLeave() {
    setBusy(true);
    const ok = await leaveRoom();
    if (isLive) clearMemberId(token);
    setBusy(false);
    if (ok) {
      toast({ title: "You left the playground", variant: "default" });
      router.push("/");
    } else {
      toast({ title: "Couldn't leave", variant: "error" });
    }
  }

  async function kick(id: string, name: string) {
    setBusy(true);
    const ok = await removeMember(id);
    setBusy(false);
    toast({
      title: ok ? `${name} removed` : `Couldn't remove ${name}`,
      variant: ok ? "default" : "error",
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Room settings"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="slim-scroll max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-lg font-extrabold">
            <Settings2 className="h-5 w-5 text-indigo-600" aria-hidden /> Room settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Name (host edits) */}
        <div className="mt-4">
          <Label>Playground name</Label>
          {editing && me.isHost ? (
            <div className="flex gap-1.5">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={48}
                aria-label="Playground name"
                autoFocus
              />
              <Button size="sm" onClick={saveName} disabled={busy || !draftName.trim()} aria-label="Save name">
                <Check className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraftName(room.name); }} aria-label="Cancel rename">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-[15px] font-bold">{room.name}</p>
              {me.isHost && (
                <button
                  onClick={() => { setDraftName(room.name); setEditing(true); }}
                  aria-label="Edit playground name"
                  className="flex h-11 items-center gap-1 rounded-xl bg-indigo-100 px-3 text-[13px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-zinc-400">
            {room.visibility === "public" ? "🌍 Public room · listed on /rooms" : "🔒 Private room"}
            {room.hasPassword ? " · password protected" : ""} · {members.length}/7 members
          </p>
        </div>

        {/* Invite (everyone) */}
        <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
            <Link2 className="h-3.5 w-3.5" aria-hidden /> Invite anyone
          </p>
          <p className="mt-1 break-all font-mono text-[13px]">{link}</p>
          <Button size="sm" className="mt-2 w-full" onClick={copy} aria-label="Copy invite link">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied!" : "Copy invite link"}
          </Button>
        </div>

        {/* Members (host can remove) */}
        <div className="mt-4">
          <Label>Members ({members.length}/7)</Label>
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl bg-zinc-50 px-2.5 py-1.5 dark:bg-white/5">
                <Avatar src={m.avatarUrl} name={m.displayName} size={30} />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[13px] font-bold">
                  <span className="truncate">{m.displayName}</span>
                  {m.id === me.id && <Badge tone="zinc">You</Badge>}
                  {m.isHost && <Badge tone="amber"><Crown className="h-3 w-3" aria-hidden /> Host</Badge>}
                </span>
                {me.isHost && m.id !== me.id && (
                  <button
                    onClick={() => kick(m.id, m.displayName)}
                    disabled={busy}
                    aria-label={`Remove ${m.displayName} from room`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!me.isHost && (
            <p className="mt-1 text-xs text-zinc-400">Only the host can remove members.</p>
          )}
        </div>

        {/* Danger zone */}
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 dark:border-white/10">
          {me.isHost && !confirmEnd && (
            <Button variant="outline" className="w-full" onClick={() => setConfirmEnd(true)} aria-label="End session for everyone">
              <TimerOff className="h-4 w-4" aria-hidden /> End session for everyone
            </Button>
          )}
          {me.isHost && confirmEnd && (
            <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-center dark:bg-rose-500/10">
              <p className="text-sm font-bold">End this playground now?</p>
              <p className="text-xs text-zinc-500">Everyone goes read-only immediately. This can&apos;t be undone.</p>
              <div className="mt-2 flex gap-2">
                <Button variant="danger" size="sm" className="flex-1" onClick={doEnd} disabled={busy}>
                  Yes, end it
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmEnd(false)}>
                  Keep going
                </Button>
              </div>
            </div>
          )}
          {!confirmLeave && (
            <Button variant="secondary" className="w-full" onClick={() => setConfirmLeave(true)} aria-label="Leave room">
              <LogOut className="h-4 w-4" aria-hidden /> Leave room
            </Button>
          )}
          {confirmLeave && (
            <div role="alert" className="rounded-2xl bg-amber-50 p-3 text-center dark:bg-amber-500/10">
              <p className="text-sm font-bold">Leave {room.name}?</p>
              {me.isHost && members.length > 1 && (
                <p className="text-xs text-zinc-500">Host passes to the earliest-joined member.</p>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="flex-1" onClick={doLeave} disabled={busy}>
                  Yes, leave
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmLeave(false)}>
                  Stay
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
