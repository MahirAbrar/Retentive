import { useEffect, useState } from 'react'
import { Card } from '../ui'
import { GAMIFICATION_CONFIG } from '../../config/gamification'

interface AchievementNotificationProps {
  achievementId: string
  onClose: () => void
}

export function AchievementNotification({ achievementId, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  // Find the achievement details
  const achievement = Object.values(GAMIFICATION_CONFIG.ACHIEVEMENTS).find(
    a => a.id === achievementId
  )
  
  useEffect(() => {
    if (!achievement) return
    // Trigger animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [achievement, onClose])
  
  if (!achievement) return null
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? '1' : '0.8',
        transition: 'all 0.3s ease-out'
      }}
    >
      <Card
        style={{
          padding: '2rem',
          textAlign: 'center',
          minWidth: '300px',
          maxWidth: '400px',
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-accent)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
          {achievement.icon}
        </div>
        
        <h2 className="h3" style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
          Achievement Unlocked!
        </h2>
        
        <h3 className="h4" style={{ marginBottom: '0.5rem' }}>
          {achievement.name}
        </h3>
        
        <p className="body-small text-secondary" style={{ marginBottom: '1rem' }}>
          {achievement.description}
        </p>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: 'var(--text-lg)',
          fontWeight: '600',
          color: 'var(--color-accent)'
        }}>
          <span>+{achievement.points}</span>
          <span style={{ fontSize: '1.5rem' }}>💎</span>
        </div>
      </Card>
    </div>
  )
}

// Achievement notification container that manages multiple notifications
interface AchievementNotificationContainerProps {
  achievements: string[]
  onClear: () => void
}

export function AchievementNotificationContainer({ 
  achievements, 
  onClear 
}: AchievementNotificationContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCurrent, setShowCurrent] = useState(false)
  
  useEffect(() => {
    if (achievements.length > 0 && currentIndex < achievements.length) {
      setShowCurrent(true)
    }
  }, [achievements, currentIndex])
  
  const handleClose = () => {
    setShowCurrent(false)
    
    // Move to next achievement after a brief delay
    setTimeout(() => {
      if (currentIndex < achievements.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // All achievements shown, clear the list
        onClear()
        setCurrentIndex(0)
      }
    }, 300)
  }
  
  if (achievements.length === 0 || currentIndex >= achievements.length) {
    return null
  }
  
  return showCurrent ? (
    <AchievementNotification
      achievementId={achievements[currentIndex]}
      onClose={handleClose}
    />
  ) : null
}