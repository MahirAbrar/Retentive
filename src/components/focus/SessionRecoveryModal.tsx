import { Modal, Button } from '../ui'

interface SessionRecoveryModalProps {
  isOpen: boolean
  workMinutes: number
  breakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  onResume: () => void
  onDiscard: () => void
}

export function SessionRecoveryModal({
  isOpen,
  workMinutes,
  breakMinutes,
  adherencePercentage,
  adherenceColor,
  onResume,
  onDiscard,
}: SessionRecoveryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onDiscard}>
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        {/* Icon */}
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}
        >
          🔄
        </div>

        {/* Title */}
        <h3 className="h3" style={{ marginBottom: '0.5rem' }}>
          Welcome Back!
        </h3>

        <p className="body text-secondary" style={{ marginBottom: '1.5rem' }}>
          You have an unfinished focus session
        </p>

        {/* Session Stats */}
        <div
          style={{
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <p className="caption text-secondary" style={{ marginBottom: '0.25rem' }}>
                Work Time
              </p>
              <p className="h4" style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>
                {workMinutes}m
              </p>
            </div>
            <div>
              <p className="caption text-secondary" style={{ marginBottom: '0.25rem' }}>
                Break Time
              </p>
              <p className="h4" style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>
                {breakMinutes}m
              </p>
            </div>
          </div>

          {/* Adherence */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <span className="caption text-secondary">Adherence</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{adherenceColor.emoji}</span>
                <span
                  className="body"
                  style={{
                    color: adherenceColor.color,
                    fontWeight: '600',
                  }}
                >
                  {Math.round(adherencePercentage)}%
                </span>
              </div>
            </div>
            <div
              style={{
                height: '4px',
                backgroundColor: 'var(--color-gray-200)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${adherencePercentage}%`,
                  backgroundColor: adherenceColor.color,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            variant="primary"
            size="large"
            onClick={(e) => {
              e.stopPropagation()
              onResume()
            }}
            style={{ width: '100%' }}
          >
            Resume Session
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onDiscard()
            }}
            style={{ width: '100%' }}
          >
            Discard & Start Fresh
          </Button>
        </div>

        {/* Helper text */}
        <p
          className="caption text-secondary"
          style={{
            marginTop: '1rem',
            fontStyle: 'italic',
          }}
        >
          Your progress has been saved
        </p>
      </div>
    </Modal>
  )
}
