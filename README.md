# Hangout — Frontend-Only Prototype (Stage 1 + 2)

Instant, no-login group hangout rooms: chat, private DMs, mini games, photo sharing & quick polls.

> **This phase is FRONTEND-ONLY.** No backend, no Supabase, no API routes, no server actions.
> Everything runs on local React state seeded from `src/lib/mock-data.ts`. No network calls are made
> (avatar/photo URLs are placeholders; uploaded photos use local `blob:` object URLs and never leave the device).

## What's built

- **Homepage** (`/`) — "Create Playground" form: playground name, host name, avatar upload UI
  (local preview), duration selector (30min / 1hr / 2hr / custom). Submit navigates to a fake room.
- **Room created** (`/created/[token]`) — shareable link display, copy-link button + toast,
  WhatsApp/SMS/email demo shortcuts (non-functional by design).
- **Join screen** (`/join/[token]`) — display name + avatar upload, plus toggleable preview states:
  joinable / room full / room expired / room not found.
- **Room shell** (`/room/[token]`) — top bar with room name, live countdown (ticks from mock
  `expiresAt`), member count, share button, and a demo "Expire" toggle to preview the read-only state.
  Bottom tab nav on mobile → sidebar on desktop (Chat / Games / Polls / Members).
- **Group chat** — auto-scroll feed rendering text / emoji / image / system messages distinctly,
  emoji picker, quick reactions, typing indicator, "new messages" scroll-to-bottom pill.
- **Photo sharing** — upload button in chat bar, client-side validation (≤5MB, JPG/PNG/WEBP only,
  error toast otherwise), inline image cards with tap-to-expand lightbox (local object URLs only).
- **Private chat** — thread list with unread badges + thread view, opened via "Message" on any member.
- **Tic Tac Toe** — 3×3 board, turn indicator, win/draw detection + result banner, rematch with
  spectator-queue handoff, all client-side.
- **Word Guess** — blank-word display, progressive hint reveal, guess input, live scoreboard,
  client-side against a hardcoded word list.
- **Quick Polls** — create-poll form (question + 2–6 options), live bar-chart results, manual close,
  instant local vote updates.
- **Global toast system, loading skeletons, empty states** for every tab.
- **Accessibility** — ARIA labels/roles, keyboard navigation, visible focus states, alt text,
  ≥44px tap targets, mobile-first responsive + dark mode.

## Tech

Next.js 16 + TypeScript + Tailwind CSS v4 + `lucide-react`. Hand-rolled shadcn-style UI primitives
in `src/components/ui/`. Indigo/violet gradient theme, Geist font, rounded corners, soft shadows.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), fill the form, and click through:
`/` → `/created/demo123` → `/room/demo123`, or join via `/join/demo123`.

## Project layout

```
src/
  app/            routes: /, /created/[token], /join/[token], /room/[token]
  components/
    ui/           button, primitives (card/input/label), avatar/badge/skeleton, toaster, empty-state
    chat/         group chat feed, input bar, lightbox
    room/         members tab, private chat
    games/        tictactoe, wordguess
    polls/        polls tab
  lib/            mock-data.ts, room-store.tsx (local state), toast.tsx, utils.ts
  hooks/          use-room.ts (countdown, avatar preview)
  types/          Room, Member, Message, PrivateThread, PrivateMessage, GameSession, Poll
```

## Next steps → Stage 3: Supabase backend (rooms + chat) — CODE READY, NOT YET VERIFIED

The backend code is written but **not yet run against a real database** (Docker isn't installed
here, so `supabase start` can't run yet). The app auto-detects configuration:

- **No env vars → mock preview mode** (exactly as before, zero network calls).
- **`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set → live mode**: homepage
  really creates rooms, join really joins (full/expired/not-found enforced by Postgres triggers),
  group chat persists + syncs over Realtime, reactions persist, presence flips `is_online`.
  Polls / games / DMs / photo uploads still run on local state until their backend pass.

### What's included

```
supabase/
  config.toml
  migrations/
    20260921000001_hangout_rooms_chat.sql   rooms, members, messages + capacity/expiry
                                            guards + open RLS (v1) + realtime publication
    20260921000002_hangout_purge_job.sql    purge_expired_rooms() + pg_cron every 5 min
src/lib/
  supabase.ts        lazy client, isSupabaseConfigured flag
  database.types.ts  hand-written mirror of the schema (regenerate via
                     `npx supabase gen types typescript --local` once DB is up)
  rooms-api.ts       createRoom, joinRoom, fetchRoomByToken, persistMessage,
                     persistReaction, setOnline, subscribeToRoom, session member stash
```

### To bring it live (once Docker Desktop is installed)

```bash
npx supabase start          # local stack (needs Docker)
npx supabase db push        # apply migrations (or `npx supabase migration up`)
npx supabase gen types typescript --local > src/lib/database.types.ts
cp .env.example .env.local  # fill ANON_KEY from `npx supabase status`
npm run dev
```

## Publish checklist (Vercel + Supabase)

**1. Database — run ALL migrations in order** in Supabase Dashboard → SQL Editor
(`supabase/migrations/`). Confirm at the end:

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
-- expect: rooms, members, messages, polls, poll_options, poll_votes,
--         game_sessions, private_threads, private_messages
select * from storage.buckets where id in ('hangout-photos', 'hangout-avatars');
-- expect: both rows, public = true
select jobname, schedule from cron.job where jobname = 'purge-expired-rooms';
-- expect: one row, every 5 min (expired rooms auto-purge)
```

**2. Deploy on Vercel**

```bash
npm i -g vercel   # once
vercel            # link + deploy preview
```

In Vercel → Project → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://lbmcwqafgscvrakkiitz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Then `vercel --prod`. No server config needed — the app is standard Next.js;
realtime/storage run through Supabase directly from the browser.

**3. Smoke test production**: create room → join incognito → chat, photo,
poll, TTT challenge, DM. Check Supabase Table Editor + Storage for rows/files.

Known v1 limitations (documented, accepted): RLS is open to `anon`
(invite link = capability); password hashes are readable via the API;
no moderation tools; max 7 members/room enforced in Postgres.
# hangout
