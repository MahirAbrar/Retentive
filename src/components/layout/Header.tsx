import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { GamificationStats } from '../gamification/GamificationStats'
import { SyncStatus } from './SyncStatus'
import styles from './Header.module.css'

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="Retentive" className={styles.logoImage} />
        </Link>

        <nav className={styles.nav}>
          {user ? (
            <>
              <GamificationStats />
              <Link to="/topics">
                <Button variant="ghost">Topics</Button>
              </Link>
              <Link to="/study">
                <Button variant="ghost">Study</Button>
              </Link>
              <Link to="/stats">
                <Button variant="ghost">Statistics</Button>
              </Link>
              <div className={styles.separator} />
              <SyncStatus />
              <span className={styles.userEmail}>{user.email}</span>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/login">
                <Button variant="primary">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}