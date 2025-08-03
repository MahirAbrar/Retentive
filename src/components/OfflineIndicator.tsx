import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-4)',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--color-error)',
        color: 'var(--color-white)',
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 2a3 3 0 0 1 6 0v3m-3 0v3"></path>
        <path d="M9 7h6"></path>
        <path d="M19 11.5a7.5 7.5 0 0 1-15 0"></path>
      </svg>
      <span className="body-small">
        You're offline. Changes will sync when connection is restored.
      </span>
    </div>
  )
}