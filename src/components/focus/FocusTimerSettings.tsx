import { useState } from 'react'
import { Button } from '../ui'
import { Settings } from 'lucide-react'

interface FocusTimerSettingsProps {
  isOpen: boolean
  currentGoalMinutes: number
  onSaveGoal: (minutes: number) => void
  onClose: () => void
}

const GOAL_PRESETS = [
  { label: '25 min', value: 25 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
]

export function FocusTimerSettings({
  isOpen,
  currentGoalMinutes,
  onSaveGoal,
  onClose,
}: FocusTimerSettingsProps) {
  const [goalMinutes, setGoalMinutes] = useState(currentGoalMinutes)
  const [customGoal, setCustomGoal] = useState('')

  if (!isOpen) return null

  const handleSave = () => {
    const finalGoal = customGoal ? parseInt(customGoal) : goalMinutes
    if (finalGoal > 0 && finalGoal <= 480) {
      // Max 8 hours
      onSaveGoal(finalGoal)
      onClose()
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
        zIndex: 10000,
        pointerEvents: 'auto',
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
          position: 'relative',
          zIndex: 10001,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <Settings size={24} />
          <h2 className="h4">Focus Settings</h2>
        </div>

        {/* Goal Duration */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="body-small" style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
            Focus Goal Duration
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  setGoalMinutes(preset.value)
                  setCustomGoal('')
                }}
                style={{
                  padding: '0.75rem',
                  border:
                    goalMinutes === preset.value && !customGoal
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    goalMinutes === preset.value && !customGoal
                      ? 'var(--color-primary-light)'
                      : 'var(--color-surface)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Goal */}
          <div>
            <label
              htmlFor="custom-goal-input"
              className="body-small text-secondary"
              style={{ display: 'block', marginBottom: '0.5rem' }}
            >
              Or set custom goal (minutes):
            </label>
            <input
              id="custom-goal-input"
              type="number"
              min="1"
              max="480"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="Enter minutes (1-480)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: customGoal
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-info-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          <p className="body-small" style={{ marginBottom: '0.5rem' }}>
            <strong>💡 How to use:</strong>
          </p>
          <p className="body-small text-secondary">
            Set your goal to the <strong>entire time you want to study</strong>, including breaks!
            For example, if you have 90 minutes total, set the goal to 90 minutes. The timer will
            track your actual work time and suggest breaks along the way.
          </p>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
          }}
        >
          <p className="body-small text-secondary">
            🎯 <strong>Auto-break calculation:</strong> Based on Pomodoro principles, your break
            time will be automatically calculated as (goal ÷ 25) × 5 minutes.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" size="large" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="large"
            onClick={handleSave}
            style={{ flex: 1 }}
            disabled={
              !customGoal &&
              goalMinutes === currentGoalMinutes
            }
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}