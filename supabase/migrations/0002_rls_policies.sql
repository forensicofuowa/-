create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('admin', 'super_admin'), false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('instructor', 'admin', 'super_admin'), false)
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
$$;

alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.stages enable row level security;
alter table public.academic_years enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.instructor_subjects enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_files enable row level security;
alter table public.favorites enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "Anyone can view organizations" on public.organizations for select using (true);
create policy "Admins manage organizations" on public.organizations for all using (public.is_admin());

create policy "Anyone can view departments" on public.departments for select using (true);
create policy "Admins manage departments" on public.departments for all using (public.is_admin());

create policy "Anyone can view stages" on public.stages for select using (true);
create policy "Admins manage stages" on public.stages for all using (public.is_admin());

create policy "Active users view academic years" on public.academic_years for select using (public.is_active_user());
create policy "Admins manage academic years" on public.academic_years for all using (public.is_admin());

create policy "Active users view subjects" on public.subjects for select using (public.is_active_user());
create policy "Admins manage subjects" on public.subjects for all using (public.is_admin());

create policy "Users view own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Active users view staff names" on public.profiles for select using (public.is_active_user() and role in ('instructor', 'admin', 'super_admin'));
create policy "Users update own basic info" on public.profiles for update using (id = auth.uid());
create policy "Admins manage all profiles" on public.profiles for all using (public.is_admin());

create policy "Active users view instructor subjects" on public.instructor_subjects for select using (public.is_active_user());
create policy "Admins manage instructor subjects" on public.instructor_subjects for all using (public.is_admin());

create policy "Students view published lectures" on public.lectures
  for select using (public.is_active_user() and status = 'published');

create policy "Staff view all department lectures" on public.lectures
  for select using (public.is_staff());

create policy "Staff create lectures" on public.lectures
  for insert with check (
    public.is_admin()
    or (
      public.current_user_role() = 'instructor'
      and uploader_id = auth.uid()
      and exists (
        select 1 from public.instructor_subjects
        where instructor_id = auth.uid() and subject_id = lectures.subject_id
      )
    )
  );

create policy "Staff update own or admin lectures" on public.lectures
  for update using (
    public.is_admin()
    or (public.current_user_role() = 'instructor' and uploader_id = auth.uid())
  );

create policy "Staff delete own or admin lectures" on public.lectures
  for delete using (
    public.is_admin()
    or (public.current_user_role() = 'instructor' and uploader_id = auth.uid())
  );

create policy "Active users view ready files of published lectures" on public.lecture_files
  for select using (
    public.is_staff()
    or (
      public.is_active_user()
      and status = 'ready'
      and exists (select 1 from public.lectures l where l.id = lecture_files.lecture_id and l.status = 'published')
    )
  );

create policy "Staff insert lecture files" on public.lecture_files
  for insert with check (public.is_staff() and created_by = auth.uid());

create policy "Staff manage lecture files" on public.lecture_files
  for all using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));

create policy "Students manage own favorites" on public.favorites
  for all using (student_id = auth.uid());

create policy "Active users view announcements" on public.announcements
  for select using (public.is_active_user());
create policy "Admins manage announcements" on public.announcements
  for all using (public.is_admin());

create policy "Users manage own notifications" on public.notifications
  for all using (user_id = auth.uid());

create policy "Admins view activity logs" on public.activity_logs
  for select using (public.is_admin());
create policy "Staff insert activity logs" on public.activity_logs
  for insert with check (public.is_staff());
