-- Hangout Stage 4a: quick polls (normalized tables, realtime-friendly).
-- Ask: single-choice voting per member is enforced by UNIQUE(poll_id, member_id).

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 120),
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  closes_at timestamptz,
  is_closed boolean not null default false
);
create index polls_room_id_idx on public.polls (room_id);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 48),
  position integer not null default 0
);
create index poll_options_poll_id_idx on public.poll_options (poll_id);

create table public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, member_id)
);
create index poll_votes_option_id_idx on public.poll_votes (option_id);

-- Guards ----------------------------------------------------------------
-- New polls only in live rooms (polls.room_id lets us reuse assert_room_live)
create trigger polls_room_live
  before insert on public.polls
  for each row execute function public.assert_room_live();

-- Votes only on open polls in live rooms; option must belong to the poll
create or replace function public.assert_vote_allowed()
returns trigger as $$
declare
  rid uuid;
  exp timestamptz;
  closed boolean;
  opt_poll uuid;
begin
  select room_id, is_closed into rid, closed from public.polls where id = new.poll_id;
  if not found then
    raise exception 'Poll does not exist';
  end if;
  if closed then
    raise exception 'Poll is closed';
  end if;
  select expires_at into exp from public.rooms where id = rid;
  if exp <= now() then
    raise exception 'Room has expired (read-only)';
  end if;
  select poll_id into opt_poll from public.poll_options where id = new.option_id;
  if opt_poll is distinct from new.poll_id then
    raise exception 'Option does not belong to this poll';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger poll_votes_allowed
  before insert or update on public.poll_votes
  for each row execute function public.assert_vote_allowed();

-- RLS (v1: open to anon, same as rooms/chat) ------------------------------
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "polls_open_v1" on public.polls
  for all to anon, authenticated using (true) with check (true);
create policy "poll_options_open_v1" on public.poll_options
  for all to anon, authenticated using (true) with check (true);
create policy "poll_votes_open_v1" on public.poll_votes
  for all to anon, authenticated using (true) with check (true);

-- Realtime ----------------------------------------------------------------
alter publication supabase_realtime add table public.polls, public.poll_options, public.poll_votes;
