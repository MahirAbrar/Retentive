import { useEffect, useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Timer, TrendingUp, Clock, Coffee } from 'lucide-react'
import { focusTimerService, getAdherenceColor } from '../../services/focusTimerService'

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
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    averageAdherence: 0,
    bestAdherence: 0,
    totalFocusTime: 0,
  })
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const loadFocusStats = async () => {
      try {
        setLoading(true)
        // Get last 30 days of stats
        const stats30Days = await focusTimerService.getUserStats(userId, 30)
        setStats(stats30Days)

        // Get last 7 sessions for chart
        const sessions = await focusTimerService.getUserSessions(userId, 7)
        // Format for chart
        const formattedSessions = sessions.map((s) => ({
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
  }, [userId])

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

  const adherenceColor = getAdherenceColor(stats.averageAdherence)

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Overview Stats */}
      <Card variant="bordered">
        <CardHeader>
          <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Timer size={20} />
            Focus & Adherence (Last 30 Days)
          </h3>
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
              <p className="h3">{stats.totalSessions}</p>
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
                  {Math.round(stats.averageAdherence)}%
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
                {Math.round(stats.bestAdherence)}%
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
                <p className="h3">{Math.floor(stats.totalWorkMinutes / 60)}</p>
                <span className="body-small text-secondary">h</span>
                <p className="h3">{stats.totalWorkMinutes % 60}</p>
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
                <p className="h3">{Math.floor(stats.totalBreakMinutes / 60)}</p>
                <span className="body-small text-secondary">h</span>
                <p className="h3">{stats.totalBreakMinutes % 60}</p>
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
                {stats.totalBreakMinutes > 0
                  ? (stats.totalWorkMinutes / stats.totalBreakMinutes).toFixed(1)
                  : stats.totalWorkMinutes}
                <span className="body-small text-secondary">:1</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      {recentSessions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Adherence Trend */}
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4">Adherence Trend</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={recentSessions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: '%', angle: 0, position: 'insideTopLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-gray-200)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Adherence']}
                  />
                  <Line
                    type="monotone"
                    dataKey="adherence"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-success)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Work vs Break Time */}
          <Card variant="bordered">
            <CardHeader>
              <h3 className="h4">Work vs Break Time</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recentSessions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-gray-200)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    formatter={(value: number) => [`${value} min`, '']}
                  />
                  <Bar dataKey="work" fill="var(--color-success)" name="Work" />
                  <Bar dataKey="break" fill="var(--color-warning)" name="Break" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}