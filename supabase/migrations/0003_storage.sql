insert into storage.buckets (id, name, public, file_size_limit)
values ('lectures', 'lectures', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "Staff can upload lecture files" on storage.objects;
create policy "Staff can upload lecture files"
on storage.objects for insert to authenticated
with check (bucket_id = 'lectures' and public.is_staff());

drop policy if exists "Staff can delete lecture files" on storage.objects;
create policy "Staff can delete lecture files"
on storage.objects for delete to authenticated
using (bucket_id = 'lectures' and public.is_staff());

drop policy if exists "Active users can read lecture files" on storage.objects;
create policy "Active users can read lecture files"
on storage.objects for select to authenticated
using (bucket_id = 'lectures' and public.is_active_user());
