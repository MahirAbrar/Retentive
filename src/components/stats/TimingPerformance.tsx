import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import { Card, CardHeader, CardContent, Badge } from '../ui'
import { timingStatsService } from '../../services/timingStatsService'
import { useAuth } from '../../hooks/useAuth'
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

  const perfectPct = topic.totalReviews > 0 ? Math.round((topic.perfectCount / topic.totalReviews) * 100) : 0
  const onTimePct = topic.totalReviews > 0 ? Math.round((topic.onTimeCount / topic.totalReviews) * 100) : 0
  const latePct = topic.totalReviews > 0 ? Math.round((topic.lateCount / topic.totalReviews) * 100) : 0
  return (
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      <div
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          padding: '0.625rem 0',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <BookOpen size={14} style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topic.topicName}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
              {topic.totalItems} items · {topic.totalReviews} reviews
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
            {(() => {
              const Icon = getPerformanceIcon(topic.onTimePercentage)
              return <Icon size={14} color={getPerformanceColor(topic.onTimePercentage)} />
            })()}
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: getPerformanceColor(topic.onTimePercentage),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {topic.onTimePercentage}%
            </span>
            <span style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              lineHeight: 1,
              display: 'inline-block',
            }}>
              ▾
            </span>
          </div>
        </div>

        {/* Progress bar — thinner */}
        <div style={{
          height: '3px',
          backgroundColor: 'var(--color-gray-200)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${topic.onTimePercentage}%`,
            height: '100%',
            backgroundColor: getPerformanceColor(topic.onTimePercentage),
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Stats line + optional attention flag */}
        <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-success)' }}>Perfect {topic.perfectCount} ({perfectPct}%)</span>
          <span style={{ color: 'var(--color-info)' }}>On-time {topic.onTimeCount} ({onTimePct}%)</span>
          <span style={{ color: 'var(--color-error)' }}>Late {topic.lateCount} ({latePct}%)</span>
          {topic.itemsNeedingAttention > 0 && (
            <Badge variant="warning">
              {topic.itemsNeedingAttention} need attention
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p className="body-small text-secondary">Loading item details...</p>
            </div>
          }>
            <TopicDetailView topicId={topic.topicId} />
          </Suspense>
        </div>
      )}
    </div>
  )
})

const dateRangeOptions = [
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'year', label: 'Year', days: 365 },
  { value: 'all', label: 'All Time', days: undefined },
] as const

const TOPICS_PREVIEW_LIMIT = 8

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
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [showAllTopics, setShowAllTopics] = useState(false)

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
            <button
              type="button"
              onClick={() => setSectionExpanded(prev => !prev)}
              aria-expanded={sectionExpanded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <BarChart3 size={20} />
              <h3 className="h4" style={{ marginBottom: 0 }}>Timing Performance</h3>
              {!summaryLoading && !sectionExpanded && (
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: getOverallColor(summary.overallPercentage),
                    fontWeight: 600,
                    marginLeft: '0.5rem',
                  }}
                >
                  {summary.overallPercentage}%
                </span>
              )}
              <span
                aria-hidden="true"
                style={{
                  fontSize: '1.25rem',
                  color: 'var(--color-text-secondary)',
                  transition: 'transform 0.2s ease',
                  transform: sectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  lineHeight: 1,
                  marginLeft: '0.25rem',
                }}
              >
                ▾
              </span>
            </button>
            {sectionExpanded && (
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
            )}
          </div>
        </CardHeader>
        {sectionExpanded && (
          <CardContent>
            {summaryLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                <div style={{ height: '1.75rem', width: '4rem', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px' }} />
                <div style={{ height: '0.875rem', width: '160px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px' }} />
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.25rem 0',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    color: getOverallColor(summary.overallPercentage),
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {summary.overallPercentage}%
                  </span>
                  <span className="body-small text-secondary">Overall on-time rate</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' }}>
                  <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.75rem', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: 'var(--color-success)' }}>
                      <strong>{summary.perfectCount}</strong> perfect
                    </span>
                    <span style={{ color: 'var(--color-info)' }}>
                      <strong>{summary.onTimeCount}</strong> on-time
                    </span>
                    <span style={{ color: 'var(--color-error)' }}>
                      <strong>{summary.lateCount}</strong> late
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                    {summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'}{selectedDays ? ` · last ${selectedDays === 7 ? 'week' : selectedDays === 30 ? 'month' : 'year'}` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* By topic — nested under the same Card so the breakdowns read as children */}
            {!summaryLoading && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    flex: '0 0 auto',
                  }}>
                    By topic
                  </span>
                  <hr style={{
                    flex: '1 1 auto',
                    border: 0,
                    borderTop: '1px solid var(--color-border)',
                    margin: 0,
                    alignSelf: 'center',
                  }} />
                </div>
                {topicsLoading ? (
                  <div>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        borderTop: '1px solid var(--color-border)',
                        padding: '0.75rem 0',
                      }}>
                        <div style={{ height: '40px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px' }} />
                      </div>
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <p className="body-small text-secondary" style={{ padding: '1rem 0', textAlign: 'center' }}>
                    No timing data available yet. Complete some reviews to see your timing performance.
                  </p>
                ) : (
                  <>
                    {(showAllTopics ? sortedTopics : sortedTopics.slice(0, TOPICS_PREVIEW_LIMIT)).map(topic => (
                      <TopicTimingCard
                        key={topic.topicId}
                        topic={topic}
                        expanded={expandedTopics.has(topic.topicId)}
                        onToggle={() => toggleTopic(topic.topicId)}
                      />
                    ))}
                    {sortedTopics.length > TOPICS_PREVIEW_LIMIT && (
                      <div style={{ textAlign: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                        <button
                          onClick={() => setShowAllTopics(prev => !prev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                          }}
                        >
                          {showAllTopics ? 'Show fewer' : `Show all ${sortedTopics.length}`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}