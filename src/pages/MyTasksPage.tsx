import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { TaskList } from '../components/TaskList'
import { getErrorMessage, listMyTasks } from '../lib/api'
import type { TaskWithRelations } from '../types/database'

export function MyTasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isExecutor = profile?.role === 'executor'

  useEffect(() => {
    let isMounted = true
    if (!isExecutor) return

    void listMyTasks()
      .then((taskData) => {
        if (!isMounted) return
        setTasks(taskData)
        setError(null)
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
  }, [isExecutor])

  if (!isExecutor) {
    return (
      <section className="empty-state">
        <h1>Раздел исполнителя</h1>
        <p className="muted">Постановщику все задачи доступны через карточки объектов.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Личная работа</p>
          <h1>Мои задачи</h1>
        </div>
      </div>
      {error && <div className="error-banner page-error" role="alert">{error}</div>}
      {isLoading ? (
        <p className="muted">Загрузка задач…</p>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h2>Назначенных задач нет</h2>
          <p className="muted">Новые задачи появятся здесь после назначения постановщиком.</p>
        </div>
      ) : (
        <TaskList tasks={tasks} showObject />
      )}
    </section>
  )
}
