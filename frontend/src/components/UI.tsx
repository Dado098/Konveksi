import { X } from 'lucide-react'
import { getStatusVariant } from '../utils/status'

export const Card = ({
  title,
  children,
  actions,
}: {
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
}) => {
  return (
    <section className="card">
      {(title ?? actions) && (
        <header className="card-header">
          {title && <h3>{title}</h3>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export const StatusPill = ({ status }: { status: string }) => {
  const variant = getStatusVariant(status)
  return <span className={`pill ${variant}`}>{status}</span>
}

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export const Modal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="ghost-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
