import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'
import { GamificationStats } from '../gamification/GamificationStats'
import { FocusSessionIndicator } from '../focus/FocusSessionIndicator'
import { QuickRemindersPopup } from './QuickRemindersPopup'
import { quickRemindersService } from '../../services/quickRemindersService'

export function HeaderFixed() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showReminders, setShowReminders] = useState(false)
  const [reminderCount, setReminderCount] = useState(0)

  const isActive = (path: string) => location.pathname === path

  // Load reminder count on mount
  useEffect(() => {
    const loadCount = async () => {
      if (!user) return
      const { count } = await quickRemindersService.getReminderCount(user.id)
      setReminderCount(count)
    }
    loadCount()
  }, [user])

  return (
    <header style={{
      borderBottom: '1px solid var(--color-gray-200)',
      backgroundColor: 'var(--color-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-sticky)',
      WebkitAppRegion: 'drag',
      userSelect: 'none'
    }}>
      <div style={{
        maxWidth: 'var(--container-xl)',
        margin: '0 auto',
        padding: 'var(--space-4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <Link to="/" style={{ textDecoration: 'none', WebkitAppRegion: 'no-drag' }}>
            <h1 className="h4" style={{ margin: 0 }}>Retentive</h1>
          </Link>

          {user && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', WebkitAppRegion: 'no-drag' }}>
              <Link 
                to="/topics" 
                style={{ 
                  textDecoration: 'none',
                  color: isActive('/topics') ? 'var(--color-primary)' : 'inherit'
                }}
              >
                <span className="body">Topics</span>
              </Link>
              <Link 
                to="/stats" 
                style={{ 
                  textDecoration: 'none',
                  color: isActive('/stats') ? 'var(--color-primary)' : 'inherit'
                }}
              >
                <span className="body">Stats</span>
              </Link>
              <Link 
                to="/settings" 
                style={{ 
                  textDecoration: 'none',
                  color: isActive('/settings') ? 'var(--color-primary)' : 'inherit'
                }}
              >
                <span className="body">Settings</span>
              </Link>
            </div>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', WebkitAppRegion: 'no-drag' }}>
          {user ? (
            <>
              <FocusSessionIndicator />
              <GamificationStats />

              {/* Quick Reminders Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowReminders(!showReminders)}
                  style={{
                    position: 'relative',
                    padding: '0.5rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--color-text-primary)',
                  }}
                  aria-label="Quick reminders"
                  title="Quick reminders"
                >
                  <Bell size={20} />
                  {reminderCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        lineHeight: '1',
                        minWidth: '18px',
                        textAlign: 'center',
                      }}
                    >
                      {reminderCount > 99 ? '99+' : reminderCount}
                    </span>
                  )}
                </button>

                <QuickRemindersPopup
                  isOpen={showReminders}
                  onClose={() => setShowReminders(false)}
                  onCountChange={setReminderCount}
                />
              </div>

              <span className="body-small text-secondary">
                {user.user_metadata?.display_name || user.email}
              </span>
              <Button variant="ghost" size="small" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="small">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}