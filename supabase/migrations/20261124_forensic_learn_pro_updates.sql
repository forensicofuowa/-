-- Forensic Learn Pro updates migration
alter table public.profiles
  add column if not exists can_upload_summaries boolean not null default false,
  add column if not exists admin_password_note text;

alter table public.lecture_files
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null,
  add column if not exists uploaded_by_role text;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

drop policy if exists "support_messages_insert_authenticated" on public.support_messages;
create policy "support_messages_insert_authenticated"
  on public.support_messages
  for insert
  to authenticated
  with check (true);

drop policy if exists "support_messages_select_own_or_admin" on public.support_messages;
create policy "support_messages_select_own_or_admin"
  on public.support_messages
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );
