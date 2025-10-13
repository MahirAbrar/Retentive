import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button, Card, CardContent, useToast, Pagination, PaginationInfo } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import { usePagination } from '../hooks/usePagination'
import { LEARNING_MODES, PRIORITY_LABELS } from '../constants/learning'
import type { Topic, LearningItem } from '../types/database'

export function TopicDetailView() {
  const { topicId } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [topic, setTopic] = useState<Topic | null>(null)
  const [items, setItems] = useState<LearningItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadTopicAndItems = useCallback(async () => {
    if (!topicId) return
    
    setLoading(true)
    try {
      const [topicResponse, itemsResponse] = await Promise.all([
        topicsService.getTopic(topicId),
        topicsService.getTopicItems(topicId)
      ])

      if (topicResponse.error || !topicResponse.data) {
        addToast('error', 'Topic not found')
        navigate('/topics')
        return
      }

      setTopic(topicResponse.data)
      setItems(itemsResponse.data || [])
    } catch (_error) {
      addToast('error', 'Failed to load topic')
      navigate('/topics')
    } finally {
      setLoading(false)
    }
  }, [topicId, addToast, navigate])

  useEffect(() => {
    if (topicId && user) {
      loadTopicAndItems()
    }
  }, [topicId, user, loadTopicAndItems])

  // Pagination
  const {
    currentPage,
    totalPages,
    currentItems,
    isFirstPage,
    isLastPage,
    nextPage,
    previousPage,
    goToPage,
    setItemsPerPage,
    itemsPerPage,
    startIndex,
    endIndex
  } = usePagination<LearningItem>(items, { itemsPerPage: 20 })

  const formatDate = (dateString: string | null, item?: LearningItem) => {
    // Always show "Not reviewed yet" for items with 0 reviews
    if (item && item.review_count === 0) return 'Not reviewed yet'
    if (!dateString) return 'Not reviewed yet'

    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`

    return date.toLocaleDateString()
  }

  const getStatusColor = (item: LearningItem) => {
    // Items with 0 reviews are new/unreviewed
    if (item.review_count === 0) return 'var(--color-gray-500)'
    if (!item.next_review_at) return 'var(--color-gray-500)'

    const now = new Date()
    const reviewDate = new Date(item.next_review_at)

    if (reviewDate < now) return 'var(--color-error)'
    if (reviewDate.toDateString() === now.toDateString()) return 'var(--color-warning)'
    return 'var(--color-success)'
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading topic...</p>
      </div>
    )
  }

  if (!topic) {
    return null
  }

  return (
    <div style={{ maxWidth: 'var(--container-lg)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <Link to="/topics" style={{ textDecoration: 'none', color: 'var(--color-text-secondary)' }}>
          <span className="body-small">← Back to Topics</span>
        </Link>
        <h1 className="h2" style={{ marginTop: '1rem' }}>{topic.name}</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <span className="body-small text-secondary">
            {LEARNING_MODES[topic.learning_mode].label}
          </span>
          <span className="body-small text-secondary">•</span>
          <span className="body-small text-secondary">
            Priority: {PRIORITY_LABELS[topic.priority]}
          </span>
          <span className="body-small text-secondary">•</span>
          <span className="body-small text-secondary">
            {items.length} items
          </span>
        </div>
      </header>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Link to={`/topics/${topicId}/study`}>
          <Button variant="primary">Study All Due Items</Button>
        </Link>
        <Button variant="ghost" onClick={() => navigate(`/topics/${topicId}/edit`)}>
          Edit Topic
        </Button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {items.length === 0 ? (
          <Card variant="bordered">
            <CardContent>
              <p className="body text-secondary" style={{ textAlign: 'center' }}>
                No items in this topic yet
              </p>
            </CardContent>
          </Card>
        ) : (
          currentItems.map((item) => (
            <Card key={item.id} variant="bordered">
              <CardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p className="body">{item.content}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span className="body-small text-secondary">
                        Reviews: {item.review_count}
                      </span>
                      <span
                        className="body-small"
                        style={{ color: getStatusColor(item) }}
                      >
                        {formatDate(item.next_review_at, item)}
                      </span>
                      {item.ease_factor < 2.0 && (
                        <span className="body-small" style={{ color: 'var(--color-warning)' }}>
                          Difficult
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button 
                      variant="ghost" 
                      size="small"
                      onClick={() => navigate(`/study/${item.id}`)}
                    >
                      Study
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Pagination Controls */}
      {items.length > itemsPerPage && (
        <div style={{ marginTop: '2rem' }}>
          <PaginationInfo 
            startIndex={startIndex} 
            endIndex={endIndex} 
            totalItems={items.length} 
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            isFirstPage={isFirstPage}
            isLastPage={isLastPage}
            onNext={nextPage}
            onPrevious={previousPage}
          />
          
          {/* Items per page selector */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginTop: '1rem'
          }}>
            <label className="body-small text-secondary">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer'
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}