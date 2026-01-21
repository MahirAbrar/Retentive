import { logger } from '../utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import type { LearningItem } from '../types/database'
import { formatNextReview } from '../utils/formatters'
import { spacedRepetitionGamified } from '../services/spacedRepetitionGamified'
import { gamificationService } from '../services/gamificationService'
import { useAchievements } from '../hooks/useAchievements'

export function StudyPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const { showAchievements } = useAchievements()

  const [item, setItem] = useState<LearningItem | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadItem = useCallback(async () => {
    if (!itemId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('learning_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error || !data) {
        addToast('error', 'Item not found')
        navigate('/topics')
        return
      }

      setItem(data)
    } catch {
      addToast('error', 'Failed to load item')
      navigate('/topics')
    } finally {
      setLoading(false)
    }
  }, [itemId, addToast, navigate])

  useEffect(() => {
    if (itemId && user) {
      loadItem()
    }
  }, [itemId, user, loadItem])

  const handleReview = async () => {
    if (!item || !user) return

    setLoading(true)

    try {
      const reviewedAt = new Date()

      // Process review with gamified algorithm
      const reviewResult = spacedRepetitionGamified.calculateNextReview(item)
      const pointsBreakdown = spacedRepetitionGamified.calculatePoints(item, reviewResult)
      const totalPoints = pointsBreakdown.basePoints + pointsBreakdown.streakBonus + pointsBreakdown.timeBonus

      const updatedItem: LearningItem = {
        ...item,
        review_count: item.review_count + 1,
        last_reviewed_at: reviewedAt.toISOString(),
        next_review_at: reviewResult.nextReviewAt,
        interval_days: reviewResult.intervalDays,
        ease_factor: reviewResult.easeFactor
      }

      // Update the item in database
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

      // Show success with points
      const pointsMessage = pointsBreakdown.isPerfectTiming
        ? `+${totalPoints} pts (Perfect Timing!)`
        : `+${totalPoints} pts`

      addToast('success', `${pointsMessage} • Next review: ${formatNextReview(updatedItem.next_review_at)}`)

      // Go back to topic
      navigate(`/topics/${item.topic_id}`)
    } catch (error) {
      addToast('error', 'Failed to save review')
      logger.error('Error saving review:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading...</p>
      </div>
    )
  }

  if (!item) {
    return null
  }

  return (
    <div style={{ maxWidth: 'var(--container-sm)', margin: '0 auto', padding: '2rem' }}>
      <Card variant="elevated">
        <CardContent>
          <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 className="h3" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              {item.content}
            </h2>

            {!showAnswer ? (
              <div style={{ textAlign: 'center' }}>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => setShowAnswer(true)}
                >
                  Show Answer
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p className="body-large" style={{ marginBottom: '2rem' }}>
                  Did you remember this?
                </p>

                <Button
                  variant="primary"
                  size="large"
                  onClick={handleReview}
                  disabled={loading}
                >
                  Mark Reviewed
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Button variant="ghost" onClick={() => navigate(`/topics/${item.topic_id}`)}>
          Back to Topic
        </Button>
      </div>
    </div>
  )
}
