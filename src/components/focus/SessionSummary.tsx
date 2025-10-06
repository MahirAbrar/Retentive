import { Button } from '../ui'
import { BarChart, Clock, Coffee, TrendingUp } from 'lucide-react'

interface SessionSummaryProps {
  isOpen: boolean
  workMinutes: number
  breakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  onClose: () => void
}

export function SessionSummary({
  isOpen,
  workMinutes,
  breakMinutes,
  adherencePercentage,
  adherenceColor,
  onClose,
}: SessionSummaryProps) {
  if (!isOpen) return null

  const totalMinutes = workMinutes + breakMinutes
  const workPercentage = (workMinutes / totalMinutes) * 100
  const breakPercentage = (breakMinutes / totalMinutes) * 100

  // Get motivational message based on adherence
  const getMessage = () => {
    if (adherencePercentage >= 95) {
      return '🎯 Outstanding focus! You maintained excellent discipline.'
    } else if (adherencePercentage >= 80) {
      return '💪 Great work! You stayed on track with minimal distractions.'
    } else if (adherencePercentage >= 70) {
      return '👍 Good effort! There is room to improve your focus next time.'
    } else if (adherencePercentage >= 60) {
      return '🔄 Keep trying! Remember, every session is progress.'
    } else {
      return '💡 Tip: Try setting a smaller goal to build your focus stamina.'
    }
  }

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
          maxWidth: '550px',
          width: '90%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            <BarChart size={32} color="var(--color-primary)" />
          </div>
          <h2 className="h3" style={{ marginBottom: '0.5rem' }}>
            Session Complete
          </h2>
          <p className="body text-secondary">Here&rsquo;s how you did</p>
        </div>

        {/* Adherence Score */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: adherenceColor.color + '20', // 20% opacity
            border: `2px solid ${adherenceColor.color}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>{adherenceColor.emoji}</span>
            <h3 className="h2" style={{ color: adherenceColor.color }}>
              {Math.round(adherencePercentage)}%
            </h3>
          </div>
          <p className="body-small" style={{ fontWeight: '600' }}>
            {adherenceColor.status} Adherence
          </p>
        </div>

        {/* Time Breakdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--color-success)" />
              <span className="body">Work Time</span>
            </div>
            <span className="h4">{workMinutes} min</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coffee size={18} color="var(--color-warning)" />
              <span className="body">Break Time</span>
            </div>
            <span className="h4">{breakMinutes} min</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-gray-200)',
            }}
          >
            <span className="body" style={{ fontWeight: '600' }}>
              Total Session
            </span>
            <span className="h4">{totalMinutes} min</span>
          </div>
        </div>

        {/* Visual Timeline */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="body-small text-secondary" style={{ marginBottom: '0.5rem' }}>
            Session Breakdown
          </p>
          <div
            style={{
              display: 'flex',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--color-gray-200)',
            }}
          >
            <div
              style={{
                width: `${workPercentage}%`,
                backgroundColor: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {workPercentage > 15 && (
                <span className="caption" style={{ color: 'white', fontWeight: '600' }}>
                  {Math.round(workPercentage)}%
                </span>
              )}
            </div>
            <div
              style={{
                width: `${breakPercentage}%`,
                backgroundColor: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {breakPercentage > 15 && (
                <span className="caption" style={{ color: 'white', fontWeight: '600' }}>
                  {Math.round(breakPercentage)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'start',
            gap: '0.75rem',
          }}
        >
          <TrendingUp size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p className="body-small">{getMessage()}</p>
        </div>

        {/* Close Button */}
        <Button
          variant="primary"
          size="large"
          onClick={onClose}
          style={{ width: '100%' }}
        >
          Done
        </Button>
      </div>
    </div>
  )
}