import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, Menu, X } from 'lucide-react'
import { Button } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { GamificationStats } from '../gamification/GamificationStats'
import { FocusSessionIndicator } from '../focus/FocusSessionIndicator'
import { QuickRemindersPopup } from './QuickRemindersPopup'
import { quickRemindersService } from '../../services/quickRemindersService'

// Stable style objects (defined outside component to avoid re-creation)
const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--color-gray-200)',
  backgroundColor: 'var(--color-surface)',
  position: 'sticky',
  top: 0,
  zIndex: 'var(--z-sticky)' as any,
  userSelect: 'none'
}

const containerStyle: React.CSSProperties = {
  maxWidth: 'var(--container-xl)',
  margin: '0 auto',
  padding: 'var(--space-4)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const navStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }
const desktopNavStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-4)' }
const actionsStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }
const desktopActionsStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }
const logoStyle: React.CSSProperties = { margin: 0 }
const logoLinkStyle: React.CSSProperties = { textDecoration: 'none' }

const bellBtnStyle: React.CSSProperties = {
  position: 'relative',
  padding: '0.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--color-text-primary)',
}

const badgeStyle: React.CSSProperties = {
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
}

const hamburgerStyle: React.CSSProperties = {
  display: 'none',
  padding: '0.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
}

const mobileMenuStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-gray-200)',
  backgroundColor: 'var(--color-surface)',
  padding: 'var(--space-4)',
}

const mobileMenuInnerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }
const mobileDividerStyle: React.CSSProperties = { borderTop: '1px solid var(--color-gray-200)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-2)' }
const mobileStatsRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }
const mobileUserRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const userEmailStyle: React.CSSProperties = { maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const reminderWrapperStyle: React.CSSProperties = { position: 'relative' }

const RESPONSIVE_CSS = `
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
`

// Memoized nav link to avoid re-creating on every render
const NavLink = memo(function NavLink({ to, label, isActive, onClick }: {
  to: string
  label: string
  isActive: boolean
  onClick: () => void
}) {
  const style = useMemo<React.CSSProperties>(() => ({
    textDecoration: 'none',
    color: isActive ? 'var(--color-primary)' : 'inherit',
    padding: 'var(--space-2) 0'
  }), [isActive])

  return (
    <Link to={to} style={style} onClick={onClick}>
      <span className="body">{label}</span>
    </Link>
  )
})

export function Header() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showReminders, setShowReminders] = useState(false)
  const [reminderCount, setReminderCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
  const toggleReminders = useCallback(() => setShowReminders(prev => !prev), [])
  const closeReminders = useCallback(() => setShowReminders(false), [])
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), [])

  const pathname = location.pathname

  const navLinks = user ? (
    <>
      <NavLink to="/topics" label="Topics" isActive={pathname === '/topics'} onClick={closeMobileMenu} />
      <NavLink to="/stats" label="Stats" isActive={pathname === '/stats'} onClick={closeMobileMenu} />
      <NavLink to="/settings" label="Settings" isActive={pathname === '/settings'} onClick={closeMobileMenu} />
    </>
  ) : null

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        {/* Left side: Logo + Desktop Nav */}
        <nav style={navStyle}>
          <Link to="/" style={logoLinkStyle}>
            <h1 className="h4" style={logoStyle}>Retentive</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="desktop-nav" style={desktopNavStyle}>
            {navLinks}
          </div>
        </nav>

        {/* Right side: Actions */}
        <div style={actionsStyle}>
          {user ? (
            <>
              {/* These show on desktop, hidden on mobile */}
              <div className="desktop-only" style={desktopActionsStyle}>
                <FocusSessionIndicator />
                <GamificationStats />
              </div>

              {/* Quick Reminders Button - always visible */}
              <div style={reminderWrapperStyle}>
                <button
                  onClick={toggleReminders}
                  style={bellBtnStyle}
                  aria-label="Quick reminders"
                  title="Quick reminders"
                >
                  <Bell size={20} />
                  {reminderCount > 0 && (
                    <span style={badgeStyle}>
                      {reminderCount > 99 ? '99+' : reminderCount}
                    </span>
                  )}
                </button>

                <QuickRemindersPopup
                  isOpen={showReminders}
                  onClose={closeReminders}
                  onCountChange={setReminderCount}
                />
              </div>

              {/* Desktop: Show user info and sign out */}
              <div className="desktop-only" style={desktopActionsStyle}>
                <span className="body-small text-secondary" style={userEmailStyle}>
                  {user.user_metadata?.display_name || user.email}
                </span>
                <Button variant="ghost" size="small" onClick={signOut}>
                  Sign Out
                </Button>
              </div>

              {/* Mobile: Hamburger Menu */}
              <button
                className="mobile-menu-btn"
                onClick={toggleMobileMenu}
                style={hamburgerStyle}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </>
          ) : (
            pathname !== '/login' && (
              <Link to="/login">
                <Button variant="primary" size="small">Sign In</Button>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && user && (
        <div className="mobile-menu" style={mobileMenuStyle}>
          <div style={mobileMenuInnerStyle}>
            {navLinks}
            <div style={mobileDividerStyle}>
              <div style={mobileStatsRowStyle}>
                <FocusSessionIndicator />
                <GamificationStats />
              </div>
              <div style={mobileUserRowStyle}>
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
      <style>{RESPONSIVE_CSS}</style>
    </header>
  )
}
