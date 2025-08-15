import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../ui'
import { timingStatsService } from '../../services/timingStatsService'
import { useAuth } from '../../hooks/useAuthFixed'
import { logger } from '../../utils/logger'

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

  const getPerformanceEmoji = (percentage: number) => {
    if (percentage >= 90) return '🏆'
    if (percentage >= 75) return '✅'
    if (percentage >= 60) return '📊'
    return '⚠️'
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
            <div>
              <h4 className="h4" style={{ marginBottom: '0.25rem' }}>
                📚 {topic.topicName}
              </h4>
              <p className="body-small text-secondary">
                {topic.totalItems} items • {topic.totalReviews} reviews
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getPerformanceColor(topic.onTimePercentage) }}>
                {topic.onTimePercentage}% {getPerformanceEmoji(topic.onTimePercentage)}
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

export function TimingPerformance() {
  const { user } = useAuth()
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
  const [sortBy, setSortBy] = useState<'performance' | 'name' | 'reviews'>('performance')

  // Load summary immediately (cached)
  useEffect(() => {
    if (!user) return

    const loadSummary = async () => {
      try {
        const data = await timingStatsService.getTimingSummary(user.id)
        setSummary(data)
      } catch (error) {
        logger.error('Error loading timing summary:', error)
      } finally {
        setSummaryLoading(false)
      }
    }

    loadSummary()
  }, [user])

  // Load topic list after summary
  useEffect(() => {
    if (!user) return

    const loadTopics = async () => {
      try {
        const data = await timingStatsService.getTopicTimingStats(user.id)
        setTopics(data)
      } catch (error) {
        logger.error('Error loading topic timing stats:', error)
      } finally {
        setTopicsLoading(false)
      }
    }

    loadTopics()
  }, [user])

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

  // Sort topics based on selected criteria
  const sortedTopics = [...topics].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return b.onTimePercentage - a.onTimePercentage
      case 'name':
        return a.topicName.localeCompare(b.topicName)
      case 'reviews':
        return b.totalReviews - a.totalReviews
      default:
        return 0
    }
  })

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
          <h3 className="h4">📊 Timing Performance</h3>
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
                Based on {summary.totalReviews} reviews in the last 30 days
              </p>
            </div>
          )}

          {/* Sort Options */}
          {!topicsLoading && topics.length > 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              justifyContent: 'center',
              marginTop: '2rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-border)'
            }}>
              <button
                onClick={() => setSortBy('performance')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: sortBy === 'performance' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: sortBy === 'performance' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                By Performance
              </button>
              <button
                onClick={() => setSortBy('name')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: sortBy === 'name' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: sortBy === 'name' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                By Name
              </button>
              <button
                onClick={() => setSortBy('reviews')}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: sortBy === 'reviews' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: sortBy === 'reviews' ? 'white' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                By Reviews
              </button>
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