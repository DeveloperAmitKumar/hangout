-- Hangout Stage 6: public/private rooms, optional passwords, chat rate limit.

-- Visibility + password (SHA-256 hex stored client-side; v1 limitation: hash is
-- readable via the open RLS policy — real secret verification comes later).
alter table public.rooms
  add column visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  add column password_hash text;

-- Public rooms must not carry a password
alter table public.rooms
  add constraint rooms_public_no_password
  check (visibility = 'private' or password_hash is null);

-- 10s cooldown between group-chat messages per sender (system messages exempt)
create or replace function public.assert_message_rate()
returns trigger as $$
declare
  last_at timestamptz;
begin
  if new.sender_id is null then
    return new;
  end if;
  select max(created_at) into last_at
    from public.messages
    where room_id = new.room_id and sender_id = new.sender_id;
  if last_at is not null and last_at > now() - interval '10 seconds' then
    raise exception 'Slow down: wait 10 seconds between messages';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.assert_message_rate();
