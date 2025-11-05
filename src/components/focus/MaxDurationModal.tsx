import { Button } from '../ui'
import { AlertTriangle, Coffee, Clock, AlertCircle } from 'lucide-react'

interface MaxDurationModalProps {
  isOpen: boolean
  workMinutes: number
  goalMinutes: number
  recommendedBreakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  onTakeBreak: () => void
  onEndSession: () => void
}

export function MaxDurationModal({
  isOpen,
  workMinutes,
  goalMinutes,
  recommendedBreakMinutes,
  adherencePercentage,
  adherenceColor,
  onTakeBreak,
  onEndSession,
}: MaxDurationModalProps) {
  if (!isOpen) return null

  const isAbsoluteMax = workMinutes >= 480 // 8 hours

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
    >
      <div
        role="document"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          maxWidth: '500px',
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
              backgroundColor: isAbsoluteMax ? 'var(--color-error-light)' : 'var(--color-warning-light)',
              marginBottom: '1rem',
            }}
          >
            {isAbsoluteMax ? (
              <AlertCircle size={32} color="var(--color-error)" />
            ) : (
              <AlertTriangle size={32} color="var(--color-warning)" />
            )}
          </div>
          <h2 className="h3" style={{ marginBottom: '0.5rem' }}>
            {isAbsoluteMax ? '⏰ Session Limit Reached' : '⚠️ Extended Session Alert'}
          </h2>
          <p className="body text-secondary">
            {isAbsoluteMax
              ? `You've been working for ${workMinutes} minutes (8 hours maximum). Time to rest!`
              : `You've reached 1.5x your goal! You've been working for ${workMinutes} minutes (Goal: ${goalMinutes} min).`}
          </p>
        </div>

        {/* Session Summary */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
          }}
        >
          <h3 className="h5" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} />
            Session Summary
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <span className="body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} />
              Work Time
            </span>
            <span className="h4" style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
              {workMinutes} min
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <span className="body">Original Goal</span>
            <span className="body-small text-secondary">
              {goalMinutes} min
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span className="body">Adherence</span>
            <span
              className="h4"
              style={{
                color: adherenceColor.color,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {adherenceColor.emoji} {Math.round(adherencePercentage)}% · {adherenceColor.status}
            </span>
          </div>
        </div>

        {/* Break Suggestion */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: isAbsoluteMax ? 'var(--color-error-light)' : 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'start',
            gap: '0.75rem',
          }}
        >
          <Coffee size={20} color={isAbsoluteMax ? 'var(--color-error)' : 'var(--color-warning)'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p className="body-small" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {isAbsoluteMax ? '🛑 You must take a break' : '💡 We recommend taking a break'}
            </p>
            <p className="body-small text-secondary">
              {isAbsoluteMax
                ? 'For your health and productivity, sessions longer than 8 hours are not recommended. Please take a well-deserved break!'
                : `You've exceeded your focus goal by 50%. Taking a ${recommendedBreakMinutes}-minute break will help maintain your productivity and prevent burnout.`}
            </p>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p className="body-small text-secondary">
            ⏸️ <strong>Note:</strong> Your session has been automatically paused.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            variant="primary"
            size="large"
            onClick={onTakeBreak}
            style={{ flex: 1 }}
          >
            <Coffee size={18} />
            Take Break
          </Button>
          <Button
            variant="ghost"
            size="large"
            onClick={onEndSession}
            style={{ flex: 1 }}
          >
            End Session
          </Button>
        </div>
      </div>
    </div>
  )
}
