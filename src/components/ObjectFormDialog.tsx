import { useState } from 'react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../lib/api'
import type { ConstructionObject } from '../types/database'
import { Modal } from './Modal'

interface ObjectFormDialogProps {
  object?: ConstructionObject
  onSubmit: (name: string, address: string) => Promise<void>
  onClose: () => void
}

export function ObjectFormDialog({ object, onSubmit, onClose }: ObjectFormDialogProps) {
  const [name, setName] = useState(object?.name ?? '')
  const [address, setAddress] = useState(object?.address ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !address.trim()) {
      setError('Заполните название и адрес объекта.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(name.trim(), address.trim())
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={object ? 'Редактирование объекта' : 'Новый объект'} onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Название
          <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </label>
        <label>
          Адрес
          <input value={address} onChange={(event) => setAddress(event.target.value)} required />
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
