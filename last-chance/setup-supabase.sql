-- LAST CHANCE — run ONCE in the existing VIVID IELTS Supabase SQL Editor.
-- Database progress itself uses the existing public.user_state table and its per-user RLS.
-- Check that user_state RLS already enforces user_id = auth.uid().
-- This migration creates private cloud proof storage for LAST CHANCE.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('last-chance-proofs','last-chance-proofs',false,52428800,
 array['application/pdf','text/html','image/png','image/jpeg','video/mp4','video/webm','video/quicktime','video/x-m4v'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "last_chance_insert_own" on storage.objects;
create policy "last_chance_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'last-chance-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "last_chance_select_own" on storage.objects;
create policy "last_chance_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'last-chance-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "last_chance_delete_own" on storage.objects;
create policy "last_chance_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'last-chance-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Verification (run manually):
-- select id, public, file_size_limit from storage.buckets where id = 'last-chance-proofs';
-- select relrowsecurity from pg_class where oid = 'public.user_state'::regclass;
-- select policyname, cmd, qual, with_check from pg_policies
--   where schemaname='public' and tablename='user_state';
