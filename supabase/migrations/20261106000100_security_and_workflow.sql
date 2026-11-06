create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'manager'
  );
$$;

create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_manager()
  or exists (
    select 1
    from public.tasks as task
    where task.deleted_at is null
      and task.assignee_id = (select auth.uid())
      and (task.author_id = profiles.id or task.assignee_id = profiles.id)
  )
  or exists (
    select 1
    from public.task_status_history as history
    join public.tasks as task on task.id = history.task_id
    where task.deleted_at is null
      and task.assignee_id = (select auth.uid())
      and history.changed_by = profiles.id
  )
);

create policy objects_select
on public.objects
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_manager()
    or exists (
      select 1
      from public.tasks as task
      where task.object_id = objects.id
        and task.assignee_id = (select auth.uid())
        and task.deleted_at is null
    )
  )
);

create policy objects_insert
on public.objects
for insert
to authenticated
with check (
  public.is_manager()
  and created_by = (select auth.uid())
  and deleted_at is null
);

create policy objects_update
on public.objects
for update
to authenticated
using (deleted_at is null and public.is_manager())
with check (deleted_at is null and public.is_manager());

create policy tasks_select
on public.tasks
for select
to authenticated
using (
  deleted_at is null
  and (public.is_manager() or assignee_id = (select auth.uid()))
);

create policy tasks_update
on public.tasks
for update
to authenticated
using (deleted_at is null and public.is_manager())
with check (deleted_at is null and public.is_manager());

create policy task_status_history_select
on public.task_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks as task
    where task.id = task_status_history.task_id
      and task.deleted_at is null
      and (public.is_manager() or task.assignee_id = (select auth.uid()))
  )
);

create or replace function public.protect_object_system_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and (
      new.id is distinct from old.id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
      or new.deleted_at is distinct from old.deleted_at
    )
  then
    raise exception 'Служебные поля объекта можно менять только через защищённые функции';
  end if;

  return new;
end;
$$;

create trigger objects_protect_system_fields
before update on public.objects
for each row execute function public.protect_object_system_fields();

create or replace function public.protect_task_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'Задачу можно создать только через функцию create_task';
  end if;

  return new;
end;
$$;

create trigger tasks_protect_insert
before insert on public.tasks
for each row execute function public.protect_task_insert();

create or replace function public.protect_task_system_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and (
      new.id is distinct from old.id
      or new.author_id is distinct from old.author_id
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
      or new.deleted_at is distinct from old.deleted_at
    )
  then
    raise exception 'Статус и служебные поля задачи можно менять только через защищённые функции';
  end if;

  return new;
end;
$$;

create trigger tasks_protect_system_fields
before update on public.tasks
for each row execute function public.protect_task_system_fields();

create or replace function public.protect_task_status_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'Историю статусов нельзя изменять через клиентский API';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger task_status_history_protect_changes
before insert or update or delete on public.task_status_history
for each row execute function public.protect_task_status_history();

create or replace function public.validate_task_relations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee_role public.app_role;
begin
  perform 1
  from public.objects as object
  where object.id = new.object_id
    and object.deleted_at is null
  for key share;

  if not found then
    raise exception 'Объект задачи не найден или удалён';
  end if;

  select profile.role
  into assignee_role
  from public.profiles as profile
  where profile.id = new.assignee_id;

  if assignee_role is distinct from 'executor'::public.app_role then
    raise exception 'Исполнителем задачи может быть только пользователь с ролью executor';
  end if;

  return new;
end;
$$;

create trigger tasks_validate_relations_on_insert
before insert on public.tasks
for each row execute function public.validate_task_relations();

create trigger tasks_validate_relations_on_update
before update of object_id, assignee_id on public.tasks
for each row execute function public.validate_task_relations();

create or replace function public.create_task(
  p_title text,
  p_description text,
  p_object_id uuid,
  p_assignee_id uuid
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_task public.tasks%rowtype;
begin
  if (select auth.uid()) is null or not public.is_manager() then
    raise exception 'Только постановщик может создавать задачи';
  end if;

  if p_title is null or btrim(p_title) = '' then
    raise exception 'Название задачи обязательно';
  end if;

  insert into public.tasks (
    title,
    description,
    object_id,
    assignee_id,
    author_id,
    status
  )
  values (
    btrim(p_title),
    coalesce(p_description, ''),
    p_object_id,
    p_assignee_id,
    (select auth.uid()),
    'new'
  )
  returning * into created_task;

  insert into public.task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    comment
  )
  values (created_task.id, null, 'new', (select auth.uid()), null);

  return created_task;
end;
$$;

create or replace function public.change_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role public.app_role;
  previous_status public.task_status;
  task_row public.tasks%rowtype;
  normalized_comment text;
  is_allowed boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Требуется аутентификация';
  end if;

  select profile.role
  into current_role
  from public.profiles as profile
  where profile.id = (select auth.uid());

  if not found then
    raise exception 'Профиль пользователя не найден';
  end if;

  select task.*
  into task_row
  from public.tasks as task
  where task.id = p_task_id
    and task.deleted_at is null
  for update;

  if not found then
    raise exception 'Задача не найдена или удалена';
  end if;

  if current_role = 'executor' then
    if task_row.assignee_id <> (select auth.uid()) then
      raise exception 'Исполнитель может менять статус только своей задачи';
    end if;

    is_allowed := (
      task_row.status = 'new' and p_new_status = 'in_progress'
    ) or (
      task_row.status = 'in_progress' and p_new_status = 'in_review'
    ) or (
      task_row.status = 'rework' and p_new_status = 'in_progress'
    );
  elsif current_role = 'manager' then
    is_allowed := task_row.status = 'in_review'
      and p_new_status in ('accepted', 'rework');
  end if;

  if not is_allowed then
    raise exception 'Переход из статуса % в % запрещён для текущего пользователя',
      task_row.status,
      p_new_status;
  end if;

  normalized_comment := nullif(btrim(p_comment), '');

  if task_row.status = 'in_review'
    and p_new_status = 'rework'
    and normalized_comment is null
  then
    raise exception 'При возврате на доработку комментарий обязателен';
  end if;

  previous_status := task_row.status;

  update public.tasks
  set status = p_new_status
  where id = task_row.id
  returning * into task_row;

  insert into public.task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    comment
  )
  values (
    task_row.id,
    previous_status,
    p_new_status,
    (select auth.uid()),
    normalized_comment
  );

  return task_row;
end;
$$;

create or replace function public.soft_delete_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Только постановщик может удалять задачи';
  end if;

  perform 1
  from public.tasks as task
  where task.id = p_task_id
    and task.deleted_at is null
  for update;

  if not found then
    raise exception 'Задача не найдена или уже удалена';
  end if;

  update public.tasks
  set deleted_at = now()
  where id = p_task_id;
end;
$$;

create or replace function public.soft_delete_object(p_object_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Только постановщик может удалять объекты';
  end if;

  perform 1
  from public.objects as object
  where object.id = p_object_id
    and object.deleted_at is null
  for update;

  if not found then
    raise exception 'Объект не найден или уже удалён';
  end if;

  if exists (
    select 1
    from public.tasks as task
    where task.object_id = p_object_id
      and task.deleted_at is null
  ) then
    raise exception 'Нельзя удалить объект, пока у него есть неудалённые задачи';
  end if;

  update public.objects
  set deleted_at = now()
  where id = p_object_id;
end;
$$;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.objects from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_status_history from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.objects to authenticated;
grant insert (name, address, created_by) on table public.objects to authenticated;
grant update (name, address) on table public.objects to authenticated;
grant select on table public.tasks to authenticated;
grant update (title, description, object_id, assignee_id) on table public.tasks to authenticated;
grant select on table public.task_status_history to authenticated;

revoke all on function public.is_manager() from public, anon, authenticated;
revoke all on function public.protect_object_system_fields() from public, anon, authenticated;
revoke all on function public.protect_task_insert() from public, anon, authenticated;
revoke all on function public.protect_task_system_fields() from public, anon, authenticated;
revoke all on function public.protect_task_status_history() from public, anon, authenticated;
revoke all on function public.validate_task_relations() from public, anon, authenticated;
revoke all on function public.create_task(text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.change_task_status(uuid, public.task_status, text) from public, anon, authenticated;
revoke all on function public.soft_delete_task(uuid) from public, anon, authenticated;
revoke all on function public.soft_delete_object(uuid) from public, anon, authenticated;

grant execute on function public.is_manager() to authenticated;
grant execute on function public.create_task(text, text, uuid, uuid) to authenticated;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
grant execute on function public.soft_delete_task(uuid) to authenticated;
grant execute on function public.soft_delete_object(uuid) to authenticated;
