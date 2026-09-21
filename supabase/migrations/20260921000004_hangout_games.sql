-- Hangout Stage 4b: mini-game sessions (server is the dumb state store;
-- rules are enforced client-side in v1, last write wins via updated_at).

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  type text not null check (type in ('tictactoe', 'wordguess')),
  status text not null default 'in-progress' check (status in ('in-progress', 'finished')),
  players jsonb not null default '[]'::jsonb,      -- member ids
  spectators jsonb not null default '[]'::jsonb,   -- member ids (ttt queue)
  scores jsonb not null default '{}'::jsonb,       -- memberId -> points
  state jsonb not null default '{}'::jsonb,        -- type-specific board/word state
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index game_sessions_room_id_idx on public.game_sessions (room_id);

-- One live session per type per room (clients rematch in place)
create unique index game_sessions_room_type_live_uidx
  on public.game_sessions (room_id, type)
  where status = 'in-progress';

-- New sessions only in live rooms; bump updated_at on every write
create trigger game_sessions_room_live
  before insert on public.game_sessions
  for each row execute function public.assert_room_live();

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger game_sessions_touch
  before update on public.game_sessions
  for each row execute function public.touch_updated_at();

-- RLS (v1: open to anon, same as rooms/chat/polls) -------------------------
alter table public.game_sessions enable row level security;

create policy "game_sessions_open_v1" on public.game_sessions
  for all to anon, authenticated using (true) with check (true);

-- Realtime ----------------------------------------------------------------
alter publication supabase_realtime add table public.game_sessions;
