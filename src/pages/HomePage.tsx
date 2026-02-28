import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { Card, CardContent, Skeleton } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { getExtendedStats } from '../services/statsService'
import { QuickStats } from '../components/home/QuickStats'
import { ReviewStatusCards } from '../components/home/ReviewStatusCards'
import { StudyProgress } from '../components/home/StudyProgress'
import { LastStudiedBanner } from '../components/home/LastStudiedBanner'
import { GettingStartedGuide } from '../components/home/GettingStartedGuide'

const GamificationDashboard = lazy(() =>
  import('../components/gamification/GamificationDashboard').then((m) => ({
    default: m.GamificationDashboard,
  }))
)

const FocusTimer = lazy(() =>
  import('../components/focus/FocusTimer').then((m) => ({
    default: m.FocusTimer,
  }))
)

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

export function HomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isGuideExpanded, setIsGuideExpanded] = useState(!user)
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    mastered: 0,
    totalItems: 0,
    totalTopics: 0,
    streakDays: 0,
    nextDueIn: null as string | null,
    newItemsCount: 0,
    lastStudiedAt: null as string | null,
    reviewedToday: 0,
  })

  const loadStats = useCallback(async () => {
    if (user) {
      setLoading(true)
      try {
        const newStats = await getExtendedStats(user.id)
        setStats(newStats)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const totalDueItems = useMemo(() => stats.overdue + stats.dueToday, [stats.overdue, stats.dueToday])

  const lastStudiedOver24h = useMemo(() => {
    if (!stats.lastStudiedAt) return true
    const hoursSince = (Date.now() - new Date(stats.lastStudiedAt).getTime()) / (1000 * 60 * 60)
    return hoursSince > 24
  }, [stats.lastStudiedAt])

  const lastStudiedText = stats.lastStudiedAt ? formatRelativeTime(stats.lastStudiedAt) : 'Never'

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="h1" style={{ marginBottom: '1rem' }}>
          Retentive
        </h1>
        <p className="body-large text-secondary">Master anything with spaced repetition learning</p>
      </header>

      {user && !loading && lastStudiedOver24h && (
        <LastStudiedBanner lastStudiedText={lastStudiedText} />
      )}

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <QuickStats
            loading={loading}
            overdue={stats.overdue}
            dueToday={stats.dueToday}
            upcoming={stats.upcoming}
            mastered={stats.mastered}
            reviewedToday={stats.reviewedToday}
          />
        </div>

        {user && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <ReviewStatusCards
              loading={loading}
              nextDueIn={stats.nextDueIn}
              newItemsCount={stats.newItemsCount}
            />
          </div>
        )}

        {user && (
          <Suspense fallback={<Skeleton style={{ height: '200px', borderRadius: '8px' }} />}>
            <FocusTimer />
          </Suspense>
        )}

        {user && (
          <Suspense
            fallback={
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p className="body text-secondary">Loading achievements...</p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            <GamificationDashboard />
          </Suspense>
        )}

        {user && (
          <StudyProgress
            loading={loading}
            totalTopics={stats.totalTopics}
            totalItems={stats.totalItems}
            streakDays={stats.streakDays}
            lastStudiedText={lastStudiedText}
            showLastStudied={!lastStudiedOver24h}
          />
        )}

        <GettingStartedGuide
          isLoggedIn={!!user}
          totalDueItems={totalDueItems}
          isExpanded={isGuideExpanded}
          onToggle={() => setIsGuideExpanded(!isGuideExpanded)}
        />
      </div>

      <footer style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p className="body-small text-secondary">
          Developed by{' '}
          <a
            href="https://mahirabrar.net"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-primary)',
            }}
          >
            Hamid Abrar Mahir
          </a>
        </p>
      </footer>
    </div>
  )
}
