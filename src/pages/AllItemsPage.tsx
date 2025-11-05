import { logger } from '../utils/logger'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import type { LearningItem, Topic } from '../types/database'
import { formatNextReview } from '../utils/formatters'
import { spacedRepetitionGamified } from '../services/spacedRepetitionGamified'
import { gamificationService } from '../services/gamificationService'
import { useAchievements } from '../hooks/useAchievements'

interface ItemWithTopic extends LearningItem {
  topic?: Topic
}

export function AllItemsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const { showAchievements } = useAchievements()

  const [items, setItems] = useState<ItemWithTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(50) // Start with 50 items
  const [searchTerm] = useState('')

  const loadAllItems = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('learning_items')
        .select(`
          *,
          topic:topics(*)
        `)
        .eq('user_id', user.id)
        .order('next_review_at', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      addToast('error', 'Failed to load items')
      logger.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }, [user, addToast])

  useEffect(() => {
    if (user) {
      loadAllItems()
    }
  }, [user, loadAllItems])

  const handleStudyItem = async (item: ItemWithTopic) => {
    if (!user) return

    // Add to processing set
    setProcessingItems(prev => new Set(prev).add(item.id))

    try {
      const reviewedAt = new Date()

      // Process review with gamified algorithm (default to "good" for one-click)
      const reviewResult = spacedRepetitionGamified.processReview(item, 'good')
      const pointsBreakdown = spacedRepetitionGamified.calculatePoints(item, reviewResult)
      const totalPoints = pointsBreakdown.basePoints + pointsBreakdown.streakBonus + pointsBreakdown.timeBonus

      const updatedItem = {
        ...item,
        review_count: item.review_count + 1,
        last_reviewed_at: reviewedAt.toISOString(),
        next_review_at: reviewResult.nextReviewDate.toISOString(),
        interval_days: reviewResult.intervalDays,
        ease_factor: reviewResult.easeFactor
      }

      // Update the item
      const { error: updateError } = await supabase
        .from('learning_items')
        .update({
          review_count: updatedItem.review_count,
          last_reviewed_at: updatedItem.last_reviewed_at,
          next_review_at: updatedItem.next_review_at,
          ease_factor: updatedItem.ease_factor,
          interval_days: updatedItem.interval_days
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      // Create review session record with points
      const { error: sessionError } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          learning_item_id: item.id,
          difficulty: 'good',
          reviewed_at: reviewedAt.toISOString(),
          next_review_at: updatedItem.next_review_at,
          interval_days: reviewResult.intervalDays,
          points_earned: totalPoints,
          timing_bonus: pointsBreakdown.timeBonus,
          combo_count: gamificationService.getComboBonus() > 0 ? 1 : 0
        })

      if (sessionError) throw sessionError

      // Update user points and check for achievements
      const result = await gamificationService.updateUserPoints(user.id, totalPoints, {
        itemId: item.id,
        wasPerfectTiming: pointsBreakdown.isPerfectTiming,
        reviewCount: updatedItem.review_count
      })

      // Show achievements if any were unlocked
      if (result && result.newAchievements && result.newAchievements.length > 0) {
        showAchievements(result.newAchievements)
      }

      // Update local state
      setItems(prev => prev.map(i =>
        i.id === item.id ? updatedItem : i
      ))

      // Show success with points
      const pointsMessage = pointsBreakdown.isPerfectTiming
        ? `+${totalPoints} pts (Perfect Timing! ⚡)`
        : `+${totalPoints} pts`

      addToast('success', `${pointsMessage} • Next review: ${formatNextReview(updatedItem.next_review_at)}`)
    } catch (error) {
      addToast('error', 'Failed to update item')
      logger.error('Error updating item:', error)
    } finally {
      // Remove from processing set
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  // formatNextReview is now imported from utils/formatters

  const getItemStatus = useCallback((item: LearningItem) => {
    if (!item.next_review_at) return { label: 'New', color: 'var(--color-info)' }
    
    const now = new Date()
    const reviewDate = new Date(item.next_review_at)
    
    if (reviewDate < now) return { label: 'Overdue', color: 'var(--color-error)' }
    if (reviewDate.toDateString() === now.toDateString()) return { label: 'Due today', color: 'var(--color-warning)' }
    return { label: formatNextReview(item.next_review_at), color: 'var(--color-success)' }
  }, [])

  const isDue = useCallback((item: LearningItem) => {
    if (!item.next_review_at) return true
    return new Date(item.next_review_at) <= new Date()
  }, [])
  
  // Memoize filtered and visible items
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    const term = searchTerm.toLowerCase()
    return items.filter(item => 
      item.content.toLowerCase().includes(term) ||
      item.topic?.name?.toLowerCase().includes(term)
    )
  }, [items, searchTerm])
  
  // const _visibleItems = useMemo(() => {
  //   return filteredItems.slice(0, visibleCount)
  // }, [filteredItems, visibleCount])
  
  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 50, filteredItems.length))
  }, [filteredItems.length])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading items...</p>
      </div>
    )
  }

  const dueItems = items.filter(isDue)
  const upcomingItems = items.filter(item => !isDue(item))

  return (
    <div style={{ maxWidth: 'var(--container-lg)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">All Learning Items</h1>
        <p className="body text-secondary">
          {dueItems.length} items due for review • {items.length} total items
        </p>
      </header>

      {dueItems.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h3 className="h4" style={{ marginBottom: '1rem' }}>Due for Review</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {dueItems.map((item) => {
              const status = getItemStatus(item)
              const isProcessing = processingItems.has(item.id)
              
              return (
                <Card key={item.id} variant="bordered">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p className="body">{item.content}</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          {item.topic && (
                            <span className="body-small text-secondary">
                              {item.topic.name}
                            </span>
                          )}
                          <span className="body-small" style={{ color: status.color }}>
                            {status.label}
                          </span>
                          <span className="body-small text-secondary">
                            Reviews: {item.review_count}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="primary" 
                        size="small"
                        onClick={() => handleStudyItem(item)}
                        loading={isProcessing}
                        disabled={isProcessing}
                      >
                        {item.review_count === 0 ? 'Study' : 'Revise'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {upcomingItems.length > 0 && (
        <div>
          <h3 className="h4" style={{ marginBottom: '1rem' }}>Upcoming</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {upcomingItems.map((item) => {
              const status = getItemStatus(item)
              
              return (
                <Card key={item.id} variant="bordered" style={{ opacity: 0.7 }}>
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p className="body">{item.content}</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          {item.topic && (
                            <span className="body-small text-secondary">
                              {item.topic.name}
                            </span>
                          )}
                          <span className="body-small" style={{ color: status.color }}>
                            {status.label}
                          </span>
                          <span className="body-small text-secondary">
                            Reviews: {item.review_count}
                          </span>
                        </div>
                      </div>
                      <span className="body-small text-secondary">
                        Not due yet
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          {/* Load more button */}
          {filteredItems.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Button 
                variant="secondary" 
                onClick={handleLoadMore}
              >
                Load More ({filteredItems.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <Card variant="bordered">
          <CardContent>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="body text-secondary">No learning items yet.</p>
              <Button 
                variant="primary" 
                style={{ marginTop: '1rem' }}
                onClick={() => navigate('/topics/new')}
              >
                Create Your First Topic
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}