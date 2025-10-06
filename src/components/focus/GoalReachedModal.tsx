import { Button } from '../ui'
import { Trophy, Coffee, Clock, Target } from 'lucide-react'

interface GoalReachedModalProps {
  isOpen: boolean
  workMinutes: number
  recommendedBreakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  onStopSession: () => void
}

export function GoalReachedModal({
  isOpen,
  workMinutes,
  recommendedBreakMinutes,
  adherencePercentage,
  adherenceColor,
  onStopSession,
}: GoalReachedModalProps) {
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
              backgroundColor: 'var(--color-success-light)',
              marginBottom: '1rem',
            }}
          >
            <Trophy size={32} color="var(--color-success)" />
          </div>
          <h2 className="h3" style={{ marginBottom: '0.5rem' }}>
            🎯 Goal Reached!
          </h2>
          <p className="body text-secondary">
            You&apos;ve completed your {workMinutes}-minute focus goal!
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
            <Target size={18} />
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
            <span className="h4" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
              {workMinutes}:00
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
            backgroundColor: 'var(--color-info-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'start',
            gap: '0.75rem',
          }}
        >
          <Coffee size={20} color="var(--color-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p className="body-small" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              💡 Suggested Break: {recommendedBreakMinutes} minutes
            </p>
            <p className="body-small text-secondary">
              Based on the Pomodoro technique ({workMinutes} min ÷ 25 × 5), consider taking a {recommendedBreakMinutes}-minute break to maintain optimal productivity.
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
            ⏱️ <strong>Note:</strong> The timer will continue running until you stop the session.
          </p>
        </div>

        {/* Single Action */}
        <div>
          <Button
            variant="primary"
            size="large"
            onClick={onStopSession}
            style={{ width: '100%' }}
          >
            Stop Session
          </Button>
        </div>
      </div>
    </div>
  )
}