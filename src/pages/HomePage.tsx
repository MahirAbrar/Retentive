import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent, Badge, Skeleton } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { getExtendedStats } from '../services/statsService'
import type { Priority } from '../types/database'
import {
  Target,
  Clock,
  Zap,
  GraduationCap,
  FlaskConical,
  Timer,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { LEARNING_MODE_EXAMPLES } from '../utils/learningScience'
import { FocusTimer } from '../components/focus/FocusTimer'

// Lazy load heavy component for better initial load performance
const GamificationDashboard = lazy(() =>
  import('../components/gamification/GamificationDashboard').then((m) => ({
    default: m.GamificationDashboard,
  }))
)

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
    newItemsCount: 0,
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
        <h1 className="h1" style={{ marginBottom: '1rem' }}>
          Retentive
        </h1>
        <p className="body-large text-secondary">Master anything with spaced repetition learning</p>
      </header>

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '3rem' }}>
        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
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
                    <p className="h2" style={{ color: 'var(--color-error)' }}>
                      {stats.overdue}
                    </p>
                    <p className="body-small text-secondary">Overdue</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-warning)' }}>
                      {stats.dueToday}
                    </p>
                    <p className="body-small text-secondary">Due Today</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-info)' }}>
                      {stats.upcoming}
                    </p>
                    <p className="body-small text-secondary">Upcoming</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <div style={{ textAlign: 'center' }}>
                    <p className="h2" style={{ color: 'var(--color-success)' }}>
                      {stats.mastered}
                    </p>
                    <p className="body-small text-secondary">Mastered</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Review Status Cards */}
        {user && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {loading ? (
              // Skeleton loaders for review status
              <>
                <Card variant="bordered">
                  <CardContent>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p className="body-small text-secondary">Next Review Due In</p>
                        <p
                          className="h3"
                          style={{
                            color:
                              stats.nextDueIn === 'Now'
                                ? 'var(--color-error)'
                                : 'var(--color-primary)',
                          }}
                        >
                          {stats.nextDueIn || 'No items scheduled'}
                        </p>
                      </div>
                      {stats.nextDueIn === 'Now' && (
                        <Link to="/topics">
                          <Button variant="primary" size="small">
                            Review Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered">
                  <CardContent>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p className="body-small text-secondary">New Items to Learn</p>
                        <p className="h3" style={{ color: 'var(--color-info)' }}>
                          {stats.newItemsCount}
                        </p>
                      </div>
                      {stats.newItemsCount > 0 && (
                        <Link to="/topics">
                          <Button variant="secondary" size="small">
                            Start Learning
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Focus Timer */}
        {user && <FocusTimer />}

        {/* Gamification Dashboard */}
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
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
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
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="body">Total Topics</span>
                        <span className="h4">{stats.totalTopics}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="body">Total Items</span>
                        <span className="h4">{stats.totalItems}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span className="body">Study Streak</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            className="h4"
                            style={{
                              color:
                                stats.streakDays >= 30
                                  ? 'var(--color-success)'
                                  : stats.streakDays >= 7
                                    ? 'var(--color-warning)'
                                    : 'inherit',
                            }}
                          >
                            {stats.streakDays}
                          </span>
                          <span className="body-small text-secondary">days</span>
                          {stats.streakDays >= 30 && <span title="30+ day streak!">🔥</span>}
                          {stats.streakDays >= 7 && stats.streakDays < 30 && (
                            <span title="7+ day streak!">⭐</span>
                          )}
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
                        <div
                          key={priority.priority}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem',
                            backgroundColor: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge
                              variant={
                                priority.priority >= 4
                                  ? 'error'
                                  : priority.priority === 3
                                    ? 'warning'
                                    : priority.priority === 2
                                      ? 'info'
                                      : 'ghost'
                              }
                            >
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
            {isGuideExpanded && (
              <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Learning Science Sections */}
                <section style={{ marginTop: '3rem' }}>
                  <h3
                    className="h3"
                    style={{
                      marginBottom: '2rem',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <FlaskConical size={24} />
                    The Science of Learning Modes
                  </h3>
                  <p
                    className="body"
                    style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}
                  >
                    Understanding the cognitive research behind our spaced repetition system
                  </p>

                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Ultra-Cram Mode */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <Zap size={20} color="var(--color-error)" />
                        <h4 className="h4" style={{ color: 'var(--color-error)' }}>
                          Ultra-Cram Mode
                        </h4>
                      </div>
                      <p className="body" style={{ marginBottom: '1rem' }}>
                        {LEARNING_MODE_EXAMPLES.ultracram.description}
                      </p>
                      <p
                        className="body-small"
                        style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
                      >
                        <strong>Example:</strong> {LEARNING_MODE_EXAMPLES.ultracram.example}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {LEARNING_MODE_EXAMPLES.ultracram.idealFor.map((use, i) => (
                          <span
                            key={i}
                            className="caption"
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--color-error-light)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-error)',
                            }}
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cram Mode */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <Clock size={20} color="var(--color-warning)" />
                        <h4 className="h4" style={{ color: 'var(--color-warning)' }}>
                          Cram Mode
                        </h4>
                      </div>
                      <p className="body" style={{ marginBottom: '1rem' }}>
                        {LEARNING_MODE_EXAMPLES.cram.description}
                      </p>
                      <p
                        className="body-small"
                        style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
                      >
                        <strong>Example:</strong> {LEARNING_MODE_EXAMPLES.cram.example}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {LEARNING_MODE_EXAMPLES.cram.idealFor.map((use, i) => (
                          <span
                            key={i}
                            className="caption"
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--color-warning-light)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-warning)',
                            }}
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Steady Mode */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <Target size={20} color="var(--color-success)" />
                        <h4 className="h4" style={{ color: 'var(--color-success)' }}>
                          Steady Mode
                        </h4>
                      </div>
                      <p className="body" style={{ marginBottom: '1rem' }}>
                        {LEARNING_MODE_EXAMPLES.steady.description}
                      </p>
                      <p
                        className="body-small"
                        style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
                      >
                        <strong>Example:</strong> {LEARNING_MODE_EXAMPLES.steady.example}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {LEARNING_MODE_EXAMPLES.steady.idealFor.map((use, i) => (
                          <span
                            key={i}
                            className="caption"
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--color-success-light)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-success)',
                            }}
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Extended Mode */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <GraduationCap size={20} color="var(--color-info)" />
                        <h4 className="h4" style={{ color: 'var(--color-info)' }}>
                          Extended Mode
                        </h4>
                      </div>
                      <p className="body" style={{ marginBottom: '1rem' }}>
                        {LEARNING_MODE_EXAMPLES.extended.description}
                      </p>
                      <p
                        className="body-small"
                        style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
                      >
                        <strong>Example:</strong> {LEARNING_MODE_EXAMPLES.extended.example}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {LEARNING_MODE_EXAMPLES.extended.idealFor.map((use, i) => (
                          <span
                            key={i}
                            className="caption"
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--color-info-light)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-info)',
                            }}
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Science Behind Content Recommendations */}
                <section style={{ marginTop: '3rem' }}>
                  <h3
                    className="h3"
                    style={{
                      marginBottom: '2rem',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <BrainCircuit size={24} />
                    The Science Behind Our Content Recommendations
                  </h3>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '1.5rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4
                        className="h4"
                        style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}
                      >
                        Cognitive Processing Limits
                      </h4>
                      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>
                        Research shows we can only actively process 3-5 meaningful units at once.
                        Each sentence contains 1-2 key ideas, so 4-8 sentences hits the sweet spot
                        of our working memory&rsquo;s processing capacity.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4
                        className="h4"
                        style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}
                      >
                        The 20-Second Rule
                      </h4>
                      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>
                        Most people can read and process 4-8 sentences in about 20-30 seconds, which
                        aligns with working memory&rsquo;s time limits before information starts degrading
                        without rehearsal.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4
                        className="h4"
                        style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}
                      >
                        Rapid Review Optimization
                      </h4>
                      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>
                        Ultra-Cram and Cram modes use shorter chunks (4-6 sentences) to prevent
                        cognitive overload during frequent reviews. When seeing material multiple
                        times per day, each exposure must be digestible.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4
                        className="h4"
                        style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}
                      >
                        Long-Term Retention
                      </h4>
                      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>
                        Steady mode&rsquo;s 5-8 sentence range matches research on optimal chunk sizes for
                        long-term retention. Extended mode allows 7-10 sentences with more context,
                        as longer gaps between reviews allow deeper processing.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Why Study Session Limits Matter */}
                <section style={{ marginTop: '3rem' }}>
                  <h3
                    className="h3"
                    style={{
                      marginBottom: '2rem',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Timer size={24} />
                    Why Study Session Limits Matter
                  </h3>

                  <div style={{ display: 'grid', gap: '2rem' }}>
                    {/* The 30-Minute Wall */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-warning-light)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4 className="h4" style={{ marginBottom: '0.75rem' }}>
                        The 30-Minute Wall
                      </h4>
                      <p className="body" style={{ marginBottom: '0.5rem' }}>
                        Research consistently shows cognitive performance degrades sharply after
                        25-30 minutes of focused learning. Your encoding efficiency drops by about
                        40% after this point.
                      </p>
                    </div>

                    {/* Working Memory Saturation */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-info-light)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4 className="h4" style={{ marginBottom: '0.75rem' }}>
                        Working Memory Saturation
                      </h4>
                      <p className="body" style={{ marginBottom: '0.5rem' }}>
                        Your brain can actively process 4±1 chunks simultaneously. Once you hit 5-6
                        chunks, earlier material starts getting pushed out before it&rsquo;s properly
                        encoded to long-term memory.
                      </p>
                    </div>

                    {/* The Spacing Paradox */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-success-light)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4 className="h4" style={{ marginBottom: '0.75rem' }}>
                        The Spacing Paradox
                      </h4>
                      <p className="body" style={{ marginBottom: '0.5rem' }}>
                        Three focused 20-minute sessions outperform one exhausting 60-minute
                        marathon by about 74% for long-term retention. Less is literally more when
                        spaced properly.
                      </p>
                    </div>

                    {/* Mode-Specific Session Design */}
                    <div
                      style={{
                        padding: '1.5rem',
                        backgroundColor: 'var(--color-gray-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <h4
                        className="h4"
                        style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}
                      >
                        Mode-Specific Session Design
                      </h4>

                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-error)',
                              }}
                             />
                            <strong className="body-small">Ultra-Cram/Cram:</strong>
                          </div>
                          <p
                            className="body-small"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            Shorter sessions (3-4 chunks) since you&rsquo;ll have multiple reviews per
                            day. Prevents burnout while maintaining high frequency.
                          </p>
                        </div>

                        <div
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-success)',
                              }}
                             />
                            <strong className="body-small">Steady:</strong>
                          </div>
                          <p
                            className="body-small"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            The optimal 4-6 chunks matches the research sweet spot for sustained
                            daily practice without cognitive fatigue.
                          </p>
                        </div>

                        <div
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-info)',
                              }}
                             />
                            <strong className="body-small">Extended:</strong>
                          </div>
                          <p
                            className="body-small"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            Can push to 5-7 chunks since you have days to consolidate between
                            sessions, allowing for deeper processing.
                          </p>
                        </div>

                        <div
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--color-gray-100)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <Activity size={16} />
                            <strong className="body-small">Break Requirements:</strong>
                          </div>
                          <p
                            className="body-small"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            5-10 min breaks for sessions under 25 min, 10-15 min for 30+ min
                            sessions. This resets working memory and prevents interference.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Call to Action */}
                <div
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <p className="body" style={{ marginBottom: '1rem', fontWeight: '500' }}>
                    Ready to supercharge your learning?
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
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
            )}
            {!isGuideExpanded && (
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
