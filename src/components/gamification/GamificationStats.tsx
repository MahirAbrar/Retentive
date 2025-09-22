import { logger } from '../../utils/logger'
import { useEffect, useState, memo } from 'react'
import { gamificationService } from '../../services/gamificationService'
import { useAuth } from '../../hooks/useAuthFixed'
import { LevelProgress } from './LevelProgress'
import { StreakIndicator } from './StreakIndicator'
import { Gem } from 'lucide-react'
import styles from './GamificationStats.module.css'

export const GamificationStats = memo(function GamificationStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadStats = async () => {
      try {
        const userStats = await gamificationService.getUserStats(user.id)
        if (userStats) {
          setStats({
            totalPoints: userStats.totalPoints,
            currentLevel: userStats.currentLevel,
            currentStreak: userStats.currentStreak
          })
        }
      } catch (error) {
        logger.error('Error loading gamification stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
    
    // Listen for stats updates
    const unsubscribe = gamificationService.addUpdateListener((updatedStats) => {
      if (updatedStats.userId === user.id) {
        setStats({
          totalPoints: updatedStats.totalPoints,
          currentLevel: updatedStats.currentLevel,
          currentStreak: updatedStats.currentStreak
        })
      }
    })
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [user])

  if (!user || loading) return null

  return (
    <div className={styles.container}>
      <LevelProgress 
        totalPoints={stats.totalPoints} 
        currentLevel={stats.currentLevel}
        compact
      />
      
      <div className={styles.separator} />
      
      <div className={styles.points}>
        <span className={styles.pointsIcon}>
          <Gem size={16} />
        </span>
        <span className={styles.pointsText}>{stats.totalPoints.toLocaleString()}</span>
      </div>
      
      {stats.currentStreak > 0 && (
        <>
          <div className={styles.separator} />
          <StreakIndicator currentStreak={stats.currentStreak} />
        </>
      )}
    </div>
  )
})