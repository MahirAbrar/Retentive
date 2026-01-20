import { Button } from '../ui'
import { Target, Clock, Coffee, AlertTriangle } from 'lucide-react'

interface SessionStartModalProps {
  isOpen: boolean
  goalMinutes: number
  onConfirm: () => void
  onCancel: () => void
}

export function SessionStartModal({
  isOpen,
  goalMinutes,
  onConfirm,
  onCancel,
}: SessionStartModalProps) {
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
      tabIndex={-1}
      onClick={onCancel}
    >
      <div
        role="document"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          maxWidth: '480px',
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
              backgroundColor: 'var(--color-primary-light)',
              marginBottom: '1rem',
            }}
          >
            <Target size={32} color="var(--color-primary)" />
          </div>
          <h2 className="h3" style={{ marginBottom: '0.5rem' }}>
            Ready to Focus?
          </h2>
          <p className="body text-secondary">
            You&apos;re about to start a {goalMinutes}-minute focus session
          </p>
        </div>

        {/* Session Rules */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          <h3 className="h5" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} />
            Session Rules
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
            <li className="body-small">
              Timer runs continuously for {goalMinutes} minutes
            </li>
            <li className="body-small">
              Breaks count toward total session time
            </li>
            <li className="body-small">
              Less work time = lower adherence score
            </li>
          </ul>
        </div>

        {/* Consequences Warning */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={20} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p className="body-small" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Consequences for Low Adherence
            </p>
            <ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.25rem' }}>
              <li className="caption text-secondary">Below 80%: 25% points penalty</li>
              <li className="caption text-secondary">Below 60%: 50% points penalty</li>
              <li className="caption text-secondary">Below 40%: 75% points penalty</li>
            </ul>
          </div>
        </div>

        {/* Break Tip */}
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-info-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Coffee size={18} color="var(--color-info)" style={{ flexShrink: 0 }} />
          <p className="body-small text-secondary">
            <strong>Tip:</strong> Plan short breaks wisely - they&apos;re deducted from your work time!
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            size="large"
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="large"
            onClick={onConfirm}
            style={{ flex: 1 }}
          >
            Start Session
          </Button>
        </div>
      </div>
    </div>
  )
}
