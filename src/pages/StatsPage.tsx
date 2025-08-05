import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { getExtendedStats } from '../services/statsService'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ReviewSession {
  id: string
  reviewed_at: string
  difficulty: string
  interval_days: number
  learning_item: {
    content: string
    topic: {
      name: string
    }
  }
}

interface TopicStats {
  topic_id: string
  topic_name: string
  total_items: number
  reviewed_items: number
  average_ease: number
  completion_rate: number
}

interface DailyActivity {
  date: string
  reviews: number
}


export function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [formattedSessions, setFormattedSessions] = useState<ReviewSession[]>([])
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [dateRange, setDateRange] = useState('week')
  const [loading, setLoading] = useState(true)
  const [streakWarning, setStreakWarning] = useState<{ show: boolean; hoursLeft: number }>({ show: false, hoursLeft: 0 })

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user, dateRange])

  const loadStats = async () => {
    if (!user) return
    
    setLoading(true)
    
    try {
      // Get extended stats
      const extendedStats = await getExtendedStats(user.id)
      setStats(extendedStats)
      
      // Get recent review sessions
      const startDate = new Date()
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (dateRange === 'all') {
        startDate.setFullYear(2020) // Far back enough
      }
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('review_sessions')
        .select(`
          id,
          reviewed_at,
          difficulty,
          interval_days,
          learning_item_id
        `)
        .eq('user_id', user.id)
        .gte('reviewed_at', startDate.toISOString())
        .order('reviewed_at', { ascending: false })
        .limit(50)
      
      if (sessionsError) {
        console.error('Error fetching review sessions:', sessionsError)
      }
      
      console.log('Fetched sessions:', sessions?.length || 0, 'sessions')
      
      // Now fetch the learning items and topics data separately
      let formattedSessionsData: ReviewSession[] = []
      if (sessions && sessions.length > 0) {
        // Get all unique learning item IDs
        const itemIds = [...new Set(sessions.map(s => s.learning_item_id))]
        
        // Fetch learning items with their topics
        const { data: items } = await supabase
          .from('learning_items')
          .select(`
            id,
            content,
            topic_id
          `)
          .in('id', itemIds)
        
        // Get all unique topic IDs
        const topicIds = items ? [...new Set(items.map(i => i.topic_id))] : []
        
        // Fetch topics
        const { data: topics } = await supabase
          .from('topics')
          .select('id, name')
          .in('id', topicIds)
        
        // Create maps for quick lookup
        const topicsMap = new Map(topics?.map(t => [t.id, t]) || [])
        const itemsMap = new Map(items?.map(i => [i.id, { ...i, topic: topicsMap.get(i.topic_id) }]) || [])
        
        // Format sessions with joined data
        formattedSessionsData = sessions.map((session: any) => {
          const item = itemsMap.get(session.learning_item_id)
          return {
            id: session.id,
            reviewed_at: session.reviewed_at,
            difficulty: session.difficulty,
            interval_days: session.interval_days,
            learning_item: {
              content: item?.content || '',
              topic: {
                name: item?.topic?.name || ''
              }
            }
          }
        })
      }
      
      setFormattedSessions(formattedSessionsData)
      console.log('Formatted sessions:', formattedSessionsData.length, 'sessions')
      
      // Process daily activity data
      const activityMap = new Map<string, number>()
      const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365
      
      // Initialize all days with 0
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        activityMap.set(dateStr, 0)
      }
      
      // Count reviews per day using formattedSessionsData
      formattedSessionsData.forEach(session => {
        const dateStr = session.reviewed_at.split('T')[0]
        activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1)
      })
      
      // Convert to array and sort by date
      const activityData = Array.from(activityMap.entries())
        .map(([date, reviews]) => ({ date, reviews }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7) // Show last 7 days for better visualization
      
      setDailyActivity(activityData)
      
      // Check if streak is about to end
      if (extendedStats.streakDays > 0) {
        // Get today's sessions to check if user has reviewed today
        const today = new Date()
        const todayStr = today.toDateString()
        const todayReviews = formattedSessionsData.filter(s => 
          new Date(s.reviewed_at).toDateString() === todayStr
        )
        
        // If no reviews today, check how much time is left
        if (todayReviews.length === 0) {
          // Calculate hours until midnight (when streak ends)
          const midnight = new Date(today)
          midnight.setHours(24, 0, 0, 0)
          const hoursUntilMidnight = Math.floor((midnight.getTime() - today.getTime()) / (1000 * 60 * 60))
          
          if (hoursUntilMidnight <= 4) {
            setStreakWarning({ show: true, hoursLeft: hoursUntilMidnight })
          } else {
            setStreakWarning({ show: false, hoursLeft: 0 })
          }
        } else {
          setStreakWarning({ show: false, hoursLeft: 0 })
        }
      }
      
      // Get topic-level statistics
      const { data: topics } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          learning_items (
            id,
            review_count,
            ease_factor
          )
        `)
        .eq('user_id', user.id)
      
      const topicStatsData = (topics || []).map(topic => {
        const items = topic.learning_items || []
        const reviewedItems = items.filter((item: any) => item.review_count > 0)
        const avgEase = reviewedItems.length > 0
          ? reviewedItems.reduce((sum: number, item: any) => sum + item.ease_factor, 0) / reviewedItems.length
          : 2.5
        
        return {
          topic_id: topic.id,
          topic_name: topic.name,
          total_items: items.length,
          reviewed_items: reviewedItems.length,
          average_ease: avgEase,
          completion_rate: items.length > 0 ? (reviewedItems.length / items.length) * 100 : 0
        }
      })
      
      setTopicStats(topicStatsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDifficulty = (difficulty: string) => {
    const colors = {
      again: 'var(--color-error)',
      hard: 'var(--color-warning)',
      good: 'var(--color-success)',
      easy: 'var(--color-info)'
    }
    return colors[difficulty as keyof typeof colors] || 'var(--color-gray-600)'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading statistics...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">Study Statistics</h1>
        <p className="body text-secondary">
          Track your learning progress and performance
        </p>
      </header>

      {/* Date Range Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setDateRange('week')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'week' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: dateRange === 'week' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: dateRange === 'week' ? '600' : '400'
            }}
          >
            Last Week
          </button>
          <button
            onClick={() => setDateRange('month')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'month' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: dateRange === 'month' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: dateRange === 'month' ? '600' : '400'
            }}
          >
            Last Month
          </button>
          <button
            onClick={() => setDateRange('all')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'all' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: dateRange === 'all' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: dateRange === 'all' ? '600' : '400'
            }}
          >
            All Time
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2">{formattedSessions.length}</p>
                <p className="body-small text-secondary">Reviews ({dateRange})</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <p className="h2">{stats?.streakDays || 0}</p>
                <p className="body-small text-secondary">Day Streak</p>
                {streakWarning.show && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    backgroundColor: 'var(--color-warning)',
                    color: 'white',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.25rem 0.5rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {streakWarning.hoursLeft}h left!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <p className="h2">{stats?.mastered || 0}</p>
                <p className="body-small text-secondary">Mastered</p>
                <div 
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gray-200)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--color-gray-600)'
                  }}
                  title="Items are mastered after 5 successful reviews"
                >
                  i
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2">
                  {topicStats.length > 0 
                    ? Math.round(topicStats.reduce((sum, t) => sum + t.completion_rate, 0) / topicStats.length)
                    : 0}%
                </p>
                <p className="body-small text-secondary">Avg Completion</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Daily Activity Chart - Full Width */}
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4">Daily Activity</h3>
            </CardHeader>
            <CardContent>
              {dailyActivity.length === 0 ? (
                <p className="body text-secondary">No activity data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      formatter={(value: number) => [`${value} reviews`, 'Reviews']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reviews" 
                      stroke="var(--color-primary)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-primary)', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Additional Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Learning Velocity */}
            <Card variant="bordered">
              <CardHeader>
                <h3 className="h4">Learning Velocity</h3>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Avg Reviews/Day</span>
                    <span className="h4">
                      {dailyActivity.length > 0 && dailyActivity.some(d => d.reviews > 0)
                        ? (dailyActivity.reduce((sum, d) => sum + d.reviews, 0) / dailyActivity.filter(d => d.reviews > 0).length).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">This {dateRange === 'week' ? 'Week' : dateRange === 'month' ? 'Month' : 'Period'}</span>
                    <span className="h4">{formattedSessions.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Peak Day</span>
                    <span className="h4">
                      {dailyActivity.length > 0 && dailyActivity.some(d => d.reviews > 0)
                        ? Math.max(...dailyActivity.map(d => d.reviews))
                        : '0'} reviews
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Study Time Distribution */}
            <Card variant="bordered">
              <CardHeader>
                <h3 className="h4">Study Patterns</h3>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Active Topics</span>
                    <span className="h4">{topicStats.filter(t => t.reviewed_items > 0).length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Items/Topic</span>
                    <span className="h4">
                      {topicStats.length > 0 
                        ? Math.round(topicStats.reduce((sum, t) => sum + t.total_items, 0) / topicStats.length)
                        : 0}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Retention Rate</span>
                    <span className="h4" style={{ color: 'var(--color-success)' }}>
                      {stats?.mastered && stats?.totalItems 
                        ? Math.round((stats.mastered / stats.totalItems) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Topic Performance */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Topic Performance</h3>
          </CardHeader>
          <CardContent>
            {topicStats.length === 0 ? (
              <p className="body text-secondary">No topics yet</p>
            ) : (
              <>
                {/* Bar Chart for Topic Completion */}
                <div style={{ marginBottom: '2rem' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topicStats.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                      <XAxis 
                        dataKey="topic_name" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--color-surface)', 
                          border: '1px solid var(--color-gray-200)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        formatter={(value: number) => `${Math.round(value)}%`}
                      />
                      <Bar dataKey="completion_rate" fill="var(--color-primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                {topicStats.map(topic => (
                  <div 
                    key={topic.topic_id}
                    style={{ 
                      padding: '1rem',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 className="body" style={{ fontWeight: '600' }}>{topic.topic_name}</h4>
                      <Badge variant="ghost">
                        {topic.reviewed_items}/{topic.total_items} reviewed
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div>
                        <p className="body-small text-secondary">Completion</p>
                        <p className="body">{Math.round(topic.completion_rate)}%</p>
                      </div>
                      <div>
                        <p className="body-small text-secondary">Avg Difficulty</p>
                        <p className="body">{topic.average_ease.toFixed(1)}</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ 
                      marginTop: '0.5rem',
                      height: '4px',
                      backgroundColor: 'var(--color-gray-200)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${topic.completion_rate}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-success)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Recent Activity</h3>
          </CardHeader>
          <CardContent>
            {formattedSessions.length === 0 ? (
              <p className="body text-secondary">No recent reviews</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {formattedSessions.slice(0, 10).map(session => (
                  <div 
                    key={session.id}
                    style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p className="body-small" style={{ marginBottom: '0.25rem' }}>
                        {session.learning_item.content}
                      </p>
                      <p className="body-small text-secondary">
                        {session.learning_item.topic.name} • {formatDate(session.reviewed_at)}
                      </p>
                    </div>
                    <div style={{ 
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: formatDifficulty(session.difficulty)
                    }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions for additional stats */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">📊 Additional Stats Ideas</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)' }}>
                <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Study Time Heatmap</h4>
                <p className="body-small text-secondary">Visualize your most productive study hours and days of the week to optimize your learning schedule.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)' }}>
                <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Memory Retention Curve</h4>
                <p className="body-small text-secondary">Track how well you retain information over time based on review intervals and performance.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)' }}>
                <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Knowledge Growth Timeline</h4>
                <p className="body-small text-secondary">See your learning journey with milestones for topics mastered and total items learned.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)' }}>
                <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Difficulty Progression</h4>
                <p className="body-small text-secondary">Monitor how item difficulty changes over time as you improve.</p>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-sm)' }}>
                <h4 className="body" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Focus Score</h4>
                <p className="body-small text-secondary">Measure consistency and depth of study sessions to identify optimal learning patterns.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}