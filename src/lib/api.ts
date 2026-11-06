import { supabase } from './supabase'
import type {
  ConstructionObject,
  ProfileSummary,
  TaskFormValues,
  TaskStatus,
  TaskStatusHistory,
  TaskWithRelations,
} from '../types/database'

export async function listObjects() {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ConstructionObject[]
}

export async function getObject(objectId: string) {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .eq('id', objectId)
    .maybeSingle()
  if (error) throw error
  return data as ConstructionObject | null
}

export async function createObject(name: string, address: string, userId: string) {
  const { data, error } = await supabase
    .from('objects')
    .insert({ name, address, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as ConstructionObject
}

export async function updateObject(objectId: string, name: string, address: string) {
  const { data, error } = await supabase
    .from('objects')
    .update({ name, address })
    .eq('id', objectId)
    .select()
    .single()
  if (error) throw error
  return data as ConstructionObject
}

export async function deleteObject(objectId: string) {
  const { error } = await supabase.rpc('soft_delete_object', { p_object_id: objectId })
  if (error) throw error
}

export async function listObjectTasks(objectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, display_name)')
    .eq('object_id', objectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

export async function listMyTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, object:objects!tasks_object_id_fkey(id, name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

export async function getTask(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      object:objects!tasks_object_id_fkey(id, name, address),
      assignee:profiles!tasks_assignee_id_fkey(id, display_name),
      author:profiles!tasks_author_id_fkey(id, display_name)
    `)
    .eq('id', taskId)
    .maybeSingle()
  if (error) throw error
  return data as TaskWithRelations | null
}

export async function listTaskHistory(taskId: string) {
  const { data, error } = await supabase
    .from('task_status_history')
    .select('*, changed_by_profile:profiles!task_status_history_changed_by_fkey(id, display_name)')
    .eq('task_id', taskId)
    .order('created_at')
    .order('id')
  if (error) throw error
  return (data ?? []) as TaskStatusHistory[]
}

export async function listExecutors() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'executor')
    .order('display_name')
  if (error) throw error
  return (data ?? []) as ProfileSummary[]
}

export async function createTask(values: TaskFormValues) {
  const { data, error } = await supabase.rpc('create_task', {
    p_title: values.title,
    p_description: values.description,
    p_object_id: values.object_id,
    p_assignee_id: values.assignee_id,
  })
  if (error) throw error
  return data as TaskWithRelations
}

export async function updateTask(taskId: string, values: TaskFormValues) {
  const { data, error } = await supabase
    .from('tasks')
    .update(values)
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data as TaskWithRelations
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.rpc('soft_delete_task', { p_task_id: taskId })
  if (error) throw error
}

export async function changeTaskStatus(taskId: string, status: TaskStatus, comment: string) {
  const { data, error } = await supabase.rpc('change_task_status', {
    p_task_id: taskId,
    p_new_status: status,
    p_comment: comment,
  })
  if (error) throw error
  return data as TaskWithRelations
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message)
  }
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.'
}
