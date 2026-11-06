import type { AppRole, TaskRecord, TaskStatus } from '../types/database'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export interface StatusTransition {
  status: TaskStatus
  label: string
  requiresComment: boolean
}

export function getAvailableTransitions(
  task: Pick<TaskRecord, 'status' | 'assignee_id'>,
  role: AppRole,
  userId: string,
): StatusTransition[] {
  if (role === 'executor' && task.assignee_id === userId) {
    if (task.status === 'new' || task.status === 'rework') {
      return [{ status: 'in_progress', label: 'Взять в работу', requiresComment: false }]
    }
    if (task.status === 'in_progress') {
      return [{ status: 'in_review', label: 'Отправить на проверку', requiresComment: false }]
    }
  }

  if (role === 'manager' && task.status === 'in_review') {
    return [
      { status: 'accepted', label: 'Принять задачу', requiresComment: false },
      { status: 'rework', label: 'Вернуть на доработку', requiresComment: true },
    ]
  }

  return []
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function displayName(profile?: { display_name: string | null } | null) {
  return profile?.display_name || 'Имя не указано'
}
