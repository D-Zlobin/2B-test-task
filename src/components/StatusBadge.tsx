import { TASK_STATUS_LABELS } from '../lib/tasks'
import type { TaskStatus } from '../types/database'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-${status}`}>{TASK_STATUS_LABELS[status]}</span>
}
