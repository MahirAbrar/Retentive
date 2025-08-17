import { useState, useEffect } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineDisclaimer() {
  const { isOnline } = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)
  const [hasBeenOnline, setHasBeenOnline] = useState(false)
  
  useEffect(() => {
    // Track if the user has been online at least once
    if (isOnline) {
      setHasBeenOnline(true)
      setDismissed(false) // Reset dismissal when coming back online
    }
  }, [isOnline])

  // Don't show if:
  // - Currently online
  // - User dismissed it
  // - Never been online (initial load while offline is handled differently)
  if (isOnline || dismissed || !hasBeenOnline) {
    return null
  }

  return (
    <>
      {/* Spacer to push content down */}
      <div style={{ height: '60px' }} />
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        backgroundColor: 'var(--color-warning)',
        color: 'var(--color-background)',
        padding: '0.75rem 1rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          flex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📡</span>
            <strong className="body">Offline Mode</strong>
          </div>
          
          <p className="body-small" style={{ margin: 0 }}>
            You're currently offline. You can only access topics and items you've previously loaded. 
            New data won't sync until you're back online.
          </p>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1.5rem',
            padding: '0 0.5rem',
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </>
  )
}