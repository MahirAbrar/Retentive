import { Button } from '../ui'
import { Clock, Play } from 'lucide-react'

interface BreakCompleteModalProps {
  isOpen: boolean
  breakMinutes: number
  onStartWorking: () => void
  onExtendBreak: () => void
  onClose: () => void
}

export function BreakCompleteModal({
  isOpen,
  breakMinutes,
  onStartWorking,
  onExtendBreak,
  onClose,
}: BreakCompleteModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
    >
      <div
        role="document"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warning-light)',
              marginBottom: '1rem',
            }}
          >
            <Clock size={32} color="var(--color-warning)" />
          </div>
          <h2 className="h3" style={{ marginBottom: '0.5rem' }}>
            Break Time&rsquo;s Up!
          </h2>
          <p className="body text-secondary">You&rsquo;ve rested for {breakMinutes} minutes</p>
        </div>

        {/* Message */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p className="body">Ready to focus again?</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <Button
            variant="primary"
            size="large"
            onClick={() => {
              onStartWorking()
              onClose()
            }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Play size={18} />
            Start Working
          </Button>
          <Button
            variant="ghost"
            size="large"
            onClick={() => {
              onExtendBreak()
              onClose()
            }}
            style={{ width: '100%' }}
          >
            Extend Break (5 min)
          </Button>
        </div>
      </div>
    </div>
  )
}