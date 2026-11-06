import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ObjectFormDialog } from '../components/ObjectFormDialog'
import { TaskFormDialog } from '../components/TaskFormDialog'
import { TaskList } from '../components/TaskList'
import {
  createTask,
  deleteObject,
  deleteTask,
  getErrorMessage,
  getObject,
  listExecutors,
  listObjects,
  listObjectTasks,
  updateObject,
  updateTask,
} from '../lib/api'
import type {
  ConstructionObject,
  ProfileSummary,
  TaskWithRelations,
} from '../types/database'

export function ObjectPage() {
  const { objectId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [object, setObject] = useState<ConstructionObject | null>(null)
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [executors, setExecutors] = useState<ProfileSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [deletingTask, setDeletingTask] = useState<TaskWithRelations | null>(null)
  const [isEditingObject, setIsEditingObject] = useState(false)
  const [isDeletingObject, setIsDeletingObject] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isManager = profile?.role === 'manager'

  const loadData = useCallback(async () => {
    if (!objectId) return
    try {
      const [objectData, taskData] = await Promise.all([
        getObject(objectId),
        listObjectTasks(objectId),
      ])
      setObject(objectData)
      setTasks(taskData)

      if (objectData && isManager) {
        const [executorData, allObjects] = await Promise.all([listExecutors(), listObjects()])
        setExecutors(executorData)
        setObjects(allObjects)
      }
      setError(null)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [isManager, objectId])

  useEffect(() => {
    let isMounted = true
    if (!objectId) return

    const loadInitialData = async () => {
      const [objectData, taskData] = await Promise.all([
        getObject(objectId),
        listObjectTasks(objectId),
      ])
      if (!isMounted) return
      setObject(objectData)
      setTasks(taskData)

      if (objectData && isManager) {
        const [executorData, allObjects] = await Promise.all([listExecutors(), listObjects()])
        if (!isMounted) return
        setExecutors(executorData)
        setObjects(allObjects)
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
  }, [isManager, objectId])

  const handleDeleteTask = async () => {
    if (!deletingTask) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteTask(deletingTask.id)
      setDeletingTask(null)
      await loadData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteObject = async () => {
    if (!object) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteObject(object.id)
      navigate('/objects', { replace: true })
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="muted">Загрузка объекта…</p>
  }

  if (!object) {
    return (
      <section className="empty-state">
        <h1>Объект не найден</h1>
        <p className="muted">Объект удалён или у вас нет доступа к нему.</p>
        {error && <p className="form-error">{error}</p>}
        <Link to="/objects" className="button primary">Вернуться к объектам</Link>
      </section>
    )
  }

  return (
    <section>
      <Link to="/objects" className="back-link">← Все объекты</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Карточка объекта</p>
          <h1>{object.name}</h1>
          <p className="muted">{object.address}</p>
        </div>
        {isManager && (
          <div className="row-actions">
            <button type="button" className="button secondary" onClick={() => setIsEditingObject(true)}>
              Изменить объект
            </button>
            <button type="button" className="button danger-quiet" onClick={() => setIsDeletingObject(true)}>
              Удалить объект
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-banner page-error" role="alert">{error}</div>}

      <div className="section-heading">
        <h2>Задачи <span className="count">{tasks.length}</span></h2>
        {isManager && (
          <button type="button" className="button primary" onClick={() => setIsCreatingTask(true)}>
            Создать задачу
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state compact">
          <p className="muted">На этом объекте пока нет доступных задач.</p>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onEdit={isManager ? setEditingTask : undefined}
          onDelete={isManager ? setDeletingTask : undefined}
        />
      )}

      {isCreatingTask && (
        <TaskFormDialog
          objects={objects}
          executors={executors}
          defaultObjectId={object.id}
          onClose={() => setIsCreatingTask(false)}
          onSubmit={async (values) => {
            await createTask({ ...values, object_id: object.id })
            setIsCreatingTask(false)
            await loadData()
          }}
        />
      )}
      {editingTask && (
        <TaskFormDialog
          task={editingTask}
          objects={objects}
          executors={executors}
          onClose={() => setEditingTask(null)}
          onSubmit={async (values) => {
            await updateTask(editingTask.id, values)
            setEditingTask(null)
            await loadData()
          }}
        />
      )}
      {deletingTask && (
        <ConfirmDialog
          title={`Удалить задачу «${deletingTask.title}»?`}
          description="Задача и её история останутся в базе, но станут недоступны в приложении."
          isSubmitting={isDeleting}
          onClose={() => setDeletingTask(null)}
          onConfirm={() => void handleDeleteTask()}
        />
      )}
      {isEditingObject && (
        <ObjectFormDialog
          object={object}
          onClose={() => setIsEditingObject(false)}
          onSubmit={async (name, address) => {
            await updateObject(object.id, name, address)
            setIsEditingObject(false)
            await loadData()
          }}
        />
      )}
      {isDeletingObject && (
        <ConfirmDialog
          title={`Удалить «${object.name}»?`}
          description="Объект исчезнет из списков. При наличии неудалённых задач база отклонит удаление."
          isSubmitting={isDeleting}
          onClose={() => setIsDeletingObject(false)}
          onConfirm={() => void handleDeleteObject()}
        />
      )}
    </section>
  )
}
