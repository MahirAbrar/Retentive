import { logger } from '../utils/logger'
import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { gamificationService } from '../services/gamificationService'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'

export function TestGamificationPersistence() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadStats = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get stats from service
      const serviceStats = await gamificationService.getUserStats(user.id)
      setStats(serviceStats)
      
      // Get stats directly from database
      const { data: dbData } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setDbStats(dbData)
    } catch (error) {
      logger.error('Error loading stats:', error)
      addToast('error', 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const addPoints = async (points: number) => {
    if (!user) return
    
    try {
      await gamificationService.updateUserPoints(user.id, points, {
        itemId: 'test-item',
        wasPerfectTiming: true,
        reviewCount: 1
      })
      
      addToast('success', `Added ${points} points`)
      
      // Reload stats after a brief delay
      setTimeout(loadStats, 500)
    } catch (error) {
      logger.error('Error adding points:', error)
      addToast('error', 'Failed to add points')
    }
  }

  const resetStats = async () => {
    if (!user || !confirm('Are you sure you want to reset your stats?')) return
    
    try {
      await supabase
        .from('user_gamification_stats')
        .update({
          total_points: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_review_date: null
        })
        .eq('user_id', user.id)
      
      // Clear cache
      await gamificationService.getUserStats(user.id)
      
      addToast('success', 'Stats reset successfully')
      loadStats()
    } catch (error) {
      logger.error('Error resetting stats:', error)
      addToast('error', 'Failed to reset stats')
    }
  }

  if (!user) {
    return <div>Please log in to test gamification persistence</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="h1" style={{ marginBottom: '2rem' }}>Gamification Persistence Test</h1>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        <Card>
          <CardHeader>
            <h3 className="h3">Service Stats (from cache/memory)</h3>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : stats ? (
              <pre style={{ 
                backgroundColor: 'var(--color-background-secondary)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)',
                overflow: 'auto'
              }}>
                {JSON.stringify(stats, null, 2)}
              </pre>
            ) : (
              <p>No stats loaded</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="h3">Database Stats (direct from Supabase)</h3>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : dbStats ? (
              <pre style={{ 
                backgroundColor: 'var(--color-background-secondary)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)',
                overflow: 'auto'
              }}>
                {JSON.stringify(dbStats, null, 2)}
              </pre>
            ) : (
              <p>No database stats found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="h3">Actions</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button onClick={() => addPoints(10)} variant="primary">
                Add 10 Points
              </Button>
              <Button onClick={() => addPoints(50)} variant="primary">
                Add 50 Points
              </Button>
              <Button onClick={() => addPoints(100)} variant="primary">
                Add 100 Points
              </Button>
              <Button onClick={loadStats} variant="secondary">
                Reload Stats
              </Button>
              <Button onClick={resetStats} variant="ghost" style={{ color: 'var(--color-error)' }}>
                Reset Stats
              </Button>
            </div>
            <p className="body-small text-secondary" style={{ marginTop: '1rem' }}>
              Add points and check if they persist in the database. The service stats should match the database stats.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}