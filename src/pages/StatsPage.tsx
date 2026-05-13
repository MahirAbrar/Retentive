import { logger } from '../utils/logger'
import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
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
  const useShortDate = data.length > 7
  return (
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 12 }}
        interval="preserveStartEnd"
        minTickGap={24}
        tickFormatter={(date) => new Date(date).toLocaleDateString('en', useShortDate ? { month: 'short', day: 'numeric' } : { weekday: 'short' })}
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
  const [combinedActivity, setCombinedActivity] = useState<ActivityItem[]>([])
  const [visibleSessions, setVisibleSessions] = useState(5) // Pagination for recent activity
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [masteredInPeriod, setMasteredInPeriod] = useState(0)
  const [reviewsInPeriod, setReviewsInPeriod] = useState(0)
  const [avgReviewsDisplay, setAvgReviewsDisplay] = useState('0')
  const [peakDayDisplay, setPeakDayDisplay] = useState(0)
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
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const SUBJECTS_PREVIEW_LIMIT = 6

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
      reviewsInPeriod: number
      avgReviews: string
      peakDay: number
    }>(cacheKey)

    if (cached) {
      setDailyActivity(cached.dailyActivity)
      setMasteredInPeriod(cached.masteredInPeriod)
      setReviewsInPeriod(cached.reviewsInPeriod)
      setAvgReviewsDisplay(cached.avgReviews)
      setPeakDayDisplay(cached.peakDay)
      setSessionsLoading(false)
    }

    if (!cached) {
      setSessionsLoading(true)
    }
    setLoading(true)

    try {
      const startDate = new Date()
      if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 6)
        startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'month') {
        startDate.setDate(startDate.getDate() - 29)
        startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'all') {
        startDate.setFullYear(2000)
        startDate.setHours(0, 0, 0, 0)
      }
      const startIso = startDate.toISOString()

      // Active topic IDs — matches dashboard's mastered filter so the two counts agree
      const { data: activeTopics } = await supabase
        .from('topics')
        .select('id')
        .eq('user_id', user.id)
        .neq('archive_status', 'archived')
      const activeTopicIds = activeTopics?.map(t => t.id) || []

      // Build mastered query. Archived items with review_count >= 5 count as mastered;
      // their completion timestamp is archive_date (mastery_date may be null).
      const masteredQuery = supabase
        .from('learning_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('topic_id', activeTopicIds)
        .or('mastery_status.in.(mastered,maintenance),and(mastery_status.eq.archived,review_count.gte.5)')
      if (dateRange !== 'all') {
        masteredQuery.or(`mastery_date.gte.${startIso},archive_date.gte.${startIso}`)
      }

      // Exact review count for the period (no row data fetched).
      const reviewsCountQuery = supabase
        .from('review_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('reviewed_at', startIso)

      // Recent session feed — kept capped at 100 for the activity list UI only.
      const sessionsListQuery = supabase
        .from('review_sessions')
        .select(`
          id,
          reviewed_at,
          interval_days,
          learning_items!inner (
            id,
            content,
            topics!inner (id, name)
          )
        `)
        .eq('user_id', user.id)
        .gte('reviewed_at', startIso)
        .order('reviewed_at', { ascending: false })
        .limit(100)

      const focusFeedPromise = focusTimerService.getUserSessions(user.id, 50).catch(err => {
        logger.error('Error fetching focus sessions:', err)
        return []
      })

      const [reviewsCountRes, sessionsListRes, focusSessionsList, masteredRes] = await Promise.all([
        reviewsCountQuery,
        sessionsListQuery,
        focusFeedPromise,
        masteredQuery,
      ])

      const reviewsCount = reviewsCountRes.count || 0
      setReviewsInPeriod(reviewsCount)
      setMasteredInPeriod(masteredRes.count || 0)

      // Process sessions for the activity feed
      let formattedSessionsData: ReviewSession[] = []
      if (!sessionsListRes.error && sessionsListRes.data) {
        formattedSessionsData = sessionsListRes.data.map((session: any) => ({
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
      } else if (sessionsListRes.error) {
        logger.error('Error fetching review sessions:', sessionsListRes.error)
      }

      const focusSessionsData: FocusSessionDisplay[] = (focusSessionsList || [])
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

      // Full per-day aggregation across the entire period. Paginated fetch of
      // reviewed_at only — used to compute Peak Day and (for All Time) the
      // first-review date that anchors the Avg/Day denominator.
      const pageSize = 1000
      const dailyMap = new Map<string, number>()
      let earliestReviewedAt: string | null = null
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('review_sessions')
          .select('reviewed_at')
          .eq('user_id', user.id)
          .gte('reviewed_at', startIso)
          .order('reviewed_at', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) {
          logger.error('Error fetching review session dates:', error)
          break
        }
        if (!data || data.length === 0) break
        if (earliestReviewedAt === null) earliestReviewedAt = data[0].reviewed_at
        for (const row of data) {
          const dateStr = row.reviewed_at.split('T')[0]
          dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1)
        }
        if (data.length < pageSize) break
        from += pageSize
      }

      const peak = dailyMap.size === 0 ? 0 : Math.max(...dailyMap.values())

      // Avg/Day denominator = total days in the selected period.
      let daysInRange: number
      if (dateRange === 'week') {
        daysInRange = 7
      } else if (dateRange === 'month') {
        daysInRange = 30
      } else if (earliestReviewedAt) {
        const first = new Date(earliestReviewedAt)
        first.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        daysInRange = Math.max(1, Math.round((today.getTime() - first.getTime()) / 86_400_000) + 1)
      } else {
        daysInRange = 1
      }
      const avg = reviewsCount > 0 ? (reviewsCount / daysInRange).toFixed(1) : '0'

      // Chart data: trailing window sized to the selected range. For 'all' we cap
      // at 90 days so the chart stays readable even for long-time users; the
      // Avg/Day and Peak Day tiles still reflect the full range.
      const chartDays = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90
      const chartData: DailyActivity[] = []
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        chartData.push({ date: dateStr, reviews: dailyMap.get(dateStr) || 0 })
      }

      setDailyActivity(chartData)
      setAvgReviewsDisplay(avg)
      setPeakDayDisplay(peak)

      cacheService.set(cacheKey, {
        sessions: formattedSessionsData,
        dailyActivity: chartData,
        masteredInPeriod: masteredRes.count || 0,
        reviewsInPeriod: reviewsCount,
        avgReviews: avg,
        peakDay: peak,
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
                    <p className="h2">{reviewsInPeriod}</p>
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
                    <p className="h2">{avgReviewsDisplay}</p>
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
                    <p className="h2">{peakDayDisplay}</p>
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
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', columnGap: '2rem' }}>
                    {(showAllSubjects ? subjectStats : subjectStats.slice(0, SUBJECTS_PREVIEW_LIMIT)).map(subject => {
                      const Icon = getIconComponent(subject.icon)
                      const completionRate = subject.itemCount > 0
                        ? Math.round((subject.masteredCount / subject.itemCount) * 100)
                        : 0
                      return (
                        <div
                          key={subject.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '20px minmax(0, 1fr) 64px 36px 56px',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid var(--color-border)',
                            fontSize: '0.875rem',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: subject.color + '20',
                              color: subject.color,
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <Icon size={12} />
                          </div>
                          <span
                            title={`${subject.name} — ${subject.topicCount} topic${subject.topicCount !== 1 ? 's' : ''}${subject.dueCount > 0 ? ` · ${subject.dueCount} due` : ''}`}
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {subject.name}
                            {subject.dueCount > 0 && (
                              <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                · {subject.dueCount} due
                              </span>
                            )}
                          </span>
                          <div
                            style={{
                              height: '4px',
                              backgroundColor: 'var(--color-gray-200)',
                              borderRadius: 'var(--radius-full)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${completionRate}%`,
                                height: '100%',
                                backgroundColor: subject.color,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {completionRate}%
                          </span>
                          <span
                            style={{
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                              color: 'var(--color-text-secondary)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {subject.masteredCount}/{subject.itemCount}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {subjectStats.length > SUBJECTS_PREVIEW_LIMIT && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => setShowAllSubjects(prev => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        {showAllSubjects
                          ? 'Show fewer'
                          : `Show all ${subjectStats.length}`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Topic Performance */}
        <Card variant="bordered" padding="small">
          <CardHeader>
            <h3 className="h4">Topic Performance</h3>
          </CardHeader>
          <CardContent>
            {topicStats.length === 0 ? (
              <p className="body text-secondary">No topics yet</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', columnGap: '2rem' }}>
                {topicStats.map(topic => (
                  <div
                    key={topic.topic_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 72px 40px 56px',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.25rem 0',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.3,
                    }}
                  >
                    <span
                      title={topic.topic_name}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {topic.topic_name}
                    </span>
                    <div
                      style={{
                        height: '4px',
                        backgroundColor: 'var(--color-gray-200)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${topic.completion_rate}%`,
                          height: '100%',
                          backgroundColor: 'var(--color-success)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {Math.round(topic.completion_rate)}%
                    </span>
                    <span
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {topic.reviewed_items}/{topic.total_items}
                    </span>
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
              <div>
                {combinedActivity.slice(0, visibleSessions).map(item => {
                  if (item.type === 'review') {
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0',
                          borderBottom: '1px solid var(--color-border)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {formatDate(item.reviewed_at)}
                        </span>
                        <span
                          title={item.learning_item.content}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {item.learning_item.content}
                        </span>
                        <span
                          title={item.learning_item.topic.name}
                          style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                            maxWidth: '160px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.learning_item.topic.name}
                        </span>
                      </div>
                    )
                  } else {
                    const adherenceColor = getAdherenceColor(item.adherence_percentage)
                    const hasPenalty = (item.points_penalty ?? 0) > 0
                    const accent = item.is_incomplete ? 'var(--color-error)' : adherenceColor.color
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '70px minmax(0, 1fr) auto auto',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0 0.5rem 0.5rem',
                          borderBottom: '1px solid var(--color-border)',
                          borderLeft: `2px solid ${accent}`,
                          fontSize: '0.875rem',
                        }}
                      >
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {formatDate(item.created_at)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <Timer size={14} color={accent} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Focus · {item.total_work_minutes}m/{item.goal_minutes}m
                          </span>
                          {item.is_incomplete && (
                            <span
                              title="Session marked incomplete due to low adherence"
                              style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-error)', flexShrink: 0 }}
                            >
                              <AlertTriangle size={12} />
                            </span>
                          )}
                          {item.was_adjusted && (
                            <span
                              title={`Adjusted: ${item.adjustment_reason || 'No reason provided'}`}
                              style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-info)', flexShrink: 0 }}
                            >
                              <Edit2 size={12} />
                            </span>
                          )}
                          {(item.points_earned !== undefined || hasPenalty) && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                                flexShrink: 0,
                              }}
                            >
                              <Award size={12} />
                              <span style={{ color: 'var(--color-success)' }}>+{item.points_earned ?? 0}</span>
                              {hasPenalty && (
                                <span style={{ color: 'var(--color-error)' }}>-{item.points_penalty}</span>
                              )}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.125rem 0.375rem',
                            backgroundColor: accent,
                            borderRadius: 'var(--radius-sm)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {Math.round(item.adherence_percentage)}% {adherenceColor.emoji}
                        </span>
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
                          <Edit2 size={14} />
                        </button>
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