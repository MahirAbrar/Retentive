import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardContent, Button, Badge, useToast } from '../ui'
import type { Topic, LearningItem } from '../../types/database'
import { LEARNING_MODES, PRIORITY_LABELS } from '../../constants/learning'
import { topicsService } from '../../services/topicsFixed'
import { supabase } from '../../services/supabase'
import { calculateNextReview } from '../../utils/spacedRepetition'
import { useAuth } from '../../hooks/useAuthFixed'

interface TopicListProps {
  topics: Topic[]
  onDelete?: (topicId: string) => void
  loading?: boolean
}

export function TopicList({ topics, onDelete, loading }: TopicListProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [topicItems, setTopicItems] = useState<Record<string, LearningItem[]>>({})
  const [topicStats, setTopicStats] = useState<Record<string, { total: number; due: number }>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const { addToast } = useToast()
  const { user } = useAuth()

  // Load item counts for all topics on mount
  useEffect(() => {
    topics.forEach(topic => {
      loadTopicStats(topic.id)
    })
  }, [topics])

  const loadTopicStats = async (topicId: string) => {
    try {
      const { data, error } = await topicsService.getTopicItems(topicId)
      if (error) throw error
      
      const items = data || []
      const dueCount = items.filter(item => isDue(item)).length
      
      setTopicStats(prev => ({
        ...prev,
        [topicId]: { total: items.length, due: dueCount }
      }))
    } catch (error) {
      console.error('Error loading topic stats:', error)
    }
  }

  const toggleTopic = async (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
      
      // Load items if not already loaded
      if (!topicItems[topicId] && !loadingItems.has(topicId)) {
        setLoadingItems(prev => new Set(prev).add(topicId))
        
        try {
          const { data, error } = await topicsService.getTopicItems(topicId)
          if (error) throw error
          
          setTopicItems(prev => ({ ...prev, [topicId]: data || [] }))
          
          // Update stats after loading items
          const items = data || []
          const dueCount = items.filter(item => isDue(item)).length
          setTopicStats(prev => ({
            ...prev,
            [topicId]: { total: items.length, due: dueCount }
          }))
        } catch (error) {
          addToast('error', 'Failed to load items')
          console.error('Error loading items:', error)
        } finally {
          setLoadingItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(topicId)
            return newSet
          })
        }
      }
    }
    
    setExpandedTopics(newExpanded)
  }

  const handleStudyItem = async (item: LearningItem) => {
    if (!user) return
    
    setProcessingItems(prev => new Set(prev).add(item.id))
    
    try {
      const nextReview = calculateNextReview(item, 'good')
      
      const { error: updateError } = await supabase
        .from('learning_items')
        .update({
          review_count: item.review_count + 1,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReview.next_review_at,
          ease_factor: nextReview.ease_factor,
          interval_days: nextReview.interval_days
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      const { error: sessionError } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          learning_item_id: item.id,
          difficulty: 'good',
          reviewed_at: new Date().toISOString(),
          next_review_at: nextReview.next_review_at,
          interval_days: nextReview.interval_days
        })

      if (sessionError) throw sessionError

      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map(i => 
          i.id === item.id 
            ? {
                ...i,
                review_count: item.review_count + 1,
                last_reviewed_at: new Date().toISOString(),
                next_review_at: nextReview.next_review_at,
                ease_factor: nextReview.ease_factor,
                interval_days: nextReview.interval_days
              }
            : i
        )
      }))

      addToast('success', `Done! Next review: ${formatNextReview(nextReview.next_review_at)}`)
    } catch (error) {
      addToast('error', 'Failed to update item')
      console.error('Error updating item:', error)
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const formatNextReview = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMinutes < 60) return `${diffMinutes} minutes`
    if (diffHours < 24) return `${diffHours} hours`
    if (diffDays === 1) return 'tomorrow'
    if (diffDays < 7) return `in ${diffDays} days`
    return date.toLocaleDateString()
  }

  const getItemStatus = (item: LearningItem) => {
    if (!item.next_review_at) return { label: 'New', color: 'var(--color-info)' }
    
    const now = new Date()
    const reviewDate = new Date(item.next_review_at)
    
    if (reviewDate < now) return { label: 'Overdue', color: 'var(--color-error)' }
    if (reviewDate.toDateString() === now.toDateString()) return { label: 'Due today', color: 'var(--color-warning)' }
    return { label: formatNextReview(item.next_review_at), color: 'var(--color-success)' }
  }

  const isDue = (item: LearningItem) => {
    if (!item.next_review_at) return true
    return new Date(item.next_review_at) <= new Date()
  }

  const countDueItems = (topicId: string) => {
    const items = topicItems[topicId] || []
    return items.filter(isDue).length
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading topics...</p>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <Card variant="bordered">
        <CardContent>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 className="h4" style={{ marginBottom: '1rem' }}>No topics yet</h3>
            <p className="body text-secondary" style={{ marginBottom: '2rem' }}>
              Create your first topic to start learning
            </p>
            <Link to="/topics/new">
              <Button variant="primary">Create Topic</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {topics.map((topic) => {
        const isExpanded = expandedTopics.has(topic.id)
        const items = topicItems[topic.id] || []
        const stats = topicStats[topic.id] || { total: 0, due: 0 }
        
        return (
          <Card key={topic.id} variant="bordered">
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="h4">{topic.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Badge variant={topic.learning_mode === 'cram' ? 'warning' : 'info'}>
                    {LEARNING_MODES[topic.learning_mode].label}
                  </Badge>
                  <Badge variant="ghost">
                    {PRIORITY_LABELS[topic.priority]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div>
                    <p className="body-small text-secondary">Items</p>
                    <p className="body">{stats.total}</p>
                  </div>
                  <div>
                    <p className="body-small text-secondary">Due</p>
                    <p className="body">{stats.due}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    variant="primary" 
                    size="small"
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {isExpanded ? 'Collapse' : 'View Items'}
                  </Button>
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="small"
                      onClick={() => onDelete(topic.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-gray-200)', paddingTop: '1.5rem' }}>
                  {loadingItems.has(topic.id) ? (
                    <p className="body-small text-secondary">Loading items...</p>
                  ) : items.length === 0 ? (
                    <p className="body-small text-secondary">No items in this topic</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {items.map((item) => {
                        const status = getItemStatus(item)
                        const isProcessing = processingItems.has(item.id)
                        const itemIsDue = isDue(item)
                        
                        return (
                          <div 
                            key={item.id} 
                            style={{ 
                              padding: '0.75rem',
                              backgroundColor: 'var(--color-gray-50)',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <p className="body-small">{item.content}</p>
                              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                <span className="body-small" style={{ color: status.color }}>
                                  {status.label}
                                </span>
                                <span className="body-small text-secondary">
                                  Reviews: {item.review_count}
                                </span>
                              </div>
                            </div>
                            {itemIsDue ? (
                              <Button 
                                variant="primary" 
                                size="small"
                                onClick={() => handleStudyItem(item)}
                                loading={isProcessing}
                                disabled={isProcessing}
                              >
                                {item.review_count === 0 ? 'Study' : 'Revise'}
                              </Button>
                            ) : (
                              <span className="body-small" style={{ color: 'var(--color-success)' }}>
                                {formatNextReview(item.next_review_at || '')}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}