import { createPortal } from 'react-dom'
import type { Toast } from '../../contexts/ToastContext'
import styles from './Toast.module.css'

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '!'
      case 'info':
        return 'i'
    }
  }

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}
