import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../ui'
import { timingStatsService } from '../../services/timingStatsService'
import { useAuth } from '../../hooks/useAuthFixed'
import { logger } from '../../utils/logger'
import { Trophy, CheckCircle, BarChart3, AlertTriangle, BookOpen } from 'lucide-react'

interface TopicTimingStats {
  topicId: string
  topicName: string
  totalItems: number
  totalReviews: number
  perfectCount: number
  onTimeCount: number
  lateCount: number
  onTimePercentage: number
  itemsNeedingAttention: number
}

// Lazy load the detail view for performance
const TopicDetailView = lazy(() => import('./TopicDetailView'))

const TopicTimingCard = memo(function TopicTimingCard({ 
  topic, 
  expanded, 
  onToggle 
}: { 
  topic: TopicTimingStats
  expanded: boolean
  onToggle: () => void 
}) {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-success)'
    if (percentage >= 75) return 'var(--color-info)'
    if (percentage >= 60) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 90) return Trophy
    if (percentage >= 75) return CheckCircle
    if (percentage >= 60) return BarChart3
    return AlertTriangle
  }

  return (
    <Card variant="bordered" style={{ marginBottom: '1rem' }}>
      <CardContent>
        <div 
          onClick={onToggle}
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} />
              <h4 className="h4" style={{ marginBottom: '0.25rem' }}>
                {topic.topicName}
              </h4>
              <p className="body-small text-secondary" style={{ marginLeft: '28px' }}>
                {topic.totalItems} items • {topic.totalReviews} reviews
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getPerformanceColor(topic.onTimePercentage) }}>
                  {topic.onTimePercentage}%
                </span>
                {(() => {
                  const Icon = getPerformanceIcon(topic.onTimePercentage)
                  return <Icon size={24} color={getPerformanceColor(topic.onTimePercentage)} />
                })()}
              </div>
              <p className="body-small text-secondary">on-time rate</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ 
            height: '8px',
            backgroundColor: 'var(--color-gray-200)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${topic.onTimePercentage}%`,
              height: '100%',
              backgroundColor: getPerformanceColor(topic.onTimePercentage),
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Stats Summary */}
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--color-success)' }}>
              Perfect: {topic.perfectCount} ({Math.round((topic.perfectCount / topic.totalReviews) * 100)}%)
            </span>
            <span style={{ color: 'var(--color-info)' }}>
              On-time: {topic.onTimeCount} ({Math.round((topic.onTimeCount / topic.totalReviews) * 100)}%)
            </span>
            <span style={{ color: 'var(--color-error)' }}>
              Late: {topic.lateCount} ({Math.round((topic.lateCount / topic.totalReviews) * 100)}%)
            </span>
          </div>

          {/* Attention Badge */}
          {topic.itemsNeedingAttention > 0 && (
            <Badge variant="warning">
              {topic.itemsNeedingAttention} items need attention (&lt;60% on-time)
            </Badge>
          )}

          {/* Expand/Collapse Indicator */}
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {expanded ? '▲ Hide Details' : '▼ Show Details'}
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="body-small text-secondary">Loading item details...</p>
              </div>
            }>
              <TopicDetailView topicId={topic.topicId} />
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

const dateRangeOptions = [
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'year', label: 'Year', days: 365 },
  { value: 'all', label: 'All Time', days: undefined },
] as const

export function TimingPerformance() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<string>('month')
  const [summary, setSummary] = useState({
    totalReviews: 0,
    perfectCount: 0,
    onTimeCount: 0,
    lateCount: 0,
    overallPercentage: 0
  })
  const [topics, setTopics] = useState<TopicTimingStats[]>([])
  const [expandedTopics, setExpandedTopics] = useState(new Set<string>())
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(true)

  const selectedDays = dateRangeOptions.find(o => o.value === dateRange)?.days

  // Load summary and topics when date range changes
  useEffect(() => {
    if (!user) return

    setSummaryLoading(true)
    setTopicsLoading(true)

    const loadData = async () => {
      try {
        const [summaryData, topicsData] = await Promise.all([
          timingStatsService.getTimingSummary(user.id, selectedDays),
          timingStatsService.getTopicTimingStats(user.id, selectedDays),
        ])
        setSummary(summaryData)
        setTopics(topicsData)
      } catch (error) {
        logger.error('Error loading timing stats:', error)
      } finally {
        setSummaryLoading(false)
        setTopicsLoading(false)
      }
    }

    loadData()
  }, [user, selectedDays])

  const toggleTopic = useCallback((topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }, [])

  // Sort topics by performance (best to worst)
  const sortedTopics = [...topics].sort((a, b) => b.onTimePercentage - a.onTimePercentage)

  const getOverallColor = (percentage: number) => {
    if (percentage >= 80) return 'var(--color-success)'
    if (percentage >= 60) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Section Header */}
      <Card variant="bordered">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} />
              <h3 className="h4">Timing Performance</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {dateRangeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: dateRange === value ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: dateRange === value ? 'var(--color-secondary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: dateRange === value ? '600' : '400',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall Summary */}
          {summaryLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ height: '4rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px', marginBottom: '1rem' }} />
              <div style={{ height: '1rem', width: '200px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold',
                color: getOverallColor(summary.overallPercentage)
              }}>
                {summary.overallPercentage}%
              </div>
              <p className="body" style={{ marginBottom: '1rem' }}>
                Overall On-Time Rate
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                <div>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                    {summary.perfectCount}
                  </span>
                  <span className="body-small text-secondary"> perfect</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>
                    {summary.onTimeCount}
                  </span>
                  <span className="body-small text-secondary"> on-time</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
                    {summary.lateCount}
                  </span>
                  <span className="body-small text-secondary"> late</span>
                </div>
              </div>
              <p className="body-small text-secondary" style={{ marginTop: '1rem' }}>
                Based on {summary.totalReviews} reviews{selectedDays ? ` in the last ${selectedDays === 7 ? 'week' : selectedDays === 30 ? 'month' : 'year'}` : ''}
              </p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Topic Cards */}
      {topicsLoading ? (
        <div style={{ marginTop: '1rem' }}>
          {[1, 2, 3].map(i => (
            <Card key={i} variant="bordered" style={{ marginBottom: '1rem' }}>
              <CardContent>
                <div style={{ height: '100px', backgroundColor: 'var(--color-gray-100)', borderRadius: '8px' }} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <Card variant="bordered" style={{ marginTop: '1rem' }}>
          <CardContent>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="body text-secondary">No timing data available yet.</p>
              <p className="body-small text-secondary">Complete some reviews to see your timing performance!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {sortedTopics.map(topic => (
            <TopicTimingCard
              key={topic.topicId}
              topic={topic}
              expanded={expandedTopics.has(topic.topicId)}
              onToggle={() => toggleTopic(topic.topicId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}