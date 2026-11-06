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
  actor_role public.app_role;
  previous_status public.task_status;
  task_row public.tasks%rowtype;
  normalized_comment text;
  is_allowed boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Требуется аутентификация';
  end if;

  select profile.role
  into actor_role
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

  if actor_role = 'executor' then
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
  elsif actor_role = 'manager' then
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
