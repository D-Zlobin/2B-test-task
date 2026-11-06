import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  description: string
  isSubmitting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  description,
  isSubmitting,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{description}</p>
      <p className="muted">Отменить это действие через приложение нельзя.</p>
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </button>
        <button type="button" className="button danger" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Удаление…' : 'Удалить'}
        </button>
      </div>
    </Modal>
  )
}
