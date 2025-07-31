import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'primary'
      case 'warning':
        return 'secondary'
      default:
        return 'primary'
    }
  }

  const getConfirmButtonStyle = () => {
    if (variant === 'danger') {
      return {
        backgroundColor: 'var(--color-error)',
        borderColor: 'var(--color-error)'
      }
    }
    return {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ padding: '1rem 0' }}>
        <p className="body">{message}</p>
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'flex-end',
        marginTop: '2rem'
      }}>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={getConfirmButtonVariant()}
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
          style={getConfirmButtonStyle()}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}