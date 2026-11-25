-- Allow authorized students to insert lecture_files records for summaries
alter table public.profiles
  add column if not exists can_upload_summaries boolean not null default false,
  add column if not exists admin_password_note text;

alter table public.lecture_files
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null,
  add column if not exists uploaded_by_role text;

drop policy if exists "lecture_files_student_summary_insert" on public.lecture_files;
create policy "lecture_files_student_summary_insert"
  on public.lecture_files
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and uploaded_by_role = 'student'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and p.status = 'active'
        and p.can_upload_summaries = true
    )
  );
