-- Hangout Stage 8: profile avatars via Supabase Storage.
-- Public-read; anon can upload JPG/PNG/WEBP only. Size ≤5MB enforced client-side.

insert into storage.buckets (id, name, public)
values ('hangout-avatars', 'hangout-avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars anon upload" on storage.objects;

create policy "avatars public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hangout-avatars');

create policy "avatars anon upload"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'hangout-avatars'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
