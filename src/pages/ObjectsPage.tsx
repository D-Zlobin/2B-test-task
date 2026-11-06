import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ObjectFormDialog } from '../components/ObjectFormDialog'
import {
  createObject,
  deleteObject,
  getErrorMessage,
  listObjects,
  updateObject,
} from '../lib/api'
import type { ConstructionObject } from '../types/database'

export function ObjectsPage() {
  const { profile, session } = useAuth()
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingObject, setEditingObject] = useState<ConstructionObject | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingObject, setDeletingObject] = useState<ConstructionObject | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isManager = profile?.role === 'manager'

  const loadObjects = useCallback(async () => {
    try {
      const objectData = await listObjects()
      setObjects(objectData)
      setError(null)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void listObjects()
      .then((objectData) => {
        if (!isMounted) return
        setObjects(objectData)
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
  }, [])

  const handleDelete = async () => {
    if (!deletingObject) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteObject(deletingObject.id)
      setDeletingObject(null)
      await loadObjects()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Рабочие области</p>
          <h1>Объекты</h1>
        </div>
        {isManager && (
          <button type="button" className="button primary" onClick={() => setIsCreating(true)}>
            Создать объект
          </button>
        )}
      </div>

      {error && <div className="error-banner page-error" role="alert">{error}</div>}
      {isLoading ? (
        <p className="muted">Загрузка объектов…</p>
      ) : objects.length === 0 ? (
        <div className="empty-state">
          <h2>{isManager ? 'Создайте первый объект' : 'Вам пока не назначены задачи'}</h2>
          <p className="muted">
            {isManager
              ? 'После создания объекта в него можно будет добавить задачи.'
              : 'Объект появится здесь, когда постановщик назначит вам задачу.'}
          </p>
        </div>
      ) : (
        <div className="object-grid">
          {objects.map((object) => (
            <article key={object.id} className="object-card">
              <div>
                <h2><Link to={`/objects/${object.id}`}>{object.name}</Link></h2>
                <p className="muted">{object.address}</p>
              </div>
              <div className="card-footer">
                <Link to={`/objects/${object.id}`} className="text-link">Открыть объект →</Link>
                {isManager && (
                  <div className="row-actions">
                    <button type="button" className="button small secondary" onClick={() => setEditingObject(object)}>
                      Изменить
                    </button>
                    <button type="button" className="button small danger-quiet" onClick={() => setDeletingObject(object)}>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {isCreating && session && (
        <ObjectFormDialog
          onClose={() => setIsCreating(false)}
          onSubmit={async (name, address) => {
            await createObject(name, address, session.user.id)
            setIsCreating(false)
            await loadObjects()
          }}
        />
      )}
      {editingObject && (
        <ObjectFormDialog
          object={editingObject}
          onClose={() => setEditingObject(null)}
          onSubmit={async (name, address) => {
            await updateObject(editingObject.id, name, address)
            setEditingObject(null)
            await loadObjects()
          }}
        />
      )}
      {deletingObject && (
        <ConfirmDialog
          title={`Удалить «${deletingObject.name}»?`}
          description="Объект исчезнет из списков. Удалить его можно только при отсутствии неудалённых задач."
          isSubmitting={isDeleting}
          onClose={() => setDeletingObject(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </section>
  )
}
