import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent, Badge, Skeleton } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { getExtendedStats } from '../services/statsService'

export function HomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    mastered: 0,
    priorityBreakdown: [],
    totalItems: 0,
    totalTopics: 0,
    streakDays: 0,
    nextDueIn: null,
    newItemsCount: 0
  })

  useEffect(() => {
    if (user) {
      setLoading(true)
      getExtendedStats(user.id)
        .then(setStats)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

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
            ['error', 'warning', 'info', 'success'].map((color, index) => (
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
                              priority.priority === 'critical' ? 'error' :
                              priority.priority === 'high' ? 'warning' :
                              priority.priority === 'medium' ? 'info' : 'ghost'
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

        {/* Main Actions */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="h3">Get Started</h2>
          </CardHeader>
          <CardContent>
            <p className="body" style={{ marginBottom: '2rem' }}>
              Ready to start learning? Create your first topic and add items to study.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Link to="/topics">
                    <Button variant="primary" size="large">
                      View Topics
                    </Button>
                  </Link>
                  <Link to="/topics/new">
                    <Button variant="secondary" size="large">
                      Add New Topic
                    </Button>
                  </Link>
                  <Link to="/stats">
                    <Button variant="ghost" size="large">
                      View Statistics
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
          Built with Swiss design principles • Clean, minimal, functional
        </p>
      </footer>
    </div>
  )
}