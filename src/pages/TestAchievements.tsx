import { logger } from '../utils/logger'
import { useState } from 'react'
import { Button, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { useAchievements } from '../hooks/useAchievements'
import { gamificationService } from '../services/gamificationService'
import { GAMIFICATION_CONFIG } from '../config/gamification'

export function TestAchievements() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { showAchievements } = useAchievements()
  const [loading, setLoading] = useState(false)

  const testAchievementUnlock = async (achievementId: string) => {
    if (!user) return
    
    setLoading(true)
    try {
      // Directly show the achievement notification
      showAchievements([achievementId])
      addToast('success', 'Achievement notification triggered!')
    } catch (error) {
      logger.error('Error testing achievement:', error)
      addToast('error', 'Failed to test achievement')
    } finally {
      setLoading(false)
    }
  }

  const simulateFirstReview = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await gamificationService.updateUserPoints(user.id, 10, {
        itemId: 'test-item-1',
        wasPerfectTiming: false,
        reviewCount: 1
      })
      
      if (result && result.newAchievements && result.newAchievements.length > 0) {
        showAchievements(result.newAchievements)
        addToast('success', 'Achievement unlocked through review!')
      } else {
        addToast('info', 'No new achievements (may already be unlocked)')
      }
    } catch (error) {
      logger.error('Error simulating review:', error)
      addToast('error', 'Failed to simulate review')
    } finally {
      setLoading(false)
    }
  }

  const simulatePerfectTiming = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Simulate 5 perfect timing reviews for PERFECT_WEEK achievement
      for (let i = 0; i < 5; i++) {
        const result = await gamificationService.updateUserPoints(user.id, 20, {
          itemId: `test-item-perfect-${i}`,
          wasPerfectTiming: true,
          reviewCount: 2
        })
        
        if (result && result.newAchievements && result.newAchievements.length > 0) {
          showAchievements(result.newAchievements)
          addToast('success', 'Perfect timing achievement unlocked!')
          break
        }
      }
    } catch (error) {
      logger.error('Error simulating perfect timing:', error)
      addToast('error', 'Failed to simulate perfect timing')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Please log in to test achievements</div>
  }

  const achievements = Object.values(GAMIFICATION_CONFIG.ACHIEVEMENTS)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="h1" style={{ marginBottom: '2rem' }}>Achievement Test Page</h1>
      
      <Card style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h3 className="h3">Test Achievement Notifications</h3>
        </CardHeader>
        <CardContent>
          <p className="body" style={{ marginBottom: '1rem' }}>
            Click any achievement below to test its notification:
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => testAchievementUnlock(achievement.id)}
              >
                <div style={{ fontSize: '2rem' }}>{achievement.icon}</div>
                <div style={{ flex: 1 }}>
                  <h4 className="h5">{achievement.name}</h4>
                  <p className="body-small text-secondary">{achievement.description}</p>
                  <p className="body-small" style={{ color: 'var(--color-accent)' }}>
                    +{achievement.points} points
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="h3">Simulate Real Scenarios</h3>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button 
              onClick={simulateFirstReview} 
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Simulate First Review
            </Button>
            <Button 
              onClick={simulatePerfectTiming} 
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Simulate Perfect Timing (5x)
            </Button>
          </div>
          <p className="body-small text-secondary" style={{ marginTop: '1rem' }}>
            These simulations will actually unlock achievements if you haven&rsquo;t earned them yet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}