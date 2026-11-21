-- 1. تصنيف المرفقات (نظري / عملي) وتصنيف المحاضرات (فصل أول / فصل ثاني)
alter table public.lecture_files
  add column if not exists category text not null default 'theory';

alter table public.lectures
  add column if not exists semester integer not null default 1;

-- 2. سجل دراسة الطالب للمحاضرات (ملف الإنجاز)
create table if not exists public.student_lecture_views (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  is_completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  primary key (student_id, lecture_id)
);

-- 3. جلسات التركيز والمذاكرة (Pomodoro / Study Sessions)
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  lecture_id uuid references public.lectures(id) on delete set null,
  duration_minutes integer not null default 25,
  session_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 4. جدول المحاضرات والامتحانات الأسبوعي
create table if not exists public.stage_schedules (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  entry_type text not null default 'class', -- 'class' | 'exam'
  title text not null,
  day_of_week text,
  time_range text,
  room_or_hall text,
  exam_date timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_sessions_student on public.study_sessions(student_id, session_date desc);
create index if not exists idx_stage_schedules_stage on public.stage_schedules(stage_id, entry_type);

alter table public.student_lecture_views enable row level security;
alter table public.study_sessions enable row level security;
alter table public.stage_schedules enable row level security;

drop policy if exists "Students manage own lecture views" on public.student_lecture_views;
create policy "Students manage own lecture views" on public.student_lecture_views
  for all using (student_id = auth.uid());

drop policy if exists "Students manage own study sessions" on public.study_sessions;
create policy "Students manage own study sessions" on public.study_sessions
  for all using (student_id = auth.uid());

drop policy if exists "Active users view schedules" on public.stage_schedules;
create policy "Active users view schedules" on public.stage_schedules
  for select using (public.is_active_user());

drop policy if exists "Admins manage schedules" on public.stage_schedules;
create policy "Admins manage schedules" on public.stage_schedules
  for all using (public.is_admin());
