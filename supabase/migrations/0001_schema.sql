create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('student', 'instructor', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('pending', 'active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lecture_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_status as enum ('pending', 'ready');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  max_upload_mb integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  level_number integer not null default 1,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  is_current boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'student',
  status public.account_status not null default 'pending',
  organization_id uuid references public.organizations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  stage_id uuid references public.stages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructor_subjects (
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (instructor_id, subject_id)
);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  uploader_id uuid not null references public.profiles(id) on delete restrict,
  lecture_number integer not null default 1,
  semester integer not null default 1,
  title text not null,
  description text,
  status public.lecture_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, academic_year_id, lecture_number)
);

create table if not exists public.lecture_files (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  ext text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  category text not null default 'theory',
  status public.file_status not null default 'pending',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, lecture_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lectures_subject on public.lectures(subject_id, status);
create index if not exists idx_lectures_year on public.lectures(academic_year_id);
create index if not exists idx_lecture_files_lecture on public.lecture_files(lecture_id, status, sort_order);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_profiles_status on public.profiles(status, role);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_lectures_updated on public.lectures;
create trigger trg_lectures_updated before update on public.lectures
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_dept_id uuid;
  v_stage_id uuid;
  v_role public.user_role;
begin
  select id into v_org_id from public.organizations limit 1;
  select id into v_dept_id from public.departments limit 1;

  begin
    v_stage_id := nullif(new.raw_user_meta_data->>'stage_id', '')::uuid;
  exception when others then
    v_stage_id := null;
  end;

  v_role := coalesce(nullif(new.raw_user_meta_data->>'role', '')::public.user_role, 'student');
  if v_role not in ('student', 'instructor') then
    v_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, status, organization_id, department_id, stage_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role,
    'pending',
    v_org_id,
    v_dept_id,
    v_stage_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
