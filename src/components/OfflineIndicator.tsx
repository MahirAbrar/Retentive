import { useState, useEffect } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useVisibilityAwareInterval } from '../hooks/useVisibilityAwareInterval'
import { syncService } from '../services/syncService'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing)
      // Update pending count when sync status changes
      setPendingCount(syncService.getPendingOperationsCount())
    })

    // Initial count
    setPendingCount(syncService.getPendingOperationsCount())

    return () => {
      unsubscribe()
    }
  }, [])

  // Check pending count every 10 seconds, but pause when window is hidden (saves energy)
  useVisibilityAwareInterval(() => {
    setPendingCount(syncService.getPendingOperationsCount())
  }, 10000)

  if (isOnline && !isSyncing && pendingCount === 0) return null

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
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 2a3 3 0 0 1 6 0v3m-3 0v3" />
        <path d="M9 7h6" />
        <path d="M19 11.5a7.5 7.5 0 0 1-15 0" />
      </svg>
      <span className="body-small">
        {!isOnline ? (
          <>You&rsquo;re offline. {pendingCount > 0 && `${pendingCount} changes`} will sync when connection is restored.</>
        ) : isSyncing ? (
          <>Syncing {pendingCount} pending changes...</>
        ) : (
          <>{pendingCount} changes waiting to sync</>
        )}
      </span>
    </div>
  )
}