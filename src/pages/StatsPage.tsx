import { logger } from '../utils/logger'
import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { getExtendedStats } from '../services/statsService'
import { cacheService } from '../services/cacheService'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, Timer, Edit2 } from 'lucide-react'
import { FocusAdherenceStats } from '../components/stats/FocusAdherenceStats'
import { focusTimerService, getAdherenceColor, type FocusSession } from '../services/focusTimerService'
import { EditSessionModal } from '../components/focus/EditSessionModal'

// Lazy load TimingPerformance for better initial load
const TimingPerformance = lazy(() => import('../components/stats/TimingPerformance').then(module => ({ default: module.TimingPerformance })))

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

interface FocusSessionDisplay {
  id: string
  type: 'focus'
  created_at: string
  total_work_minutes: number
  total_break_minutes: number
  goal_minutes: number
  adherence_percentage: number
  was_adjusted?: boolean
  adjustment_reason?: string | null
  adjusted_at?: string | null
}

interface ReviewSessionDisplay {
  id: string
  type: 'review'
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

type ActivityItem = FocusSessionDisplay | ReviewSessionDisplay

// Memoized chart components
const DailyActivityChart = memo(function DailyActivityChart({ data }: { data: DailyActivity[] }) {
  return (
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data}>
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
  )
})

const TopicCompletionChart = memo(function TopicCompletionChart({ data }: { data: TopicStats[] }) {
  return (
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={data.slice(0, 5)}>
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
  )
})

export function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [formattedSessions, setFormattedSessions] = useState<ReviewSession[]>([])
  const [combinedActivity, setCombinedActivity] = useState<ActivityItem[]>([])
  const [visibleSessions, setVisibleSessions] = useState(10) // Pagination for recent activity
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [dateRange, setDateRange] = useState('week')
  const [pendingDateRange, setPendingDateRange] = useState('week')
  const [_loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [streakWarning, setStreakWarning] = useState<{ show: boolean; hoursLeft: number }>({ show: false, hoursLeft: 0 })
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)

  const loadStats = useCallback(async () => {
    if (!user) return
    
    // Check cache first for instant loading
    const cacheKey = `stats-page:${user.id}:${dateRange}`
    const cached = cacheService.get<{
      sessions: ReviewSession[]
      topicStats: TopicStats[]
      dailyActivity: DailyActivity[]
    }>(cacheKey)
    
    if (cached) {
      setFormattedSessions(cached.sessions)
      setTopicStats(cached.topicStats)
      setDailyActivity(cached.dailyActivity)
      setSessionsLoading(false)
      setTopicsLoading(false)
    }
    
    // Set individual loading states
    setStatsLoading(true)
    if (!cached) {
      setSessionsLoading(true)
      setTopicsLoading(true)
    }
    setLoading(true)
    
    try {
      // Calculate date range once
      const startDate = new Date()
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (dateRange === 'all') {
        startDate.setFullYear(2020) // Far back enough
      }
      
      // Run all independent queries in parallel for better performance
      const [extendedStats, sessionsResult, focusSessionsResult, topicsResult, itemsResult] = await Promise.all([
        // Get extended stats
        getExtendedStats(user.id),

        // Get recent review sessions with joined data in single query
        supabase
          .from('review_sessions')
          .select(`
            id,
            reviewed_at,
            difficulty,
            interval_days,
            learning_items!inner (
              id,
              content,
              topics!inner (
                id,
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .gte('reviewed_at', startDate.toISOString())
          .order('reviewed_at', { ascending: false })
          .limit(100), // Increased limit but still bounded

        // Get recent focus sessions
        focusTimerService.getUserSessions(user.id, 50).catch(err => {
          logger.error('Error fetching focus sessions:', err)
          return []
        }),

        // Get topics for stats
        supabase
          .from('topics')
          .select('id, name')
          .eq('user_id', user.id),

        // Get all items with stats
        supabase
          .from('learning_items')
          .select('topic_id, review_count, ease_factor')
          .eq('user_id', user.id)
      ])
      
      // Set extended stats immediately for fast initial render
      setStats(extendedStats)
      setStatsLoading(false) // Stats cards can show now
      
      // Process sessions data (already joined with items and topics)
      let formattedSessionsData: ReviewSession[] = []
      if (!sessionsResult.error && sessionsResult.data) {
        formattedSessionsData = sessionsResult.data.map((session: any) => ({
          id: session.id,
          reviewed_at: session.reviewed_at,
          difficulty: session.difficulty,
          interval_days: session.interval_days,
          learning_item: {
            content: session.learning_items?.content || '',
            topic: {
              name: session.learning_items?.topics?.name || ''
            }
          }
        }))
      } else if (sessionsResult.error) {
        logger.error('Error fetching review sessions:', sessionsResult.error)
      }
      
      setFormattedSessions(formattedSessionsData)

      // Process focus sessions
      const focusSessionsData: FocusSessionDisplay[] = (focusSessionsResult || [])
        .filter(session => new Date(session.created_at) >= startDate)
        .map(session => ({
          id: session.id,
          type: 'focus' as const,
          created_at: session.created_at,
          total_work_minutes: session.total_work_minutes,
          total_break_minutes: session.total_break_minutes,
          goal_minutes: session.goal_minutes,
          adherence_percentage: session.adherence_percentage || 0,
          was_adjusted: session.was_adjusted,
          adjustment_reason: session.adjustment_reason,
          adjusted_at: session.adjusted_at,
        }))

      // Combine review sessions and focus sessions
      const reviewActivities: ReviewSessionDisplay[] = formattedSessionsData.map(s => ({
        ...s,
        type: 'review' as const
      }))

      const allActivity: ActivityItem[] = [...reviewActivities, ...focusSessionsData]
        .sort((a, b) => {
          const dateA = a.type === 'review' ? new Date(a.reviewed_at) : new Date(a.created_at)
          const dateB = b.type === 'review' ? new Date(b.reviewed_at) : new Date(b.created_at)
          return dateB.getTime() - dateA.getTime() // Descending order
        })

      setCombinedActivity(allActivity)
      setSessionsLoading(false) // Sessions section can show now

      // Process daily activity data more efficiently
      const activityMap = new Map<string, number>()
      const daysToShow = 7 // Always show 7 days in chart
      const daysToProcess = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : Math.min(formattedSessionsData.length, 90) // Limit processing
      
      // Initialize only needed days
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        activityMap.set(dateStr, 0)
      }
      
      // Count reviews per day (only process what we need)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToProcess)
      
      formattedSessionsData
        .filter(session => new Date(session.reviewed_at) >= cutoffDate)
        .forEach(session => {
          const dateStr = session.reviewed_at.split('T')[0]
          if (activityMap.has(dateStr)) {
            activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1)
          }
        })
      
      // Convert to array and sort by date
      const activityData = Array.from(activityMap.entries())
        .map(([date, reviews]) => ({ date, reviews }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
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
      
      // Process topic stats using already fetched data
      const itemsByTopic = new Map<string, any[]>()
      if (itemsResult.data) {
        for (const item of itemsResult.data) {
          if (!itemsByTopic.has(item.topic_id)) {
            itemsByTopic.set(item.topic_id, [])
          }
          const topicItems = itemsByTopic.get(item.topic_id)
          if (topicItems) {
            topicItems.push(item)
          }
        }
      }
      
      const topicStatsData = (topicsResult.data || []).map(topic => {
        const items = itemsByTopic.get(topic.id) || []
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
      setTopicsLoading(false) // Topic stats can show now
      
      // Cache the processed data for 2 minutes
      cacheService.set(cacheKey, {
        sessions: formattedSessionsData,
        topicStats: topicStatsData,
        dailyActivity: activityData
      }, 2 * 60 * 1000)
    } catch (error) {
      logger.error('Error loading stats:', error)
    } finally {
      setLoading(false)
      // Ensure all loading states are off
      setStatsLoading(false)
      setSessionsLoading(false)
      setTopicsLoading(false)
    }
  }, [user, dateRange])

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user, dateRange, loadStats])

  // Debounce date range changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingDateRange !== dateRange) {
        setDateRange(pendingDateRange)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [pendingDateRange, dateRange])

  // Handle session editing
  const handleEditSession = useCallback((session: FocusSessionDisplay) => {
    // Convert FocusSessionDisplay to FocusSession for the modal
    const fullSession: FocusSession = {
      id: session.id,
      user_id: user!.id,
      created_at: session.created_at,
      started_at: session.created_at,
      ended_at: session.created_at,
      goal_minutes: session.goal_minutes,
      total_work_minutes: session.total_work_minutes,
      total_break_minutes: session.total_break_minutes,
      adherence_percentage: session.adherence_percentage,
      productivity_percentage: session.adherence_percentage,
      is_active: false,
      updated_at: session.created_at,
      was_adjusted: session.was_adjusted,
      adjustment_reason: session.adjustment_reason,
      adjusted_at: session.adjusted_at,
    }
    setEditingSession(fullSession)
  }, [user])

  const handleSaveEdit = useCallback(async (
    sessionId: string,
    workMinutes: number,
    breakMinutes: number,
    reason: string
  ) => {
    if (!user) return

    try {
      await focusTimerService.updateSessionDuration(sessionId, user.id, {
        totalWorkMinutes: workMinutes,
        totalBreakMinutes: breakMinutes,
        adjustmentReason: reason,
      })

      // Refresh stats to show updated values
      await loadStats()
      setEditingSession(null)

      logger.info('Session updated successfully')
    } catch (error) {
      logger.error('Failed to update session:', error)
      throw error // Re-throw so modal can show error
    }
  }, [user, loadStats])

  const formatDifficulty = useCallback((difficulty: string) => {
    const colors = {
      again: 'var(--color-error)',
      hard: 'var(--color-warning)',
      good: 'var(--color-success)',
      easy: 'var(--color-info)'
    }
    return colors[difficulty as keyof typeof colors] || 'var(--color-gray-600)'
  }, [])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`
    return date.toLocaleDateString()
  }, [])

  // Memoized calculations
  const avgCompletion = useMemo(() => 
    topicStats.length > 0 
      ? Math.round(topicStats.reduce((sum, t) => sum + t.completion_rate, 0) / topicStats.length)
      : 0
  , [topicStats])

  const avgReviewsPerDay = useMemo(() => 
    dailyActivity.length > 0 && dailyActivity.some(d => d.reviews > 0)
      ? (dailyActivity.reduce((sum, d) => sum + d.reviews, 0) / dailyActivity.filter(d => d.reviews > 0).length).toFixed(1)
      : '0'
  , [dailyActivity])

  const peakDayReviews = useMemo(() => 
    dailyActivity.length > 0 && dailyActivity.some(d => d.reviews > 0)
      ? Math.max(...dailyActivity.map(d => d.reviews))
      : 0
  , [dailyActivity])

  const avgItemsPerTopic = useMemo(() => 
    topicStats.length > 0 
      ? Math.round(topicStats.reduce((sum, t) => sum + t.total_items, 0) / topicStats.length)
      : 0
  , [topicStats])

  // Show content progressively as it loads
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
            onClick={() => setPendingDateRange('week')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: pendingDateRange === 'week' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: pendingDateRange === 'week' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: pendingDateRange === 'week' ? '600' : '400'
            }}
          >
            Last Week
          </button>
          <button
            onClick={() => setPendingDateRange('month')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: pendingDateRange === 'month' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: pendingDateRange === 'month' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: pendingDateRange === 'month' ? '600' : '400'
            }}
          >
            Last Month
          </button>
          <button
            onClick={() => setPendingDateRange('all')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: pendingDateRange === 'all' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: pendingDateRange === 'all' ? 'var(--color-secondary)' : 'var(--color-text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: pendingDateRange === 'all' ? '600' : '400'
            }}
          >
            All Time
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Summary Stats - Show immediately with skeleton if loading */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                {sessionsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{formattedSessions.length}</p>
                    <p className="body-small text-secondary">Reviews ({dateRange})</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                {statsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{stats?.streakDays || 0}</p>
                    <p className="body-small text-secondary">Day Streak</p>
                  </>
                )}
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
                {statsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{stats?.mastered || 0}</p>
                    <p className="body-small text-secondary">Mastered</p>
                  </>
                )}
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
                {topicsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{avgCompletion}%</p>
                    <p className="body-small text-secondary">Avg Completion</p>
                  </>
                )}
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
                <DailyActivityChart data={dailyActivity} />
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
                    <span className="h4">{avgReviewsPerDay}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">This {dateRange === 'week' ? 'Week' : dateRange === 'month' ? 'Month' : 'Period'}</span>
                    <span className="h4">{formattedSessions.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="body">Peak Day</span>
                    <span className="h4">{peakDayReviews} reviews</span>
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
                    <span className="h4">{avgItemsPerTopic}</span>
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
                  <TopicCompletionChart data={topicStats} />
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
            {combinedActivity.length === 0 ? (
              <p className="body text-secondary">No recent activity</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {combinedActivity.slice(0, visibleSessions).map(item => {
                  if (item.type === 'review') {
                    // Review session card
                    return (
                      <div
                        key={item.id}
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
                            {item.learning_item.content}
                          </p>
                          <p className="body-small text-secondary">
                            {item.learning_item.topic.name} • {formatDate(item.reviewed_at)}
                          </p>
                        </div>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: formatDifficulty(item.difficulty)
                        }} />
                      </div>
                    )
                  } else {
                    // Focus session card
                    const adherenceColor = getAdherenceColor(item.adherence_percentage)
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: adherenceColor.color + '10',
                          borderLeft: `3px solid ${adherenceColor.color}`,
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Timer size={14} color={adherenceColor.color} />
                            <p className="body-small" style={{ fontWeight: '600' }}>
                              Focus Session
                            </p>
                            {item.was_adjusted && (
                              <span
                                className="caption"
                                style={{
                                  padding: '0.125rem 0.375rem',
                                  backgroundColor: 'var(--color-info-light)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--color-info)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title={`Adjusted: ${item.adjustment_reason || 'No reason provided'}`}
                              >
                                <Edit2 size={10} /> Edited
                              </span>
                            )}
                          </div>
                          <p className="body-small text-secondary">
                            {item.total_work_minutes}m work / {item.goal_minutes}m goal • {formatDate(item.created_at)}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: adherenceColor.color,
                            borderRadius: 'var(--radius-sm)',
                            color: 'white'
                          }}>
                            <span className="caption" style={{ fontWeight: '600' }}>
                              {Math.round(item.adherence_percentage)}%
                            </span>
                            <span style={{ fontSize: '0.875rem' }}>{adherenceColor.emoji}</span>
                          </div>
                          <button
                            onClick={() => handleEditSession(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                            title="Edit session duration"
                            aria-label="Edit session"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  }
                })}
                {combinedActivity.length > visibleSessions && (
                  <button
                    onClick={() => setVisibleSessions(prev => Math.min(prev + 10, combinedActivity.length))}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Show More ({combinedActivity.length - visibleSessions} remaining)
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timing Performance Section */}
        <Suspense fallback={
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} />
                Timing Performance
              </h3>
            </CardHeader>
            <CardContent>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ height: '100px', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px', marginBottom: '1rem' }} />
                <p className="body-small text-secondary">Loading timing statistics...</p>
              </div>
            </CardContent>
          </Card>
        }>
          <TimingPerformance />
        </Suspense>

        {/* Focus & Adherence Section */}
        {user && <FocusAdherenceStats userId={user.id} />}
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          isOpen={!!editingSession}
          onClose={() => setEditingSession(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}