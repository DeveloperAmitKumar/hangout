-- Hangout Stage 5: 1-to-1 private threads (realtime DMs).
-- Pair uniqueness regardless of member order via LEAST/GREATEST.

create table public.private_threads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  member_a_id uuid not null references public.members (id) on delete cascade,
  member_b_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_no_self_chat check (member_a_id <> member_b_id)
);
create unique index private_threads_pair_uidx
  on public.private_threads (room_id, least(member_a_id, member_b_id), greatest(member_a_id, member_b_id));
create index private_threads_room_id_idx on public.private_threads (room_id);

create table public.private_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.private_threads (id) on delete cascade,
  sender_id uuid not null references public.members (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index private_messages_thread_id_idx on public.private_messages (thread_id, created_at);

-- Guards ----------------------------------------------------------------
create trigger private_threads_room_live
  before insert on public.private_threads
  for each row execute function public.assert_room_live();

-- Messages: resolve room through the thread, then enforce live room
create or replace function public.assert_dm_room_live()
returns trigger as $$
declare
  rid uuid;
  exp timestamptz;
begin
  select room_id into rid from public.private_threads where id = new.thread_id;
  if not found then
    raise exception 'Thread does not exist';
  end if;
  select expires_at into exp from public.rooms where id = rid;
  if exp <= now() then
    raise exception 'Room has expired (read-only)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger private_messages_room_live
  before insert on public.private_messages
  for each row execute function public.assert_dm_room_live();

-- RLS (v1: open to anon, same as everything else) --------------------------
alter table public.private_threads enable row level security;
alter table public.private_messages enable row level security;

create policy "private_threads_open_v1" on public.private_threads
  for all to anon, authenticated using (true) with check (true);
create policy "private_messages_open_v1" on public.private_messages
  for all to anon, authenticated using (true) with check (true);

-- Realtime ----------------------------------------------------------------
alter publication supabase_realtime add table public.private_threads, public.private_messages;
