import { useState } from 'react'
import type { FormEvent } from 'react'
import { getErrorMessage } from '../lib/api'
import type { StatusTransition } from '../lib/tasks'
import { Modal } from './Modal'

interface StatusDialogProps {
  transition: StatusTransition
  onSubmit: (comment: string) => Promise<void>
  onClose: () => void
}

export function StatusDialog({ transition, onSubmit, onClose }: StatusDialogProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (transition.requiresComment && !comment.trim()) {
      setError('Добавьте комментарий о необходимой доработке.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(comment.trim())
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={transition.label} onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Комментарий {transition.requiresComment ? '(обязательно)' : '(необязательно)'}
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            required={transition.requiresComment}
            autoFocus
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение…' : transition.label}
          </button>
        </div>
      </form>
    </Modal>
  )
}
