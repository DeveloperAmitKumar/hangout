-- Hangout Stage 9: per-room blocks (kicked members can't rejoin).
-- No-login identity is the display name, so blocks match it case-insensitively.
-- v1 limitation: a blocked person can evade with a different name.

create table public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  blocked_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index room_blocks_room_name_uidx
  on public.room_blocks (room_id, lower(display_name));
create index room_blocks_room_id_idx on public.room_blocks (room_id);

alter table public.room_blocks enable row level security;

create policy "room_blocks_open_v1" on public.room_blocks
  for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.room_blocks;
