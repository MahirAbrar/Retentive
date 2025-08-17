import { useState, useEffect } from 'react'
import { dataService } from '../../services/dataService'
import { logger } from '../../utils/logger'

interface ArchiveInsightsProps {
  topicId: string
  topicName: string
  createdAt: string
  archiveDate?: string | null
}

interface InsightData {
  totalReviews: number
  daysToMastery: number
  daysSinceArchived: number | null
  masteredCount: number
  totalItems: number
}

export function ArchiveInsights({ topicId, createdAt, archiveDate }: ArchiveInsightsProps) {
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInsights = async () => {
      try {
        // Get all items for this topic
        const { data: items } = await dataService.getTopicItems(topicId)
        if (!items) return

        // Calculate mastered items (only items that were actually mastered, not just archived)
        const masteredItems = items.filter(item => 
          item.mastery_status === 'mastered' || 
          item.mastery_status === 'maintenance' ||
          (item.mastery_status === 'archived' && item.review_count >= 5) // Only count archived items that were mastered first
        )

        // Get review sessions for all items (to show total effort)
        let totalReviews = 0
        let earliestMastery: Date | null = null
        
        for (const item of items) {
          totalReviews += item.review_count || 0
          
          // Track earliest mastery date (only for actually mastered items)
          if (masteredItems.includes(item) && item.last_reviewed_at) {
            const reviewDate = new Date(item.last_reviewed_at)
            if (!earliestMastery || reviewDate < earliestMastery) {
              earliestMastery = reviewDate
            }
          }
        }

        // Calculate days to mastery (from topic creation to first mastered item)
        const topicCreatedDate = new Date(createdAt)
        const daysToMastery = earliestMastery 
          ? Math.floor((earliestMastery.getTime() - topicCreatedDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0

        // Calculate days since archived
        const daysSinceArchived = archiveDate
          ? Math.floor((Date.now() - new Date(archiveDate).getTime()) / (1000 * 60 * 60 * 24))
          : null

        setInsights({
          totalReviews,
          daysToMastery,
          daysSinceArchived,
          masteredCount: masteredItems.length,
          totalItems: items.length
        })
      } catch (error) {
        logger.error('Error loading archive insights:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [topicId, createdAt, archiveDate])

  if (loading || !insights) {
    return null
  }

  return (
    <div style={{ 
      marginTop: '1.5rem', 
      padding: '1rem', 
      backgroundColor: 'var(--color-gray-50)', 
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--color-gray-200)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.25rem' }}>📊</span>
        <h4 className="body" style={{ fontWeight: '600' }}>Archive Insights</h4>
      </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {insights.daysToMastery > 0 && (
            <div>
              <p className="body-small text-secondary">Time to Mastery</p>
              <p className="body" style={{ fontWeight: '500' }}>
                {insights.daysToMastery} day{insights.daysToMastery !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          
          <div>
            <p className="body-small text-secondary">Total Reviews</p>
            <p className="body" style={{ fontWeight: '500' }}>
              {insights.totalReviews} review{insights.totalReviews !== 1 ? 's' : ''}
            </p>
          </div>
          
          {insights.daysSinceArchived !== null && (
            <div>
              <p className="body-small text-secondary">Archived For</p>
              <p className="body" style={{ fontWeight: '500' }}>
                {insights.daysSinceArchived === 0 
                  ? 'Today' 
                  : `${insights.daysSinceArchived} day${insights.daysSinceArchived !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}
          
          <div>
            <p className="body-small text-secondary">Mastery Rate</p>
            <p className="body" style={{ fontWeight: '500' }}>
              {insights.totalItems > 0 
                ? `${Math.round((insights.masteredCount / insights.totalItems) * 100)}%`
                : '0%'}
            </p>
          </div>
        </div>
        
        {insights.masteredCount === insights.totalItems && insights.totalItems > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem',
            backgroundColor: 'var(--color-success-light)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <p className="body-small" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎉</span>
              <strong>Perfect mastery!</strong> You've mastered all items in this topic.
            </p>
          </div>
        )}
    </div>
  )
}