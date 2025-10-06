import { useNavigate } from 'react-router-dom'
import { useFocusTimer } from '../../hooks/useFocusTimer'
import { useAuth } from '../../hooks/useAuthFixed'
import { Square } from 'lucide-react'

export function FocusSessionIndicator() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    status,
    sessionTime,
    stopSession,
    resetSession,
  } = useFocusTimer(user?.id || '')

  // Don't show if no active session
  if (!user || status === 'idle') return null

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation when clicking stop
    await stopSession()
    resetSession()
  }

  const handleClick = () => {
    navigate('/')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.75rem',
        backgroundColor: 'var(--color-gray-50)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        fontSize: 'var(--text-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'
      }}
      aria-label={`Focus session: ${sessionTime.display}, Status: ${status === 'working' ? 'Working' : 'On Break'}. Click to view timer.`}
    >
      {/* Status Indicator Dot */}
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: status === 'working' ? 'var(--color-success)' : 'var(--color-warning)',
          animation: status === 'working' ? 'pulse 2s infinite' : 'none',
        }}
      />

      {/* Session Time */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: '500',
          color: 'var(--color-text-primary)',
        }}
      >
        {sessionTime.display}
      </span>

      {/* Separator */}
      <span style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}>|</span>

      {/* Status Text */}
      <span
        style={{
          color: status === 'working' ? 'var(--color-success)' : 'var(--color-warning)',
          fontWeight: '500',
        }}
      >
        {status === 'working' ? 'Working' : 'Break'}
      </span>

      {/* Stop Button */}
      <button
        onClick={handleStop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.125rem',
          marginLeft: '0.25rem',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-error)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
        title="Stop Session"
        aria-label="Stop Focus Session"
      >
        <Square size={14} />
      </button>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(46, 204, 113, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
          }
        }
      `}</style>
    </div>
  )
}