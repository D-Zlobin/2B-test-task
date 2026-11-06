import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusBadge } from '../components/StatusBadge'
import { StatusDialog } from '../components/StatusDialog'
import { TaskFormDialog } from '../components/TaskFormDialog'
import {
  changeTaskStatus,
  deleteTask,
  getErrorMessage,
  getTask,
  listExecutors,
  listObjects,
  listTaskHistory,
  updateTask,
} from '../lib/api'
import {
  TASK_STATUS_LABELS,
  displayName,
  formatDate,
  getAvailableTransitions,
} from '../lib/tasks'
import type { StatusTransition } from '../lib/tasks'
import type {
  ConstructionObject,
  ProfileSummary,
  TaskStatusHistory,
  TaskWithRelations,
} from '../types/database'

export function TaskPage() {
  const { taskId } = useParams()
  const { profile, session } = useAuth()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [history, setHistory] = useState<TaskStatusHistory[]>([])
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [executors, setExecutors] = useState<ProfileSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransition, setSelectedTransition] = useState<StatusTransition | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletePending, setIsDeletePending] = useState(false)
  const isManager = profile?.role === 'manager'

  const loadData = useCallback(async () => {
    if (!taskId) return
    try {
      const taskData = await getTask(taskId)
      setTask(taskData)
      if (!taskData) {
        setHistory([])
        setError(null)
        return
      }

      const historyData = await listTaskHistory(taskId)
      setHistory(historyData)

      if (isManager) {
        const [objectData, executorData] = await Promise.all([listObjects(), listExecutors()])
        setObjects(objectData)
        setExecutors(executorData)
      }
      setError(null)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [isManager, taskId])

  useEffect(() => {
    let isMounted = true
    if (!taskId) return

    const loadInitialData = async () => {
      const taskData = await getTask(taskId)
      if (!isMounted) return
      setTask(taskData)
      if (!taskData) {
        setHistory([])
        return
      }

      const historyData = await listTaskHistory(taskId)
      if (!isMounted) return
      setHistory(historyData)

      if (isManager) {
        const [objectData, executorData] = await Promise.all([listObjects(), listExecutors()])
        if (!isMounted) return
        setObjects(objectData)
        setExecutors(executorData)
      }
    }

    void loadInitialData()
      .then(() => {
        if (isMounted) setError(null)
      })
      .catch((loadError: unknown) => {
        if (isMounted) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isManager, taskId])

  const handleDelete = async () => {
    if (!task) return
    setIsDeletePending(true)
    setError(null)
    try {
      await deleteTask(task.id)
      navigate(task.object_id ? `/objects/${task.object_id}` : '/objects', { replace: true })
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setIsDeletePending(false)
    }
  }

  if (isLoading) return <p className="muted">Загрузка задачи…</p>

  if (!task) {
    return (
      <section className="empty-state">
        <h1>Задача не найдена</h1>
        <p className="muted">Задача удалена или у вас нет доступа к ней.</p>
        {error && <p className="form-error">{error}</p>}
        <Link to="/objects" className="button primary">Перейти к объектам</Link>
      </section>
    )
  }

  const transitions = profile && session
    ? getAvailableTransitions(task, profile.role, session.user.id)
    : []

  return (
    <section>
      <Link to={`/objects/${task.object_id}`} className="back-link">← {task.object?.name || 'Объект'}</Link>
      <div className="page-heading task-heading">
        <div>
          <p className="eyebrow">Карточка задачи</p>
          <h1>{task.title}</h1>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {error && <div className="error-banner page-error" role="alert">{error}</div>}

      <div className="task-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>Описание</h2>
              {isManager && (
                <div className="row-actions">
                  <button type="button" className="button small secondary" onClick={() => setIsEditing(true)}>
                    Изменить
                  </button>
                  <button type="button" className="button small danger-quiet" onClick={() => setIsDeleting(true)}>
                    Удалить
                  </button>
                </div>
              )}
            </div>
            <p className="task-description">{task.description || 'Описание не добавлено.'}</p>
            <dl className="details-grid">
              <div><dt>Объект</dt><dd>{task.object?.name || 'Не указан'}</dd></div>
              <div><dt>Исполнитель</dt><dd>{displayName(task.assignee)}</dd></div>
              <div><dt>Автор</dt><dd>{displayName(task.author)}</dd></div>
              <div><dt>Создана</dt><dd>{formatDate(task.created_at)}</dd></div>
            </dl>
          </section>

          <section className="panel">
            <h2>Действия</h2>
            {transitions.length > 0 ? (
              <div className="status-actions">
                {transitions.map((transition) => (
                  <button
                    key={transition.status}
                    type="button"
                    className={`button ${transition.status === 'rework' ? 'danger' : 'primary'}`}
                    onClick={() => setSelectedTransition(transition)}
                  >
                    {transition.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">В текущем статусе вам доступны только просмотр и история.</p>
            )}
          </section>
        </div>

        <section className="panel history-panel">
          <h2>История статусов</h2>
          {history.length === 0 ? (
            <p className="muted">Записей истории нет.</p>
          ) : (
            <ol className="history-list">
              {history.map((entry) => (
                <li key={entry.id}>
                  <div className="history-topline">
                    <strong>
                      {entry.from_status
                        ? `${TASK_STATUS_LABELS[entry.from_status]} → ${TASK_STATUS_LABELS[entry.to_status]}`
                        : `Создание → ${TASK_STATUS_LABELS[entry.to_status]}`}
                    </strong>
                    <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                  </div>
                  <p className="muted">{displayName(entry.changed_by_profile)}</p>
                  {entry.comment && <p className="history-comment">{entry.comment}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {selectedTransition && (
        <StatusDialog
          transition={selectedTransition}
          onClose={() => setSelectedTransition(null)}
          onSubmit={async (comment) => {
            await changeTaskStatus(task.id, selectedTransition.status, comment)
            setSelectedTransition(null)
            await loadData()
          }}
        />
      )}
      {isEditing && (
        <TaskFormDialog
          task={task}
          objects={objects}
          executors={executors}
          onClose={() => setIsEditing(false)}
          onSubmit={async (values) => {
            await updateTask(task.id, values)
            setIsEditing(false)
            await loadData()
          }}
        />
      )}
      {isDeleting && (
        <ConfirmDialog
          title={`Удалить задачу «${task.title}»?`}
          description="Задача и её история останутся в базе, но станут недоступны в приложении."
          isSubmitting={isDeletePending}
          onClose={() => setIsDeleting(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </section>
  )
}
