export type AppRole = 'manager' | 'executor'
export type TaskStatus = 'new' | 'in_progress' | 'in_review' | 'accepted' | 'rework'

export interface Profile {
  id: string
  role: AppRole
  display_name: string | null
}

export interface ProfileSummary {
  id: string
  display_name: string | null
}

export interface ConstructionObject {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TaskRecord {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TaskWithRelations extends TaskRecord {
  object?: Pick<ConstructionObject, 'id' | 'name'> & { address?: string } | null
  assignee?: ProfileSummary | null
  author?: ProfileSummary | null
}

export interface TaskStatusHistory {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  created_at: string
  changed_by_profile?: ProfileSummary | null
}

export interface TaskFormValues {
  title: string
  description: string
  object_id: string
  assignee_id: string
}
