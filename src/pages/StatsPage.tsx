import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { getExtendedStats } from '../services/statsService'
import { LEARNING_MODES, PRIORITY_LABELS } from '../constants/learning'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

interface DifficultyDistribution {
  name: string
  value: number
  color: string
}

export function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [recentSessions, setRecentSessions] = useState<ReviewSession[]>([])
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [difficultyData, setDifficultyData] = useState<DifficultyDistribution[]>([])
  const [dateRange, setDateRange] = useState('week')
  const [loading, setLoading] = useState(true)

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
      
      const { data: sessions } = await supabase
        .from('review_sessions')
        .select(`
          id,
          reviewed_at,
          difficulty,
          interval_days,
          learning_item!inner (
            content,
            topic!inner (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('reviewed_at', startDate.toISOString())
        .order('reviewed_at', { ascending: false })
        .limit(50)
      
      setRecentSessions(sessions || [])
      
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
      
      // Count reviews per day
      (sessions || []).forEach(session => {
        const dateStr = session.reviewed_at.split('T')[0]
        activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1)
      })
      
      // Convert to array and sort by date
      const activityData = Array.from(activityMap.entries())
        .map(([date, reviews]) => ({ date, reviews }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7) // Show last 7 days for better visualization
      
      setDailyActivity(activityData)
      
      // Process difficulty distribution
      const difficultyCount = {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
      }
      
      ;(sessions || []).forEach(session => {
        if (session.difficulty in difficultyCount) {
          difficultyCount[session.difficulty as keyof typeof difficultyCount]++
        }
      })
      
      const diffData: DifficultyDistribution[] = [
        { name: 'Again', value: difficultyCount.again, color: 'var(--color-error)' },
        { name: 'Hard', value: difficultyCount.hard, color: 'var(--color-warning)' },
        { name: 'Good', value: difficultyCount.good, color: 'var(--color-success)' },
        { name: 'Easy', value: difficultyCount.easy, color: 'var(--color-info)' }
      ].filter(d => d.value > 0)
      
      setDifficultyData(diffData)
      
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
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'week' ? 'var(--color-primary)' : 'transparent',
              color: dateRange === 'week' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >
            Last Week
          </button>
          <button
            onClick={() => setDateRange('month')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'month' ? 'var(--color-primary)' : 'transparent',
              color: dateRange === 'month' ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >
            Last Month
          </button>
          <button
            onClick={() => setDateRange('all')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: dateRange === 'all' ? 'var(--color-primary)' : 'transparent',
              color: dateRange === 'all' ? 'white' : 'inherit',
              cursor: 'pointer'
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
                <p className="h2">{recentSessions.length}</p>
                <p className="body-small text-secondary">Reviews</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2">{stats?.streakDays || 0}</p>
                <p className="body-small text-secondary">Day Streak</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2">{stats?.mastered || 0}</p>
                <p className="body-small text-secondary">Mastered</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          {/* Daily Activity Chart */}
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

          {/* Difficulty Distribution Chart */}
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4">Difficulty Distribution</h3>
            </CardHeader>
            <CardContent>
              {difficultyData.length === 0 ? (
                <p className="body text-secondary">No review data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={difficultyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
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
            {recentSessions.length === 0 ? (
              <p className="body text-secondary">No recent reviews</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {recentSessions.slice(0, 10).map(session => (
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
      </div>
    </div>
  )
}