import { X } from 'lucide-react'
import { Button } from '../ui'
import type { BreakActivity } from '../../services/breakActivities'

interface BreakActivityTimerProps {
  activity: BreakActivity
  timeRemaining: number // in seconds
  onComplete: () => void
  onCancel: () => void
}

export function BreakActivityTimer({
  activity,
  timeRemaining,
  onComplete,
  onCancel,
}: BreakActivityTimerProps) {
  const totalSeconds = activity.durationMinutes * 60
  const progressPercentage = ((totalSeconds - timeRemaining) / totalSeconds) * 100

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return (
    <div
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
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '450px',
          width: '100%',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-text-secondary)',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Activity Emoji */}
        <div
          style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            lineHeight: 1,
          }}
        >
          {activity.emoji}
        </div>

        {/* Activity Name */}
        <h3 className="h3" style={{ marginBottom: '0.5rem' }}>
          {activity.name}
        </h3>

        {/* Timer Display */}
        <div
          className="h1"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '3rem',
            fontWeight: '600',
            color: 'var(--color-primary)',
            marginBottom: '1.5rem',
          }}
        >
          {timeDisplay}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '8px',
            backgroundColor: 'var(--color-gray-200)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercentage}%`,
              backgroundColor: 'var(--color-primary)',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Description */}
        <p className="body text-secondary" style={{ marginBottom: '2rem' }}>
          {activity.description}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <Button
            variant="primary"
            size="large"
            onClick={onComplete}
            style={{ width: '100%' }}
          >
            Done Early
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={onCancel}
            style={{ width: '100%' }}
          >
            Cancel Activity
          </Button>
        </div>

        {/* Reminder Text */}
        <p
          className="caption text-secondary"
          style={{
            marginTop: '1.5rem',
            fontStyle: 'italic',
          }}
        >
          Your focus session is paused during this break
        </p>
      </div>
    </div>
  )
}
