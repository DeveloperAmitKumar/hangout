-- Hangout Stage 7: photo uploads via Supabase Storage.
-- Bucket is public-read; anon can upload JPG/PNG/WEBP only.
-- (Size ≤5MB is enforced client-side before upload.)

insert into storage.buckets (id, name, public)
values ('hangout-photos', 'hangout-photos', true)
on conflict (id) do nothing;

-- Public read (inline image cards for anyone with the room)
create policy "photos public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hangout-photos');

-- Anon upload, images only
create policy "photos anon upload"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'hangout-photos'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
