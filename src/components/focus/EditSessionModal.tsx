import { useState, useEffect } from 'react'
import { Button } from '../ui'
import { Edit, AlertCircle, TrendingUp, X } from 'lucide-react'
import { calculateAdherence, getAdherenceColor, type FocusSession } from '../../services/focusTimerService'

interface EditSessionModalProps {
  session: FocusSession
  isOpen: boolean
  onClose: () => void
  onSave: (sessionId: string, workMinutes: number, breakMinutes: number, reason: string) => Promise<void>
}

const ADJUSTMENT_REASONS = [
  'Forgot to stop timer',
  'App stayed open accidentally',
  'System went to sleep',
  'Took break without stopping',
  'Other',
]

export function EditSessionModal({
  session,
  isOpen,
  onClose,
  onSave,
}: EditSessionModalProps) {
  const [workMinutes, setWorkMinutes] = useState(session.total_work_minutes)
  const [breakMinutes, setBreakMinutes] = useState(session.total_break_minutes)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when session changes
  useEffect(() => {
    setWorkMinutes(session.total_work_minutes)
    setBreakMinutes(session.total_break_minutes)
    setReason('')
    setCustomReason('')
    setError(null)
  }, [session])

  if (!isOpen) return null

  const newAdherence = calculateAdherence(workMinutes, breakMinutes)
  const newAdherenceColor = getAdherenceColor(newAdherence)
  const oldAdherence = session.adherence_percentage || 0

  const validate = () => {
    if (workMinutes <= 0) {
      return 'Work time must be greater than 0 minutes'
    }
    if (breakMinutes < 0) {
      return 'Break time cannot be negative'
    }
    if (workMinutes > session.total_work_minutes) {
      return 'Cannot increase work time beyond original duration'
    }
    if (breakMinutes > session.total_break_minutes) {
      return 'Cannot increase break time beyond original duration'
    }
    if (!reason) {
      return 'Please select a reason for this adjustment'
    }
    if (reason === 'Other' && !customReason.trim()) {
      return 'Please provide a custom reason'
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const finalReason = reason === 'Other' ? customReason : reason
      await onSave(session.id, workMinutes, breakMinutes, finalReason)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
      setIsSaving(false)
    }
  }

  const hasChanges = workMinutes !== session.total_work_minutes || breakMinutes !== session.total_break_minutes

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-title"
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
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          maxWidth: '550px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h2 id="edit-session-title" className="h4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={20} />
              Edit Session Duration
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--color-text-secondary)',
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="body-small text-secondary">
            Adjust the recorded time for this session. You can only reduce time, not increase it.
          </p>
        </div>

        {/* Original vs New Comparison */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div>
            <p className="caption text-secondary" style={{ marginBottom: '0.5rem' }}>Original</p>
            <div style={{ marginBottom: '0.5rem' }}>
              <p className="body-small" style={{ fontWeight: '600' }}>Work: {session.total_work_minutes} min</p>
              <p className="body-small" style={{ fontWeight: '600' }}>Break: {session.total_break_minutes} min</p>
            </div>
            <p className="caption" style={{ color: getAdherenceColor(oldAdherence).color }}>
              {getAdherenceColor(oldAdherence).emoji} {Math.round(oldAdherence)}% adherence
            </p>
          </div>
          <div>
            <p className="caption text-secondary" style={{ marginBottom: '0.5rem' }}>New</p>
            <div style={{ marginBottom: '0.5rem' }}>
              <p className="body-small" style={{ fontWeight: '600' }}>Work: {workMinutes} min</p>
              <p className="body-small" style={{ fontWeight: '600' }}>Break: {breakMinutes} min</p>
            </div>
            <p className="caption" style={{ color: newAdherenceColor.color }}>
              {newAdherenceColor.emoji} {Math.round(newAdherence)}% adherence
            </p>
          </div>
        </div>

        {/* Work Time Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="work-minutes" className="body-small" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Adjusted Work Time (minutes)
          </label>
          <input
            id="work-minutes"
            type="number"
            min="1"
            max={session.total_work_minutes}
            value={workMinutes}
            onChange={(e) => setWorkMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-base)',
            }}
          />
          <p className="caption text-secondary" style={{ marginTop: '0.25rem' }}>
            Maximum: {session.total_work_minutes} minutes (original duration)
          </p>
        </div>

        {/* Break Time Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="break-minutes" className="body-small" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Adjusted Break Time (minutes)
          </label>
          <input
            id="break-minutes"
            type="number"
            min="0"
            max={session.total_break_minutes}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-base)',
            }}
          />
          <p className="caption text-secondary" style={{ marginTop: '0.25rem' }}>
            Maximum: {session.total_break_minutes} minutes (original duration)
          </p>
        </div>

        {/* Reason Dropdown */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="reason" className="body-small" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Reason for Adjustment *
          </label>
          <select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-base)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <option value="">Select a reason...</option>
            {ADJUSTMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Reason Input */}
        {reason === 'Other' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="custom-reason" className="body-small" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Custom Reason *
            </label>
            <input
              id="custom-reason"
              type="text"
              placeholder="Please specify..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>
        )}

        {/* Impact Preview */}
        {hasChanges && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-info-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <TrendingUp size={20} color="var(--color-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p className="body-small" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                Impact on Stats
              </p>
              <p className="body-small text-secondary">
                Your adherence will change from {Math.round(oldAdherence)}% to {Math.round(newAdherence)}%.
                All stats and graphs will reflect the adjusted values.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-error-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} color="var(--color-error)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p className="body-small" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            variant="ghost"
            size="large"
            onClick={onClose}
            disabled={isSaving}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="large"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            loading={isSaving}
            style={{ flex: 1 }}
          >
            {isSaving ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
