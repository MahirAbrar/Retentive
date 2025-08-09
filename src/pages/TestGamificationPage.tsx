import { useState } from 'react'
import { Button, Card, CardHeader, CardContent, Input, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { gamificationService } from '../services/gamificationService'
import { supabase } from '../services/supabase'

export function TestGamificationPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [daysBack, setDaysBack] = useState('1')
  const [loading, setLoading] = useState(false)

  const addTestReview = async (daysAgo: number) => {
    if (!user) return
    
    try {
      setLoading(true)
      const reviewDate = new Date()
      reviewDate.setDate(reviewDate.getDate() - daysAgo)
      reviewDate.setHours(14, 0, 0, 0) // Set to 2 PM to avoid timezone issues
      
      // Create a test review session
      const { error } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          learning_item_id: '00000000-0000-0000-0000-000000000000', // Dummy ID for testing
          difficulty: 'good',
          reviewed_at: reviewDate.toISOString(),
          next_review_at: new Date().toISOString(),
          interval_days: 1,
          points_earned: 10,
          timing_bonus: 1.0,
          combo_count: 1
        })
      
      if (error) throw error
      
      addToast('success', `Added test review for ${daysAgo} days ago`)
      
      // Refresh stats
      await gamificationService.refreshUserStats(user.id)
    } catch (error) {
      console.error('Error adding test review:', error)
      addToast('error', 'Failed to add test review')
    } finally {
      setLoading(false)
    }
  }

  const clearAllReviews = async () => {
    if (!user) return
    
    if (!confirm('This will delete ALL your review history. Are you sure?')) return
    
    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('review_sessions')
        .delete()
        .eq('user_id', user.id)
      
      if (error) throw error
      
      addToast('success', 'Cleared all review history')
      
      // Refresh stats
      await gamificationService.refreshUserStats(user.id)
    } catch (error) {
      console.error('Error clearing reviews:', error)
      addToast('error', 'Failed to clear reviews')
    } finally {
      setLoading(false)
    }
  }

  const simulateStreak = async (days: number) => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Add reviews for consecutive days
      for (let i = days - 1; i >= 0; i--) {
        await addTestReview(i)
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      addToast('success', `Created ${days} day streak!`)
    } catch (error) {
      console.error('Error simulating streak:', error)
      addToast('error', 'Failed to simulate streak')
    } finally {
      setLoading(false)
    }
  }

  const simulateBrokenStreak = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Add reviews with a gap
      await addTestReview(5) // 5 days ago
      await addTestReview(4) // 4 days ago
      await addTestReview(3) // 3 days ago
      // Skip 2 days ago - this breaks the streak
      await addTestReview(0) // Today
      
      addToast('success', 'Created broken streak (should show 1 day)')
    } catch (error) {
      console.error('Error simulating broken streak:', error)
      addToast('error', 'Failed to simulate broken streak')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem' }}>
        <Card>
          <CardContent>
            <p>Please log in to test gamification features</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="h1" style={{ marginBottom: '2rem' }}>Test Gamification</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Card>
          <CardHeader>
            <h2 className="h3">Quick Streak Tests</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button 
                onClick={() => simulateStreak(1)} 
                disabled={loading}
              >
                Create 1 Day Streak
              </Button>
              <Button 
                onClick={() => simulateStreak(3)} 
                disabled={loading}
              >
                Create 3 Day Streak
              </Button>
              <Button 
                onClick={() => simulateStreak(7)} 
                disabled={loading}
              >
                Create 7 Day Streak
              </Button>
              <Button 
                onClick={() => simulateStreak(30)} 
                disabled={loading}
              >
                Create 30 Day Streak 🔥🔥
              </Button>
              <Button 
                onClick={simulateBrokenStreak} 
                disabled={loading}
                variant="secondary"
              >
                Simulate Broken Streak
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="h3">Manual Review Entry</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="body-small" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Days ago
                </label>
                <Input
                  type="number"
                  value={daysBack}
                  onChange={(e) => setDaysBack(e.target.value)}
                  min="0"
                  max="365"
                />
              </div>
              <Button 
                onClick={() => addTestReview(parseInt(daysBack) || 0)}
                disabled={loading}
              >
                Add Review
              </Button>
            </div>
            <p className="body-small text-secondary" style={{ marginTop: '0.5rem' }}>
              Add a review session from X days ago to build custom streak patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="h3">Stats Management</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button 
                onClick={async () => {
                  setLoading(true)
                  await gamificationService.refreshUserStats(user.id)
                  setLoading(false)
                  addToast('success', 'Stats refreshed')
                }}
                variant="secondary"
                disabled={loading}
              >
                Refresh Stats
              </Button>
              <Button 
                onClick={clearAllReviews}
                variant="primary"
                disabled={loading}
              >
                Clear All Review History
              </Button>
            </div>
            <p className="body-small text-secondary" style={{ marginTop: '0.5rem' }}>
              ⚠️ Clear All will permanently delete your review history
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <h2 className="h3">How Streaks Work</h2>
          </CardHeader>
          <CardContent>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li className="body">Streak counts consecutive days with at least one review</li>
              <li className="body">Missing a day breaks the streak</li>
              <li className="body">Multiple reviews on the same day still count as 1 day</li>
              <li className="body">Streaks are calculated from your review history</li>
              <li className="body">The navbar updates immediately after reviews</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}