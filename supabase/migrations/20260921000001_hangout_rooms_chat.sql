-- Hangout Stage 3 (rooms + chat): core tables, guards, RLS, realtime.
-- Run with: npx supabase db push (local: npx supabase start first, needs Docker)

create extension if not exists "pgcrypto";

-- ── rooms ────────────────────────────────────────────────────────────────
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 48),
  host_id uuid,
  session_duration_minutes integer not null check (session_duration_minutes between 5 and 480),
  invite_token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint rooms_expiry_after_creation check (expires_at > created_at)
);

-- ── members (anonymous, no-login: one row per display name + avatar) ─────
create table public.members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_url text,
  is_host boolean not null default false,
  is_online boolean not null default true,
  joined_at timestamptz not null default now()
);
create index members_room_id_idx on public.members (room_id);

-- host FK added after both tables exist (circular ref rooms ↔ members)
alter table public.rooms
  add constraint rooms_host_fk foreign key (host_id)
  references public.members (id) on delete set null;

-- ── messages (group chat; sender_id null = system message) ───────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  sender_id uuid references public.members (id) on delete set null,
  type text not null check (type in ('text', 'emoji', 'image', 'system')),
  content text not null check (char_length(content) between 1 and 2000),
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_room_created_idx on public.messages (room_id, created_at);

-- ── guards ───────────────────────────────────────────────────────────────
-- Block joins/messages once the room has expired (read-only after expiry)
create or replace function public.assert_room_live()
returns trigger as $$
declare
  exp timestamptz;
begin
  select expires_at into exp from public.rooms where id = new.room_id;
  if not found then
    raise exception 'Room does not exist';
  end if;
  if exp <= now() then
    raise exception 'Room has expired (read-only)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger members_room_live
  before insert on public.members
  for each row execute function public.assert_room_live();

create trigger messages_room_live
  before insert on public.messages
  for each row execute function public.assert_room_live();

-- Enforce max 7 members per room (including host)
create or replace function public.assert_room_capacity()
returns trigger as $$
declare
  n integer;
begin
  select count(*) into n from public.members where room_id = new.room_id;
  if n >= 7 then
    raise exception 'Room is full (max 7 members)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger members_capacity
  before insert on public.members
  for each row execute function public.assert_room_capacity();

-- ── RLS (v1: open to anon — the invite link is the capability) ───────────
-- TODO: tighten with signed invite tokens / per-member access tokens.
alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.messages enable row level security;

create policy "rooms_open_v1" on public.rooms
  for all to anon, authenticated using (true) with check (true);
create policy "members_open_v1" on public.members
  for all to anon, authenticated using (true) with check (true);
create policy "messages_open_v1" on public.messages
  for all to anon, authenticated using (true) with check (true);

-- ── realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.rooms, public.members, public.messages;
