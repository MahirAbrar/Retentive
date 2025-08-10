import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent, Badge, Skeleton } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { getExtendedStats } from '../services/statsService'
import { GamificationDashboard } from '../components/gamification/GamificationDashboard'
import type { Priority } from '../types/database'

interface PriorityStats {
  priority: Priority
  label: string
  total: number
  due: number
  percentage: number
}

export function HomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isGuideExpanded, setIsGuideExpanded] = useState(!user) // Expanded when not logged in, collapsed when logged in
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    mastered: 0,
    priorityBreakdown: [] as PriorityStats[],
    totalItems: 0,
    totalTopics: 0,
    streakDays: 0,
    nextDueIn: null as string | null,
    newItemsCount: 0
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

  // Memoize the total due items calculation
  const totalDueItems = useMemo(() => {
    return stats.overdue + stats.dueToday
  }, [stats.overdue, stats.dueToday])

  // Memoize the progress percentage (commented out as not currently used)
  // const progressPercentage = useMemo(() => {
  //   if (stats.totalItems === 0) return 0
  //   return Math.round((stats.mastered / stats.totalItems) * 100)
  // }, [stats.mastered, stats.totalItems])

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="h1" style={{ marginBottom: '1rem' }}>Retentive</h1>
        <p className="body-large text-secondary">
          Master anything with spaced repetition learning
        </p>
      </header>

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '3rem' }}>
        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {loading ? (
            // Skeleton loaders for stats
            ['error', 'warning', 'info', 'success'].map((_color, index) => (
              <Card key={index}>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <Skeleton width="60px" height="2.5rem" style={{ margin: '0 auto 0.5rem' }} />
                    <Skeleton width="80px" height="1rem" style={{ margin: '0 auto' }} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Actual stats
            <>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-error)' }}>{stats.overdue}</p>
                    <p className="body-small text-secondary">Overdue</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-warning)' }}>{stats.dueToday}</p>
                    <p className="body-small text-secondary">Due Today</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-info)' }}>{stats.upcoming}</p>
                    <p className="body-small text-secondary">Upcoming</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-success)' }}>{stats.mastered}</p>
                    <p className="body-small text-secondary">Mastered</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Review Status Cards */}
        {user && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {loading ? (
              // Skeleton loaders for review status
              <>
                <Card variant="bordered">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Skeleton width="120px" height="1rem" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="150px" height="1.75rem" />
                      </div>
                      <Skeleton width="80px" height="2rem" />
                    </div>
                  </CardContent>
                </Card>
                <Card variant="bordered">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Skeleton width="120px" height="1rem" style={{ marginBottom: '0.5rem' }} />
                        <Skeleton width="50px" height="1.75rem" />
                      </div>
                      <Skeleton width="100px" height="2rem" />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Actual review status cards
              <>
                <Card variant="bordered">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p className="body-small text-secondary">Next Review Due In</p>
                        <p className="h3" style={{ 
                          color: stats.nextDueIn === 'Now' ? 'var(--color-error)' : 'var(--color-primary)' 
                        }}>
                          {stats.nextDueIn || 'No items scheduled'}
                        </p>
                      </div>
                      {stats.nextDueIn === 'Now' && (
                        <Link to="/topics">
                          <Button variant="primary" size="small">Review Now</Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card variant="bordered">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p className="body-small text-secondary">New Items to Learn</p>
                        <p className="h3" style={{ color: 'var(--color-info)' }}>
                          {stats.newItemsCount}
                        </p>
                      </div>
                      {stats.newItemsCount > 0 && (
                        <Link to="/topics">
                          <Button variant="secondary" size="small">Start Learning</Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Gamification Dashboard */}
        {user && <GamificationDashboard />}

        {/* Study Progress */}
        {user && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {loading ? (
              // Skeleton loaders for study progress
              <>
                <Card variant="bordered">
                  <CardHeader>
                    <Skeleton width="120px" height="1.5rem" />
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Skeleton width="100px" height="1rem" />
                          <Skeleton width="40px" height="1.5rem" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card variant="bordered">
                  <CardHeader>
                    <Skeleton width="150px" height="1.5rem" />
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ 
                          padding: '0.5rem',
                          backgroundColor: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Skeleton width="60px" height="1.5rem" />
                            <Skeleton width="80px" height="0.875rem" />
                          </div>
                          <Skeleton width="30px" height="0.875rem" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Actual study progress cards
              <>
                <Card variant="bordered">
                  <CardHeader>
                    <h3 className="h4">Study Progress</h3>
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="body">Total Topics</span>
                        <span className="h4">{stats.totalTopics}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="body">Total Items</span>
                        <span className="h4">{stats.totalItems}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="body">Study Streak</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="h4" style={{ 
                            color: stats.streakDays >= 30 ? 'var(--color-success)' : 
                                   stats.streakDays >= 7 ? 'var(--color-warning)' : 
                                   'inherit' 
                          }}>
                            {stats.streakDays}
                          </span>
                          <span className="body-small text-secondary">days</span>
                          {stats.streakDays >= 30 && <span title="30+ day streak!">🔥</span>}
                          {stats.streakDays >= 7 && stats.streakDays < 30 && <span title="7+ day streak!">⭐</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered">
                  <CardHeader>
                    <h3 className="h4">Priority Breakdown</h3>
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {stats.priorityBreakdown.map((priority) => (
                        <div key={priority.priority} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.5rem',
                          backgroundColor: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge variant={
                              priority.priority >= 4 ? 'error' :
                              priority.priority === 3 ? 'warning' :
                              priority.priority === 2 ? 'info' : 'ghost'
                            }>
                              {priority.label}
                            </Badge>
                            <span className="body-small text-secondary">
                              {priority.due} of {priority.total} due
                            </span>
                          </div>
                          <span className="body-small" style={{ fontWeight: '600' }}>
                            {priority.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Getting Started Guide */}
        <Card variant="elevated">
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="h3">Getting Started</h2>
              <Button 
                variant="ghost" 
                size="small"
                onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                {isGuideExpanded ? '−' : '+'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isGuideExpanded ? (
              <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Why Use Retentive */}
                <section>
                  <h3 className="h4" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>🎯 Why Use Retentive?</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                      <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>📚 Scientifically Proven Learning</h4>
                      <p className="body-small text-secondary">
                        Retentive uses spaced repetition, a learning technique proven to increase retention by up to 200%. 
                        Instead of cramming, you review information at optimal intervals just before you're about to forget it.
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                      <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🧠 Multiple Learning Modes</h4>
                      <p className="body-small text-secondary">
                        Choose from Ultra-Cram (30 minutes), Standard Cram (4 hours), Extended Cram (1 day), or Steady mode (gradual learning). 
                        Each mode is optimized for different learning scenarios and time constraints.
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                      <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🏆 Gamification & Progress Tracking</h4>
                      <p className="body-small text-secondary">
                        Earn achievements, maintain streaks, and track your mastery progress. 
                        Turn learning into an engaging experience with rewards and visual progress indicators.
                      </p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
                      <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>💾 Works Offline</h4>
                      <p className="body-small text-secondary">
                        Study anywhere, anytime. Your data syncs automatically when you're back online. 
                        Perfect for commutes, flights, or anywhere without reliable internet.
                      </p>
                    </div>
                  </div>
                </section>

                {/* How to Use */}
                <section>
                  <h3 className="h4" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>📖 How to Use Retentive</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span className="h3" style={{ color: 'var(--color-primary)', minWidth: '2rem' }}>1</span>
                      <div>
                        <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Create Topics</h4>
                        <p className="body-small text-secondary">
                          Organize your learning by creating topics (e.g., "Spanish Vocabulary", "Medical Terms", "History Facts").
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span className="h3" style={{ color: 'var(--color-primary)', minWidth: '2rem' }}>2</span>
                      <div>
                        <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Add Subtopics</h4>
                        <p className="body-small text-secondary">
                          Break down topics into specific items to learn (e.g., individual words, concepts, or facts).
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span className="h3" style={{ color: 'var(--color-primary)', minWidth: '2rem' }}>3</span>
                      <div>
                        <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Choose Your Learning Mode</h4>
                        <p className="body-small text-secondary">
                          Select between different modes based on your timeline:
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            <li><strong>Ultra-Cram:</strong> Quick review (30 min intervals)</li>
                            <li><strong>Standard Cram:</strong> Exam prep (4 hour intervals)</li>
                            <li><strong>Extended Cram:</strong> Intensive study (1 day intervals)</li>
                            <li><strong>Steady:</strong> Long-term retention (gradually increasing intervals)</li>
                          </ul>
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span className="h3" style={{ color: 'var(--color-primary)', minWidth: '2rem' }}>4</span>
                      <div>
                        <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Review When Due</h4>
                        <p className="body-small text-secondary">
                          Items appear for review at scientifically optimal intervals. Rate your recall (Again/Hard/Good/Easy) to adjust future scheduling.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <span className="h3" style={{ color: 'var(--color-primary)', minWidth: '2rem' }}>5</span>
                      <div>
                        <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Master Your Knowledge</h4>
                        <p className="body-small text-secondary">
                          After 5 successful reviews, items are marked as "mastered" and won't appear again unless you reset them.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Best Practices */}
                <section>
                  <h3 className="h4" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>💡 Best Practices</h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-light)', borderRadius: 'var(--radius-sm)' }}>
                      <p className="body-small">
                        <strong>Daily Reviews:</strong> Spend 10-15 minutes daily reviewing due items for best retention.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-info-light)', borderRadius: 'var(--radius-sm)' }}>
                      <p className="body-small">
                        <strong>Be Honest:</strong> Rate your recall honestly - it helps the algorithm optimize your learning.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-warning-light)', borderRadius: 'var(--radius-sm)' }}>
                      <p className="body-small">
                        <strong>Start Small:</strong> Begin with 5-10 items per topic and gradually increase as you build the habit.
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-gray-100)', borderRadius: 'var(--radius-sm)' }}>
                      <p className="body-small">
                        <strong>Use Priorities:</strong> Set higher priorities (1-5) for important items to review them more frequently.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Call to Action */}
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: 'var(--color-primary-light)', 
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}>
                  <p className="body" style={{ marginBottom: '1rem', fontWeight: '500' }}>
                    Ready to supercharge your learning?
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {user ? (
                      <>
                        <Link to="/topics">
                          <Button variant="primary" size="large">
                            View Topics
                          </Button>
                        </Link>
                        <Link to="/topics/new">
                          <Button variant="secondary" size="large">
                            Create Your First Topic
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link to="/login">
                        <Button variant="primary" size="large">
                          Sign Up Free
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed view
              <div>
                <p className="body" style={{ marginBottom: '1.5rem' }}>
                  Master anything with scientifically-proven spaced repetition learning.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {user ? (
                    <>
                      {totalDueItems > 0 && (
                        <Link to="/topics">
                          <Button variant="primary" size="large">
                            Review {totalDueItems} Due Items
                          </Button>
                        </Link>
                      )}
                      <Link to="/topics/new">
                        <Button variant="secondary" size="large">
                          Add New Topic
                        </Button>
                      </Link>
                      <Link to="/topics">
                        <Button variant="ghost" size="large">
                          View All Topics
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to="/login">
                      <Button variant="primary" size="large">
                        Get Started
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Development Tools */}
        <Card>
          <CardHeader>
            <h3 className="h4">Development Tools</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/components">
                <Button variant="ghost">View Component Library</Button>
              </Link>
              <Link to="/test-gamification">
                <Button variant="ghost">Test Gamification</Button>
              </Link>
              <Button 
                variant="ghost"
                onClick={() => {
                  const newTheme = document.body.classList.contains('theme-dark') ? '' : 'theme-dark'
                  document.body.className = newTheme
                }}
              >
                Toggle Dark Mode (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
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
              borderBottom: '1px solid var(--color-primary)'
            }}
          >
            Hamid Abrar Mahir
          </a>
        </p>
      </footer>
    </div>
  )
}