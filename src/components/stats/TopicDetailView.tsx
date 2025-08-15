import { useState, useEffect, memo } from 'react'
import { timingStatsService } from '../../services/timingStatsService'
import { logger } from '../../utils/logger'
import { Badge } from '../ui'

interface ItemTimingStats {
  itemId: string
  content: string
  totalReviews: number
  perfectCount: number
  onTimeCount: number
  lateCount: number
  onTimePercentage: number
  lastReviewTiming: 'perfect' | 'onTime' | 'late' | null
  trend: 'improving' | 'declining' | 'stable'
}

interface TopicDetailViewProps {
  topicId: string
}

const ItemRow = memo(function ItemRow({ item }: { item: ItemTimingStats }) {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-success)'
    if (percentage >= 75) return 'var(--color-info)'
    if (percentage >= 60) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈'
      case 'declining': return '📉'
      default: return '➡️'
    }
  }

  const getTimingBadge = (timing: string | null) => {
    switch (timing) {
      case 'perfect': return { text: 'Perfect', variant: 'success' as const }
      case 'onTime': return { text: 'On Time', variant: 'info' as const }
      case 'late': return { text: 'Late', variant: 'warning' as const }
      default: return null
    }
  }

  return (
    <div style={{
      padding: '0.75rem',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Content */}
      <div style={{ flex: 1 }}>
        <p className="body" style={{ marginBottom: '0.25rem' }}>
          {item.content}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="body-small text-secondary">
            {item.totalReviews} reviews
          </span>
          {item.lastReviewTiming && (() => {
            const badge = getTimingBadge(item.lastReviewTiming)
            return badge && (
              <Badge variant={badge.variant} size="small">
                Last: {badge.text}
              </Badge>
            )
          })()}
        </div>
      </div>

      {/* Performance */}
      <div style={{ textAlign: 'right', minWidth: '120px' }}>
        <div style={{ 
          fontSize: '1.125rem', 
          fontWeight: 'bold',
          color: getPerformanceColor(item.onTimePercentage)
        }}>
          {item.onTimePercentage}%
        </div>
        <div className="body-small text-secondary">
          on-time
        </div>
      </div>

      {/* Trend */}
      <div style={{ fontSize: '1.25rem', minWidth: '30px', textAlign: 'center' }}>
        <span title={`Trend: ${item.trend}`}>
          {getTrendIcon(item.trend)}
        </span>
      </div>
    </div>
  )
})

export default function TopicDetailView({ topicId }: TopicDetailViewProps) {
  const [items, setItems] = useState<ItemTimingStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await timingStatsService.getTopicItemDetails(
          topicId,
          showAll ? 100 : 10
        )
        setItems(data)
      } catch (error) {
        logger.error('Error loading topic items:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [topicId, showAll])

  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ height: '60px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
        <div style={{ height: '60px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px', marginBottom: '0.5rem' }} />
        <div style={{ height: '60px', backgroundColor: 'var(--color-gray-100)', borderRadius: '4px' }} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="body text-secondary">No items in this topic yet.</p>
      </div>
    )
  }

  // Group items by performance
  const needsAttention = items.filter(i => i.onTimePercentage < 60)
  const goodPerformance = items.filter(i => i.onTimePercentage >= 60 && i.onTimePercentage < 90)
  const excellentPerformance = items.filter(i => i.onTimePercentage >= 90)

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: 'var(--color-gray-50)',
        borderRadius: 'var(--radius-sm)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
            {excellentPerformance.length}
          </div>
          <div className="body-small text-secondary">Excellent</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>
            {goodPerformance.length}
          </div>
          <div className="body-small text-secondary">Good</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
            {needsAttention.length}
          </div>
          <div className="body-small text-secondary">Needs Work</div>
        </div>
      </div>

      {/* Items List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {items.slice(0, showAll ? undefined : 10).map(item => (
          <ItemRow key={item.itemId} item={item} />
        ))}
      </div>

      {/* Show More Button */}
      {items.length > 10 && !showAll && (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Show All {items.length} Items
          </button>
        </div>
      )}
    </div>
  )
}