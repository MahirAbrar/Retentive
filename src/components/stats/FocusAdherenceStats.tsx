import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../ui'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Timer, TrendingUp, Clock, Coffee } from 'lucide-react'
import { focusTimerService, getAdherenceColor } from '../../services/focusTimerService'
import { useAuth } from '../../hooks/useAuthFixed'

interface FocusAdherenceStatsProps {
  userId: string
}

interface SessionData {
  date: string
  adherence: number
  work: number
  break: number
}

export function FocusAdherenceStats({ userId }: FocusAdherenceStatsProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    averageAdherence: 0,
    bestAdherence: 0,
    totalFocusTime: 0,
  })
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([])
  const [allSessions, setAllSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | '7days' | 'month' | 'year'>('week')
  const [trendView, setTrendView] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [statsTimeRange, setStatsTimeRange] = useState<'today' | 'week' | 'lastweek' | 'month' | 'year'>('month')
  const [isPaidUser, setIsPaidUser] = useState(false)

  useEffect(() => {
    if (!userId) return

    const loadFocusStats = async () => {
      try {
        setLoading(true)
        // Get last 30 days of stats
        const stats30Days = await focusTimerService.getUserStats(userId, 30)
        setStats(stats30Days)

        // Fetch maximum sessions based on user type
        // Paid users get up to 200 sessions (covers ~1 year), free users get 50 (covers ~1 month)
        const limit = isPaidUser ? 200 : 50

        // Get all sessions once - we'll filter client-side
        const sessions = await focusTimerService.getUserSessions(userId, limit)
        setAllSessions(sessions)

        // Format last 7 sessions for chart view
        const formattedSessions = sessions.slice(0, 7).map((s) => ({
          date: new Date(s.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          adherence: Math.round(s.adherence_percentage || 0),
          work: s.total_work_minutes,
          break: s.total_break_minutes,
        }))
        setRecentSessions(formattedSessions.reverse()) // Oldest to newest
      } catch (error) {
        console.error('Error loading focus stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFocusStats()
  }, [userId, isPaidUser]) // Removed timeRange from dependencies!

  // Check if user is paid
  useEffect(() => {
    if (!user) return

    const checkSubscription = async () => {
      try {
        const { data } = await focusTimerService['supabase']
          .from('subscription_profiles')
          .select('is_paid, is_trial')
          .eq('id', user.id)
          .single()

        setIsPaidUser(data?.is_paid || data?.is_trial || false)
      } catch (error) {
        console.error('Error checking subscription:', error)
      }
    }

    checkSubscription()
  }, [user])

  // Filter sessions based on time range - client-side only, no refetch!
  const filteredSessions = useMemo(() => {
    const now = new Date()
    return allSessions.filter(s => {
      const sessionDate = new Date(s.created_at)

      if (timeRange === 'week') {
        // This Week: from start of current week (Sunday) to now
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Go to Sunday
        startOfWeek.setHours(0, 0, 0, 0)
        return sessionDate >= startOfWeek
      }

      if (timeRange === '7days') {
        // Last 7 Days: previous 7 days from today
        const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 7
      }

      if (timeRange === 'month') {
        // This Month: from start of current month to now
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return sessionDate >= startOfMonth
      }

      if (timeRange === 'year') {
        // Last Year: previous 365 days
        const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 365
      }

      return true
    })
  }, [allSessions, timeRange])

  // Calculate average adherence for filtered sessions
  const averageAdherence = useMemo(() => {
    if (filteredSessions.length === 0) return 0
    const total = filteredSessions.reduce((sum, s) => sum + (s.adherence_percentage || 0), 0)
    return Math.round(total / filteredSessions.length)
  }, [filteredSessions])

  // Calculate stats based on selected time range
  const filteredStats = useMemo(() => {
    const now = new Date()
    const sessionsInRange = allSessions.filter(s => {
      const sessionDate = new Date(s.created_at)

      if (statsTimeRange === 'today') {
        // Today only
        return sessionDate.toDateString() === now.toDateString()
      }

      if (statsTimeRange === 'week') {
        // This week (from Sunday to now)
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return sessionDate >= startOfWeek
      }

      if (statsTimeRange === 'lastweek') {
        // Last week (previous Sunday to Saturday)
        const startOfLastWeek = new Date(now)
        startOfLastWeek.setDate(now.getDate() - now.getDay() - 7)
        startOfLastWeek.setHours(0, 0, 0, 0)
        const endOfLastWeek = new Date(startOfLastWeek)
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
        endOfLastWeek.setHours(23, 59, 59, 999)
        return sessionDate >= startOfLastWeek && sessionDate <= endOfLastWeek
      }

      if (statsTimeRange === 'month') {
        // This month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return sessionDate >= startOfMonth
      }

      if (statsTimeRange === 'year') {
        // Last 365 days
        const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 365
      }

      return false
    })

    // Calculate aggregated stats
    const totalSessions = sessionsInRange.length
    const totalWorkMinutes = sessionsInRange.reduce((sum, s) => sum + s.total_work_minutes, 0)
    const totalBreakMinutes = sessionsInRange.reduce((sum, s) => sum + s.total_break_minutes, 0)
    const averageAdherence = totalSessions > 0
      ? sessionsInRange.reduce((sum, s) => sum + (s.adherence_percentage || 0), 0) / totalSessions
      : 0
    const bestAdherence = totalSessions > 0
      ? Math.max(...sessionsInRange.map(s => s.adherence_percentage || 0))
      : 0

    return {
      totalSessions,
      totalWorkMinutes,
      totalBreakMinutes,
      averageAdherence,
      bestAdherence,
      totalFocusTime: totalWorkMinutes + totalBreakMinutes
    }
  }, [allSessions, statsTimeRange])

  // Aggregate sessions based on trend view (daily, weekly, monthly)
  const trendData = useMemo(() => {
    if (allSessions.length === 0) return []

    const aggregated = new Map<string, { adherence: number[], work: number, break: number, count: number }>()

    allSessions.forEach(session => {
      const sessionDate = new Date(session.created_at)
      let key = ''

      if (trendView === 'daily') {
        // Group by day: YYYY-MM-DD (use local date to avoid timezone issues)
        const year = sessionDate.getFullYear()
        const month = String(sessionDate.getMonth() + 1).padStart(2, '0')
        const day = String(sessionDate.getDate()).padStart(2, '0')
        key = `${year}-${month}-${day}`
      } else if (trendView === 'weekly') {
        // Group by week: Get start of week (Sunday) using local date
        const startOfWeek = new Date(sessionDate)
        startOfWeek.setDate(sessionDate.getDate() - sessionDate.getDay())
        const year = startOfWeek.getFullYear()
        const month = String(startOfWeek.getMonth() + 1).padStart(2, '0')
        const day = String(startOfWeek.getDate()).padStart(2, '0')
        key = `${year}-${month}-${day}`
      } else if (trendView === 'monthly') {
        // Group by month: YYYY-MM
        key = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, { adherence: [], work: 0, break: 0, count: 0 })
      }

      const data = aggregated.get(key)!
      data.adherence.push(session.adherence_percentage || 0)
      data.work += session.total_work_minutes
      data.break += session.total_break_minutes
      data.count += 1
    })

    // Convert to array and calculate averages
    const result = Array.from(aggregated.entries())
      .map(([key, data]) => {
        const avgAdherence = data.adherence.reduce((sum, val) => sum + val, 0) / data.adherence.length

        let displayDate = key
        if (trendView === 'daily') {
          displayDate = new Date(key).toLocaleDateString('en', { month: 'short', day: 'numeric' })
        } else if (trendView === 'weekly') {
          // Calculate week range: Sunday to Saturday
          const startOfWeek = new Date(key)
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)

          const startMonth = startOfWeek.toLocaleDateString('en', { month: 'short' })
          const endMonth = endOfWeek.toLocaleDateString('en', { month: 'short' })
          const startDay = startOfWeek.getDate()
          const endDay = endOfWeek.getDate()

          // If same month, show "Jan 1-7"
          if (startMonth === endMonth) {
            displayDate = `${startMonth} ${startDay}-${endDay}`
          } else {
            // If different months, show "Jan 30-Feb 5"
            displayDate = `${startMonth} ${startDay}-${endMonth} ${endDay}`
          }
        } else if (trendView === 'monthly') {
          displayDate = new Date(key + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })
        }

        return {
          date: displayDate,
          adherence: Math.round(avgAdherence),
          work: data.work,
          break: data.break,
          sessions: data.count,
          sortKey: key // Keep original key for proper sorting
        }
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey)) // Sort by actual date, not display string
      .slice(-30) // Show last 30 data points

    return result
  }, [allSessions, trendView])

  if (loading) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Timer size={20} />
            Focus & Adherence
          </h3>
        </CardHeader>
        <CardContent>
          <p className="body text-secondary">Loading focus statistics...</p>
        </CardContent>
      </Card>
    )
  }

  if (stats.totalSessions === 0) {
    return (
      <Card variant="bordered">
        <CardHeader>
          <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Timer size={20} />
            Focus & Adherence
          </h3>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p className="body text-secondary">No focus sessions yet. Start your first session to track your productivity!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const adherenceColor = getAdherenceColor(filteredStats.averageAdherence)

  // Get display label for stats time range
  const getStatsTimeRangeLabel = () => {
    if (statsTimeRange === 'today') return 'Today'
    if (statsTimeRange === 'week') return 'This Week'
    if (statsTimeRange === 'lastweek') return 'Last Week'
    if (statsTimeRange === 'month') return 'This Month'
    if (statsTimeRange === 'year') return 'This Year'
    return 'Last 30 Days'
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Overview Stats */}
      <Card variant="bordered">
        <CardHeader>
          <div>
            <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Timer size={20} />
              Focus & Adherence ({getStatsTimeRangeLabel()})
            </h3>
            {/* Time Range Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatsTimeRange('today')}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statsTimeRange === 'today' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statsTimeRange === 'today' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: statsTimeRange === 'today' ? '600' : '400'
                }}
              >
                Today
              </button>
              <button
                onClick={() => setStatsTimeRange('week')}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statsTimeRange === 'week' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statsTimeRange === 'week' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: statsTimeRange === 'week' ? '600' : '400'
                }}
              >
                This Week
              </button>
              <button
                onClick={() => setStatsTimeRange('lastweek')}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statsTimeRange === 'lastweek' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statsTimeRange === 'lastweek' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: statsTimeRange === 'lastweek' ? '600' : '400'
                }}
              >
                Last Week
              </button>
              <button
                onClick={() => setStatsTimeRange('month')}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statsTimeRange === 'month' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statsTimeRange === 'month' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: statsTimeRange === 'month' ? '600' : '400'
                }}
              >
                This Month
              </button>
              <button
                onClick={() => {
                  if (isPaidUser) {
                    setStatsTimeRange('year')
                  }
                }}
                disabled={!isPaidUser}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: statsTimeRange === 'year' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statsTimeRange === 'year' ? 'white' : 'var(--color-text)',
                  cursor: isPaidUser ? 'pointer' : 'not-allowed',
                  fontSize: '0.75rem',
                  fontWeight: statsTimeRange === 'year' ? '600' : '400',
                  opacity: isPaidUser ? 1 : 0.5
                }}
                title={!isPaidUser ? 'Yearly view is only available for paid users' : ''}
              >
                This Year {!isPaidUser && '🔒'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Total Sessions */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={18} color="var(--color-primary)" />
                <span className="body-small text-secondary">Total Sessions</span>
              </div>
              <p className="h3">{filteredStats.totalSessions}</p>
            </div>

            {/* Average Adherence */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: adherenceColor.color + '20',
                border: `2px solid ${adherenceColor.color}`,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{adherenceColor.emoji}</span>
                <span className="body-small text-secondary">Avg Adherence</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <p className="h3" style={{ color: adherenceColor.color }}>
                  {Math.round(filteredStats.averageAdherence)}%
                </p>
                <span className="caption text-secondary">({adherenceColor.status})</span>
              </div>
            </div>

            {/* Best Adherence */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-success-light)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏆</span>
                <span className="body-small text-secondary">Best Session</span>
              </div>
              <p className="h3" style={{ color: 'var(--color-success)' }}>
                {Math.round(filteredStats.bestAdherence)}%
              </p>
            </div>

            {/* Total Work Time */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={18} color="var(--color-success)" />
                <span className="body-small text-secondary">Total Work Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <p className="h3">{Math.floor(filteredStats.totalWorkMinutes / 60)}</p>
                <span className="body-small text-secondary">h</span>
                <p className="h3">{filteredStats.totalWorkMinutes % 60}</p>
                <span className="body-small text-secondary">m</span>
              </div>
            </div>

            {/* Total Break Time */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Coffee size={18} color="var(--color-warning)" />
                <span className="body-small text-secondary">Total Break Time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <p className="h3">{Math.floor(filteredStats.totalBreakMinutes / 60)}</p>
                <span className="body-small text-secondary">h</span>
                <p className="h3">{filteredStats.totalBreakMinutes % 60}</p>
                <span className="body-small text-secondary">m</span>
              </div>
            </div>

            {/* Productivity Ratio */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="body-small text-secondary">Work/Break Ratio</span>
              </div>
              <p className="h3">
                {filteredStats.totalBreakMinutes > 0
                  ? (filteredStats.totalWorkMinutes / filteredStats.totalBreakMinutes).toFixed(1)
                  : filteredStats.totalWorkMinutes}
                <span className="body-small text-secondary">:1</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {recentSessions.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Adherence Percentage Trend */}
          <Card variant="bordered">
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="h4">Adherence Percentage</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setTrendView('daily')}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: trendView === 'daily' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: trendView === 'daily' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: trendView === 'daily' ? '600' : '400'
                    }}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTrendView('weekly')}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: trendView === 'weekly' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: trendView === 'weekly' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: trendView === 'weekly' ? '600' : '400'
                    }}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTrendView('monthly')}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: trendView === 'monthly' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: trendView === 'monthly' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: trendView === 'monthly' ? '600' : '400'
                    }}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="body-small text-secondary">No trend data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Adherence %', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload
                          return (
                            <div style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-gray-200)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px'
                            }}>
                              <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                                {data.date}
                              </p>
                              <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
                                {data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}
                              </p>
                              <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                                  <span style={{ fontSize: '13px' }}>Adherence: <strong>{data.adherence}%</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', opacity: 0.7 }} />
                                  <span style={{ fontSize: '13px' }}>Work: <strong>{data.work} min</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)', opacity: 0.7 }} />
                                  <span style={{ fontSize: '13px' }}>Break: <strong>{data.break} min</strong></span>
                                </div>
                                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--color-border)' }}>
                                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    Total: <strong>{data.work + data.break} min</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    {/* Adherence Line - Only visible element */}
                    <Line
                      type="monotone"
                      dataKey="adherence"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-success)', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Session Details List */}
          <Card variant="bordered">
            <CardHeader>
              <div>
                <h3 className="h4" style={{ marginBottom: '1rem' }}>Session Details</h3>
                {/* Time Range Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setTimeRange('week')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: timeRange === 'week' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: timeRange === 'week' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: timeRange === 'week' ? '600' : '400',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>This Week</span>
                    {timeRange === 'week' && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Avg: {averageAdherence}%
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTimeRange('7days')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: timeRange === '7days' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: timeRange === '7days' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: timeRange === '7days' ? '600' : '400',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>Last 7 Days</span>
                    {timeRange === '7days' && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Avg: {averageAdherence}%
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTimeRange('month')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: timeRange === 'month' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: timeRange === 'month' ? 'white' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: timeRange === 'month' ? '600' : '400',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>This Month</span>
                    {timeRange === 'month' && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Avg: {averageAdherence}%
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (isPaidUser) {
                        setTimeRange('year')
                      }
                    }}
                    disabled={!isPaidUser}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: timeRange === 'year' ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: timeRange === 'year' ? 'white' : 'var(--color-text)',
                      cursor: isPaidUser ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem',
                      fontWeight: timeRange === 'year' ? '600' : '400',
                      opacity: isPaidUser ? 1 : 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    title={!isPaidUser ? 'Yearly view is only available for paid users' : ''}
                  >
                    <span>Last Year {!isPaidUser && '🔒'}</span>
                    {timeRange === 'year' && isPaidUser && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        Avg: {averageAdherence}%
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {filteredSessions.length === 0 ? (
                  <p className="body-small text-secondary">No sessions found for this time range</p>
                ) : (
                  filteredSessions.map((session) => {
                        const adherenceColor = getAdherenceColor(session.adherence_percentage || 0)
                        return (
                          <div
                            key={session.id}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: 'var(--color-gray-50)',
                              borderLeft: `4px solid ${adherenceColor.color}`,
                              borderRadius: 'var(--radius-sm)',
                              display: 'grid',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="body-small" style={{ fontWeight: '600' }}>
                                {new Date(session.created_at).toLocaleDateString('en', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <Badge variant="ghost">
                                {adherenceColor.emoji} {Math.round(session.adherence_percentage || 0)}%
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={14} color="var(--color-success)" />
                                <span className="body-small text-secondary">
                                  Work: {Math.round(session.total_work_minutes)}m
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Coffee size={14} color="var(--color-warning)" />
                                <span className="body-small text-secondary">
                                  Break: {Math.round(session.total_break_minutes)}m
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Timer size={14} color="var(--color-primary)" />
                                <span className="body-small text-secondary">
                                  Goal: {session.goal_minutes}m
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}