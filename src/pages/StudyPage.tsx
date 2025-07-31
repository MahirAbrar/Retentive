import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import type { LearningItem, ReviewDifficulty } from '../types/database'
import { calculateNextReview } from '../utils/spacedRepetition'

export function StudyPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [item, setItem] = useState<LearningItem | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (itemId && user) {
      loadItem()
    }
  }, [itemId, user])

  const loadItem = async () => {
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
    } catch (error) {
      addToast('error', 'Failed to load item')
      navigate('/topics')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (difficulty: ReviewDifficulty) => {
    if (!item || !user) return
    
    setLoading(true)
    
    try {
      const nextReview = calculateNextReview(item, difficulty)
      
      // Update the item
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

      // Create review session record
      const { error: sessionError } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          learning_item_id: item.id,
          difficulty,
          reviewed_at: new Date().toISOString(),
          next_review_at: nextReview.next_review_at,
          interval_days: nextReview.interval_days
        })

      if (sessionError) throw sessionError

      addToast('success', `Review complete! Next review: ${formatNextReview(nextReview.next_review_at)}`)
      
      // Go back to topic
      navigate(`/topics/${item.topic_id}`)
    } catch (error) {
      addToast('error', 'Failed to save review')
      console.error('Error saving review:', error)
    } finally {
      setLoading(false)
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
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`
    return `in ${Math.floor(diffDays / 30)} months`
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
              <div>
                <p className="body-large" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  Think about how well you knew this...
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <Button
                    variant="ghost"
                    onClick={() => handleReview('again')}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--color-error-light)' }}
                  >
                    <div>
                      <div className="body">Again</div>
                      <div className="body-small text-secondary">Didn't know</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => handleReview('hard')}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--color-warning-light)' }}
                  >
                    <div>
                      <div className="body">Hard</div>
                      <div className="body-small text-secondary">Difficult</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => handleReview('good')}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--color-info-light)' }}
                  >
                    <div>
                      <div className="body">Good</div>
                      <div className="body-small text-secondary">Got it</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => handleReview('easy')}
                    disabled={loading}
                    style={{ backgroundColor: 'var(--color-success-light)' }}
                  >
                    <div>
                      <div className="body">Easy</div>
                      <div className="body-small text-secondary">Too easy</div>
                    </div>
                  </Button>
                </div>
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