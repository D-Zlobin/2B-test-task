create type public.app_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'in_review', 'accepted', 'rework');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'executor',
  display_name text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank
    check (display_name is null or btrim(display_name) <> '')
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint objects_name_not_blank check (btrim(name) <> ''),
  constraint objects_address_not_blank check (btrim(address) <> '')
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  object_id uuid not null references public.objects (id),
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tasks_title_not_blank check (btrim(title) <> '')
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  from_status public.task_status,
  to_status public.task_status not null,
  changed_by uuid not null references public.profiles (id),
  comment text,
  created_at timestamptz not null default now()
);

create index objects_active_idx on public.objects (created_at desc)
  where deleted_at is null;
create index tasks_active_object_idx on public.tasks (object_id, created_at desc)
  where deleted_at is null;
create index tasks_active_assignee_idx on public.tasks (assignee_id, created_at desc)
  where deleted_at is null;
create index task_status_history_task_created_idx
  on public.task_status_history (task_id, created_at, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger objects_set_updated_at
before update on public.objects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  id,
  nullif(btrim(raw_user_meta_data ->> 'display_name'), '')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
