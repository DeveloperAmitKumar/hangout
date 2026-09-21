"use client";

import { Crown, MessageCircle } from "lucide-react";
import { useRoom } from "@/lib/room-store";
import { Avatar, Badge } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { RoomTab } from "@/types";

export function MembersTab({ onMessage }: { onMessage: (memberId: string, tab: RoomTab) => void }) {
  const { members, me, isLive, onlineIds } = useRoom();
  const isOnline = (id: string, fallback: boolean) => (isLive ? onlineIds.includes(id) : fallback);

  if (members.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={MessageCircle}
          title="No members yet"
          hint="Share the invite link so friends can join with just a name and avatar."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-2 overflow-y-auto p-3 md:p-4" aria-label="Room members">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md shadow-indigo-600/5 ring-1 ring-indigo-100 dark:bg-zinc-900 dark:ring-white/10"
        >
          <Avatar src={m.avatarUrl} name={m.displayName} size={44} online={isOnline(m.id, m.isOnline)} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
              {m.displayName}
              {m.id === me.id && <Badge tone="zinc">You</Badge>}
              {m.isHost && (
                <Badge tone="amber">
                  <Crown className="h-3 w-3" aria-hidden /> Host
                </Badge>
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isOnline(m.id, m.isOnline) ? "Online now" : "Offline"}
            </p>
          </div>
          {m.id !== me.id && (
            <button
              onClick={() => onMessage(m.id, "chat")}
              aria-label={`Message ${m.displayName} privately`}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-100 px-3 text-[13px] font-bold text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-100"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Message</span>
            </button>
          )}
        </li>
      ))}
      <p className="px-1 pt-1 text-center text-xs text-zinc-400">
        {members.length} / 7 spots filled · rooms purge when the timer ends.
      </p>
    </ul>
  );
}
