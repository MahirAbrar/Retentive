import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function WebDisclaimer() {
  const [dismissed, setDismissed] = useState(false)
  const [showFullWarning, setShowFullWarning] = useState(false)
  const [showDismissOptions, setShowDismissOptions] = useState(false)
  
  // Check if running in Electron
  const isElectron = !!window.electronAPI || 
                     window.navigator.userAgent.includes('Electron') ||
                     window.location.protocol === 'file:'
  
  useEffect(() => {
    // Migrate from old dismissal system
    const oldDismissal = localStorage.getItem('webDisclaimerDismissed')
    if (oldDismissal === 'true') {
      // Convert old permanent dismissal to 7-day dismissal
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
      localStorage.setItem('webDisclaimerDismissedUntil', oneWeekFromNow.toISOString())
      localStorage.removeItem('webDisclaimerDismissed') // Clean up old key
    }
    
    // Check dismissal status
    const checkDismissal = () => {
      // Check permanent dismissal
      const permanentDismissal = localStorage.getItem('webDisclaimerPermanent')
      if (permanentDismissal === 'true') {
        setDismissed(true)
        return
      }
      
      // Check session dismissal
      const sessionDismissal = sessionStorage.getItem('webDisclaimerDismissed')
      if (sessionDismissal === 'true') {
        setDismissed(true)
        return
      }
      
      // Check time-based dismissal (7 days)
      const dismissedUntil = localStorage.getItem('webDisclaimerDismissedUntil')
      if (dismissedUntil) {
        const dismissedUntilDate = new Date(dismissedUntil)
        if (new Date() < dismissedUntilDate) {
          setDismissed(true)
          return
        } else {
          // Time expired, remove the flag
          localStorage.removeItem('webDisclaimerDismissedUntil')
        }
      }
      
      // Track dismissal count for smart frequency
      const dismissalCount = parseInt(localStorage.getItem('webDisclaimerCount') || '0')
      if (dismissalCount >= 3) {
        // After 3 dismissals, only show once a month
        const lastShown = localStorage.getItem('webDisclaimerLastShown')
        if (lastShown) {
          const daysSinceShown = (Date.now() - new Date(lastShown).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceShown < 30) {
            setDismissed(true)
            return
          }
        }
      }
      
      // Show the disclaimer
      localStorage.setItem('webDisclaimerLastShown', new Date().toISOString())
    }
    
    checkDismissal()
  }, [])
  
  const handleDismissToday = () => {
    setDismissed(true)
    sessionStorage.setItem('webDisclaimerDismissed', 'true')
    incrementDismissalCount()
    setShowDismissOptions(false)
  }
  
  const handleDismissWeek = () => {
    setDismissed(true)
    const oneWeekFromNow = new Date()
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
    localStorage.setItem('webDisclaimerDismissedUntil', oneWeekFromNow.toISOString())
    incrementDismissalCount()
    setShowDismissOptions(false)
  }
  
  const handleDismissPermanent = () => {
    setDismissed(true)
    localStorage.setItem('webDisclaimerPermanent', 'true')
    setShowDismissOptions(false)
  }
  
  const incrementDismissalCount = () => {
    const count = parseInt(localStorage.getItem('webDisclaimerCount') || '0')
    localStorage.setItem('webDisclaimerCount', (count + 1).toString())
  }
  
  // Don't show if in Electron or already dismissed
  if (isElectron || dismissed) {
    return null
  }
  
  return (
    <>
      {/* Spacer to push content down */}
      {!dismissed && (
        <div style={{ height: showFullWarning ? '180px' : '80px' }} />
      )}
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'var(--color-warning)',
        color: 'var(--color-background)',
        padding: '1rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <strong className="body" style={{ fontWeight: 'bold' }}>
              Limited Functionality - Download Desktop App for Full Experience
            </strong>
          </div>
          
          {!showFullWarning ? (
            <p className="body-small" style={{ margin: 0 }}>
              You&apos;re using the web version with limited features. Notifications, offline mode, and system integration are disabled.{' '}
              <button
                onClick={() => setShowFullWarning(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit'
                }}
              >
                Learn more
              </button>
            </p>
          ) : (
            <div style={{ marginTop: '0.5rem' }}>
              <p className="body-small" style={{ marginBottom: '0.5rem' }}>
                <strong>⚠️ Critical limitations in web version:</strong>
              </p>
              <ul className="body-small" style={{ 
                margin: '0 0 0.5rem 1.5rem', 
                padding: 0,
                listStyle: 'disc'
              }}>
                <li><strong>No Notifications:</strong> You won&apos;t receive study reminders or due item alerts</li>
                <li><strong>No Offline Mode:</strong> Requires constant internet connection</li>
                <li><strong>No Background Sync:</strong> Data only syncs when the tab is active</li>
                <li><strong>No System Tray:</strong> Can&apos;t minimize to system tray or run in background</li>
                <li><strong>Limited Storage:</strong> Browser storage limits may affect large datasets</li>
                <li><strong>No File System Access:</strong> Cannot export/import data directly</li>
              </ul>
              <p className="body-small" style={{ margin: 0 }}>
                <strong>For the best learning experience with timely review reminders, please download the desktop app.</strong>
              </p>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
          <a
            href="https://github.com/mahirtantod/retentive-app/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-warning)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              border: '2px solid var(--color-background)'
            }}
          >
            Download App
          </a>
          
          {!showDismissOptions ? (
            <button
              onClick={() => setShowDismissOptions(true)}
              style={{
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1.25rem',
                lineHeight: 1,
                opacity: 0.8,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              title="Dismiss options"
            >
              <X size={20} />
            </button>
          ) : (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.5rem',
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              minWidth: '200px'
            }}>
              <div style={{ padding: '0.5rem' }}>
                <p className="body-small" style={{ 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--color-text)'
                }}>
                  Dismiss for:
                </p>
                <button
                  onClick={handleDismissToday}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '0.25rem',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-gray-100)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'}
                >
                  This session only
                </button>
                <button
                  onClick={handleDismissWeek}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '0.25rem',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-gray-100)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'}
                >
                  One week
                </button>
                {parseInt(localStorage.getItem('webDisclaimerCount') || '0') >= 2 && (
                  <button
                    onClick={handleDismissPermanent}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--color-gray-100)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-200)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'}
                  >
                    Don&apos;t show again
                  </button>
                )}
                <button
                  onClick={() => setShowDismissOptions(false)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.25rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.75rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}