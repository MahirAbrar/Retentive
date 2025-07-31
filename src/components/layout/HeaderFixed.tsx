import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'

export function HeaderFixed() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  
  const isActive = (path: string) => location.pathname === path

  return (
    <header style={{ 
      borderBottom: '1px solid var(--color-gray-200)', 
      backgroundColor: 'var(--color-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 100
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
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="h4" style={{ margin: 0 }}>Retentive</h1>
          </Link>
          
          {user && (
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
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
                to="/study" 
                style={{ 
                  textDecoration: 'none',
                  color: isActive('/study') ? 'var(--color-primary)' : 'inherit'
                }}
              >
                <span className="body">Study</span>
              </Link>
            </div>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {user ? (
            <>
              <span className="body-small text-secondary">{user.email}</span>
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