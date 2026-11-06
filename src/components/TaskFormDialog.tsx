import { useState } from 'react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../lib/api'
import { displayName } from '../lib/tasks'
import type {
  ConstructionObject,
  ProfileSummary,
  TaskFormValues,
  TaskWithRelations,
} from '../types/database'
import { Modal } from './Modal'

interface TaskFormDialogProps {
  task?: TaskWithRelations
  objects: ConstructionObject[]
  executors: ProfileSummary[]
  defaultObjectId?: string
  onSubmit: (values: TaskFormValues) => Promise<void>
  onClose: () => void
}

export function TaskFormDialog({
  task,
  objects,
  executors,
  defaultObjectId,
  onSubmit,
  onClose,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [objectId, setObjectId] = useState(task?.object_id ?? defaultObjectId ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !objectId || !assigneeId) {
      setError('Заполните название, объект и исполнителя.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        object_id: objectId,
        assignee_id: assigneeId,
      })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={task ? 'Редактирование задачи' : 'Новая задача'} onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Название
          <input value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
        </label>
        <label>
          Описание
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
        </label>
        {task ? (
          <label>
            Объект
            <select value={objectId} onChange={(event) => setObjectId(event.target.value)} required>
              {objects.map((object) => (
                <option key={object.id} value={object.id}>{object.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" value={objectId} />
        )}
        <label>
          Исполнитель
          <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>
            <option value="" disabled>Выберите исполнителя</option>
            {executors.map((executor) => (
              <option key={executor.id} value={executor.id}>{displayName(executor)}</option>
            ))}
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
