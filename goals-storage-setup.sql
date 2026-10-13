-- VIVID IELTS Goals: one-time setup in the existing Supabase project.
-- Private cloud storage for personal proof attachments, not public assets.
-- Keep this bucket private. Do not use a service-role key in the website.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vivid-goals-proofs','vivid-goals-proofs',false,52428800,
 array['application/pdf','text/html','image/png','video/mp4','video/webm','video/quicktime','video/x-m4v'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- The authenticated owner alone can store and read files under their UID.
drop policy if exists "vivid_goals_insert_owner" on storage.objects;
create policy "vivid_goals_insert_owner" on storage.objects
for insert to authenticated
with check (
 bucket_id = 'vivid-goals-proofs'
 and (storage.foldername(name))[1] = auth.uid()::text
 and lower(auth.jwt()->>'email') = 'fenric18@gmail.com'
);

drop policy if exists "vivid_goals_read_owner" on storage.objects;
create policy "vivid_goals_read_owner" on storage.objects
for select to authenticated
using (
 bucket_id = 'vivid-goals-proofs'
 and (storage.foldername(name))[1] = auth.uid()::text
 and lower(auth.jwt()->>'email') = 'fenric18@gmail.com'
);

drop policy if exists "vivid_goals_delete_owner" on storage.objects;
create policy "vivid_goals_delete_owner" on storage.objects
for delete to authenticated
using (
 bucket_id = 'vivid-goals-proofs'
 and (storage.foldername(name))[1] = auth.uid()::text
 and lower(auth.jwt()->>'email') = 'fenric18@gmail.com'
);

-- user_state already powers the VIVID Goals tracker. It must retain user_id
-- ownership RLS. Example diagnostic queries:
-- select relrowsecurity from pg_class where oid = 'public.user_state'::regclass;
-- select policyname,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='user_state';
