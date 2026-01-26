import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, Menu, X } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Load reminder count on mount
  useEffect(() => {
    const loadCount = async () => {
      if (!user) return
      const { count } = await quickRemindersService.getReminderCount(user.id)
      setReminderCount(count)
    }
    loadCount()
  }, [user])

  const navLinks = user ? (
    <>
      <Link
        to="/topics"
        style={{
          textDecoration: 'none',
          color: isActive('/topics') ? 'var(--color-primary)' : 'inherit',
          padding: 'var(--space-2) 0'
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="body">Topics</span>
      </Link>
      <Link
        to="/stats"
        style={{
          textDecoration: 'none',
          color: isActive('/stats') ? 'var(--color-primary)' : 'inherit',
          padding: 'var(--space-2) 0'
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="body">Stats</span>
      </Link>
      <Link
        to="/settings"
        style={{
          textDecoration: 'none',
          color: isActive('/settings') ? 'var(--color-primary)' : 'inherit',
          padding: 'var(--space-2) 0'
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="body">Settings</span>
      </Link>
    </>
  ) : null

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
        {/* Left side: Logo + Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <Link to="/" style={{ textDecoration: 'none', WebkitAppRegion: 'no-drag' }}>
            <h1 className="h4" style={{ margin: 0 }}>Retentive</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="desktop-nav" style={{
            display: 'flex',
            gap: 'var(--space-4)',
            WebkitAppRegion: 'no-drag'
          }}>
            {navLinks}
          </div>
        </nav>

        {/* Right side: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', WebkitAppRegion: 'no-drag' }}>
          {user ? (
            <>
              {/* These show on desktop, hidden on mobile */}
              <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <FocusSessionIndicator />
                <GamificationStats />
              </div>

              {/* Quick Reminders Button - always visible */}
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

              {/* Desktop: Show user info and sign out */}
              <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="body-small text-secondary" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.display_name || user.email}
                </span>
                <Button variant="ghost" size="small" onClick={signOut}>
                  Sign Out
                </Button>
              </div>

              {/* Mobile: Hamburger Menu */}
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  display: 'none',
                  padding: '0.5rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                }}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </>
          ) : (
            location.pathname !== '/login' && (
              <Link to="/login">
                <Button variant="primary" size="small">Sign In</Button>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div className="mobile-menu" style={{
          borderTop: '1px solid var(--color-gray-200)',
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {navLinks}
            <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <FocusSessionIndicator />
                <GamificationStats />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="body-small text-secondary">
                  {user.user_metadata?.display_name || user.email}
                </span>
                <Button variant="ghost" size="small" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for responsive behavior */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-only {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
