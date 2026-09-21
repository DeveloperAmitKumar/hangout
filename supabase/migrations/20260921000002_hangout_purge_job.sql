-- Hangout Stage 3: purge expired rooms (chat, members go via ON DELETE CASCADE).
-- Runs every 5 minutes via pg_cron. Rooms already become read-only at expiry
-- through the assert_room_live trigger; this job reclaims the storage.

create extension if not exists pg_cron;

create or replace function public.purge_expired_rooms()
returns integer as $$
declare
  n integer;
begin
  delete from public.rooms where expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer set search_path = public;

-- idempotent scheduling (safe to re-run this migration file)
select cron.unschedule('purge-expired-rooms')
where exists (select 1 from cron.job where jobname = 'purge-expired-rooms');

select cron.schedule(
  'purge-expired-rooms',
  '*/5 * * * *',
  $$select public.purge_expired_rooms()$$
);
