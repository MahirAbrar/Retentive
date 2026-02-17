import { logger } from '../utils/logger'
import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { getExtendedStats } from '../services/statsService'
import { cacheService } from '../services/cacheService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3, Timer, Edit2, AlertTriangle, Award } from 'lucide-react'
import { FocusAdherenceStats } from '../components/stats/FocusAdherenceStats'
import { focusTimerService, getAdherenceColor, type FocusSession } from '../services/focusTimerService'
import { EditSessionModal } from '../components/focus/EditSessionModal'
import { StreakCalendar } from '../components/stats/StreakCalendar'
import { subjectService } from '../services/subjectService'
import { getIconComponent } from '../utils/icons'
import type { SubjectWithStats } from '../types/subject'

// Lazy load TimingPerformance for better initial load
const TimingPerformance = lazy(() => import('../components/stats/TimingPerformance').then(module => ({ default: module.TimingPerformance })))

interface ReviewSession {
  id: string
  reviewed_at: string
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
  is_incomplete?: boolean
  points_earned?: number
  points_penalty?: number
}

interface ReviewSessionDisplay {
  id: string
  type: 'review'
  reviewed_at: string
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

export function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [formattedSessions, setFormattedSessions] = useState<ReviewSession[]>([])
  const [combinedActivity, setCombinedActivity] = useState<ActivityItem[]>([])
  const [visibleSessions, setVisibleSessions] = useState(5) // Pagination for recent activity
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [masteredInPeriod, setMasteredInPeriod] = useState(0)
  const [dateRange, setDateRange] = useState('week')
  const [pendingDateRange, setPendingDateRange] = useState('week')
  const [_loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [, setTopicsLoading] = useState(true)
  const [streakWarning, setStreakWarning] = useState<{ show: boolean; hoursLeft: number }>({ show: false, hoursLeft: 0 })
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null)
  const [subjectStats, setSubjectStats] = useState<SubjectWithStats[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [studyDates, setStudyDates] = useState<Set<string>>(new Set())
  const [adherenceDates, setAdherenceDates] = useState<Set<string>>(new Set())

  // Load date-range-independent data once (streak, completion, topics, subjects)
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadIndependentData = async () => {
      setStatsLoading(true)
      setTopicsLoading(true)
      setSubjectsLoading(true)
      try {
        const [extendedStats, topicsResult, itemsResult, subjectsResult] = await Promise.all([
          getExtendedStats(user.id),
          supabase.from('topics').select('id, name').eq('user_id', user.id),
          supabase.from('learning_items').select('topic_id, review_count, ease_factor').eq('user_id', user.id),
          subjectService.getSubjectsWithStats(user.id).catch(err => {
            logger.error('Error fetching subject stats:', err)
            return []
          })
        ])

        if (cancelled) return

        setStats(extendedStats)

        // Streak warning
        if (extendedStats.streakDays > 0 && extendedStats.reviewedToday === 0) {
          const now = new Date()
          const midnight = new Date(now)
          midnight.setHours(24, 0, 0, 0)
          const hoursLeft = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60))
          if (hoursLeft <= 4) {
            setStreakWarning({ show: true, hoursLeft })
          }
        }

        // Process topic stats
        const itemsByTopic = new Map<string, any[]>()
        if (itemsResult.data) {
          for (const item of itemsResult.data) {
            if (!itemsByTopic.has(item.topic_id)) {
              itemsByTopic.set(item.topic_id, [])
            }
            itemsByTopic.get(item.topic_id)!.push(item)
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
        setSubjectStats(subjectsResult || [])
      } catch (error) {
        logger.error('Error loading independent stats:', error)
      } finally {
        if (!cancelled) {
          setStatsLoading(false)
          setTopicsLoading(false)
          setSubjectsLoading(false)
        }
      }
    }

    loadIndependentData()
    return () => { cancelled = true }
  }, [user])

  // Load date-range-dependent data (sessions, activity)
  const loadStats = useCallback(async () => {
    if (!user) return

    const cacheKey = `stats-page:${user.id}:${dateRange}`
    const cached = cacheService.get<{
      sessions: ReviewSession[]
      dailyActivity: DailyActivity[]
      masteredInPeriod: number
    }>(cacheKey)

    if (cached) {
      setFormattedSessions(cached.sessions)
      setDailyActivity(cached.dailyActivity)
      setMasteredInPeriod(cached.masteredInPeriod)
      setSessionsLoading(false)
    }

    if (!cached) {
      setSessionsLoading(true)
    }
    setLoading(true)

    try {
      const startDate = new Date()
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (dateRange === 'all') {
        startDate.setFullYear(2020)
      }

      // Build mastered query based on date range (includes archived topics, review_count >= 5)
      const masteredQuery = supabase
        .from('learning_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('review_count', 5)
      if (dateRange !== 'all') {
        masteredQuery.gte('mastery_date', startDate.toISOString())
      }

      const [sessionsResult, focusSessionsResult, masteredResult] = await Promise.all([
        supabase
          .from('review_sessions')
          .select(`
            id,
            reviewed_at,
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
          .limit(100),

        focusTimerService.getUserSessions(user.id, 50).catch(err => {
          logger.error('Error fetching focus sessions:', err)
          return []
        }),

        masteredQuery,
      ])

      setMasteredInPeriod(masteredResult.count || 0)

      // Process sessions
      let formattedSessionsData: ReviewSession[] = []
      if (!sessionsResult.error && sessionsResult.data) {
        formattedSessionsData = sessionsResult.data.map((session: any) => ({
          id: session.id,
          reviewed_at: session.reviewed_at,
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
          is_incomplete: session.is_incomplete,
          points_earned: session.points_earned,
          points_penalty: session.points_penalty,
        }))

      // Combine and sort
      const reviewActivities: ReviewSessionDisplay[] = formattedSessionsData.map(s => ({
        ...s,
        type: 'review' as const
      }))

      const allActivity: ActivityItem[] = [...reviewActivities, ...focusSessionsData]
        .sort((a, b) => {
          const dateA = a.type === 'review' ? new Date(a.reviewed_at) : new Date(a.created_at)
          const dateB = b.type === 'review' ? new Date(b.reviewed_at) : new Date(b.created_at)
          return dateB.getTime() - dateA.getTime()
        })

      setCombinedActivity(allActivity)
      setSessionsLoading(false)

      // Daily activity chart
      const activityMap = new Map<string, number>()
      const daysToShow = 7
      const daysToProcess = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : Math.min(formattedSessionsData.length, 90)

      for (let i = 0; i < daysToShow; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        activityMap.set(dateStr, 0)
      }

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

      const activityData = Array.from(activityMap.entries())
        .map(([date, reviews]) => ({ date, reviews }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyActivity(activityData)

      cacheService.set(cacheKey, {
        sessions: formattedSessionsData,
        dailyActivity: activityData,
        masteredInPeriod: masteredResult.count || 0
      }, 2 * 60 * 1000)
    } catch (error) {
      logger.error('Error loading stats:', error)
    } finally {
      setLoading(false)
      setSessionsLoading(false)
    }
  }, [user, dateRange])

  useEffect(() => {
    if (user) {
      loadStats()
    }
    // Note: loadStats is intentionally excluded from dependencies
    // It already depends on user and dateRange, including it causes infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange])

  // Load streak calendar data independently of date range (always all-time)
  useEffect(() => {
    if (!user) return

    const loadCalendarData = async () => {
      try {
        const [sessionsResult, focusSessionsResult] = await Promise.all([
          supabase
            .from('review_sessions')
            .select('reviewed_at')
            .eq('user_id', user.id)
            .order('reviewed_at', { ascending: false })
            .limit(2000),
          focusTimerService.getUserSessions(user.id, 200).catch(() => [])
        ])

        // Extract study dates
        const studyDateSet = new Set<string>()
        if (sessionsResult.data) {
          sessionsResult.data.forEach(session => {
            const date = new Date(session.reviewed_at)
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            studyDateSet.add(dateStr)
          })
        }
        setStudyDates(studyDateSet)

        // Extract dates with 100% adherence focus sessions
        const adherenceDateSet = new Set<string>()
        ;(focusSessionsResult || []).forEach(session => {
          if ((session.adherence_percentage || 0) >= 100) {
            const date = new Date(session.created_at)
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            adherenceDateSet.add(dateStr)
          }
        })
        setAdherenceDates(adherenceDateSet)
      } catch (error) {
        logger.error('Error loading calendar data:', error)
      }
    }

    loadCalendarData()
  }, [user])

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
    if (!user) return

    // Convert FocusSessionDisplay to FocusSession for the modal
    const fullSession: FocusSession = {
      id: session.id,
      user_id: user.id,
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



  // Show content progressively as it loads
  return (
    <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">Study Statistics</h1>
        <p className="body text-secondary">
          Track your learning progress and performance
        </p>
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Independent Stats - not affected by date range */}
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

        {/* Period Stats - Reviews & Mastered with date range selector */}
        <Card variant="bordered">
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="h4">Performance</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {([['week', 'Week'], ['month', 'Month'], ['all', 'All Time']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPendingDateRange(value)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: pendingDateRange === value ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: pendingDateRange === value ? 'var(--color-secondary)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: pendingDateRange === value ? '600' : '400',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                {sessionsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{formattedSessions.length}</p>
                    <p className="body-small text-secondary">Reviews</p>
                  </>
                )}
              </div>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                {sessionsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{masteredInPeriod}</p>
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
              <div style={{ textAlign: 'center' }}>
                {sessionsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{avgReviewsPerDay}</p>
                    <p className="body-small text-secondary">Avg/Day</p>
                  </>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                {sessionsLoading ? (
                  <>
                    <div style={{ height: '2.5rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                    <div style={{ height: '1rem', width: '80px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
                  </>
                ) : (
                  <>
                    <p className="h2">{peakDayReviews}</p>
                    <p className="body-small text-secondary">Peak Day</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Calendars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <Card variant="bordered">
            <CardContent>
              <StreakCalendar
                title="Study Streak"
                activeDates={studyDates}
                colorActive="var(--color-success)"
              />
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent>
              <StreakCalendar
                title="Perfect Adherence"
                activeDates={adherenceDates}
                colorActive="var(--color-primary)"
              />
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

        </div>

        {/* Subject Performance */}
        {subjectStats.length > 0 && (
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4">Subject Performance</h3>
            </CardHeader>
            <CardContent>
              {subjectsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ height: '100px', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {subjectStats.map(subject => {
                    const Icon = getIconComponent(subject.icon)
                    const completionRate = subject.itemCount > 0
                      ? Math.round((subject.masteredCount / subject.itemCount) * 100)
                      : 0
                    return (
                      <div
                        key={subject.id}
                        style={{
                          padding: '1rem',
                          backgroundColor: subject.color + '10',
                          borderLeft: `3px solid ${subject.color}`,
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: subject.color + '20',
                              color: subject.color,
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <Icon size={14} />
                            </div>
                            <h4 className="body" style={{ fontWeight: '600' }}>{subject.name}</h4>
                          </div>
                          <Badge variant="ghost">
                            {subject.topicCount} topic{subject.topicCount !== 1 ? 's' : ''} • {subject.itemCount} item{subject.itemCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.75rem' }}>
                          <div>
                            <p className="caption text-secondary">Due</p>
                            <p className="body" style={{ fontWeight: '500', color: subject.dueCount > 0 ? 'var(--color-warning)' : 'inherit' }}>
                              {subject.dueCount}
                            </p>
                          </div>
                          <div>
                            <p className="caption text-secondary">Mastered</p>
                            <p className="body" style={{ fontWeight: '500', color: 'var(--color-success)' }}>
                              {subject.masteredCount}
                            </p>
                          </div>
                          <div>
                            <p className="caption text-secondary">Completion</p>
                            <p className="body" style={{ fontWeight: '500' }}>
                              {completionRate}%
                            </p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{
                          marginTop: '0.75rem',
                          height: '4px',
                          backgroundColor: 'var(--color-gray-200)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${completionRate}%`,
                            height: '100%',
                            backgroundColor: subject.color,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Topic Performance */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Topic Performance</h3>
          </CardHeader>
          <CardContent>
            {topicStats.length === 0 ? (
              <p className="body text-secondary">No topics yet</p>
            ) : (
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
                    <div>
                      <p className="body-small text-secondary">Completion</p>
                      <p className="body">{Math.round(topic.completion_rate)}%</p>
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
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="bordered">
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="h4">Recent Activity</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[5, 10, 15].map(count => (
                  <button
                    key={count}
                    onClick={() => setVisibleSessions(count)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: visibleSessions === count ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: visibleSessions === count ? 'var(--color-secondary)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: visibleSessions === count ? '600' : '400',
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
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
                      </div>
                    )
                  } else {
                    // Focus session card
                    const adherenceColor = getAdherenceColor(item.adherence_percentage)
                    const hasPenalty = (item.points_penalty ?? 0) > 0
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: item.is_incomplete ? 'var(--color-error-light)' : adherenceColor.color + '10',
                          borderLeft: `3px solid ${item.is_incomplete ? 'var(--color-error)' : adherenceColor.color}`,
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Timer size={14} color={item.is_incomplete ? 'var(--color-error)' : adherenceColor.color} />
                            <p className="body-small" style={{ fontWeight: '600' }}>
                              Focus Session
                            </p>
                            {item.is_incomplete && (
                              <span
                                className="caption"
                                style={{
                                  padding: '0.125rem 0.375rem',
                                  backgroundColor: 'var(--color-error)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title="Session marked incomplete due to low adherence"
                              >
                                <AlertTriangle size={10} /> Incomplete
                              </span>
                            )}
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
                          {/* Points info */}
                          {(item.points_earned !== undefined || hasPenalty) && (
                            <p className="caption text-secondary" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Award size={12} />
                              <span style={{ color: 'var(--color-success)' }}>+{item.points_earned ?? 0} pts</span>
                              {hasPenalty && (
                                <span style={{ color: 'var(--color-error)' }}>
                                  (-{item.points_penalty} penalty)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: item.is_incomplete ? 'var(--color-error)' : adherenceColor.color,
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