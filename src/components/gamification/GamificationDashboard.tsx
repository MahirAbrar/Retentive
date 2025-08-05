import { useEffect, useState } from 'react'
import { gamificationService } from '../../services/gamificationService'
import { useAuth } from '../../hooks/useAuthFixed'
import { LevelProgress } from './LevelProgress'
import { Card } from '../ui'
import styles from './GamificationDashboard.module.css'
import { GAMIFICATION_CONFIG } from '../../config/gamification'

interface AchievementDisplay {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
}

export function GamificationDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    todayReviews: 0,
    todayPoints: 0,
    achievements: [] as string[]
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
            currentStreak: userStats.currentStreak,
            longestStreak: userStats.longestStreak,
            todayReviews: userStats.todayReviews,
            todayPoints: userStats.todayPoints,
            achievements: userStats.achievements
          })
        }
      } catch (error) {
        console.error('Error loading gamification stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
    
    // Listen for stats updates (same as navbar)
    const unsubscribe = gamificationService.addUpdateListener((updatedStats) => {
      if (updatedStats.userId === user.id) {
        setStats({
          totalPoints: updatedStats.totalPoints,
          currentLevel: updatedStats.currentLevel,
          currentStreak: updatedStats.currentStreak,
          longestStreak: updatedStats.longestStreak,
          todayReviews: updatedStats.todayReviews,
          todayPoints: updatedStats.todayPoints,
          achievements: updatedStats.achievements
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

  if (!user || loading) {
    return (
      <Card>
        <div className={styles.loading}>Loading stats...</div>
      </Card>
    )
  }

  const achievements: AchievementDisplay[] = Object.values(GAMIFICATION_CONFIG.ACHIEVEMENTS).map(achievement => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    unlocked: stats.achievements.includes(achievement.id)
  }))

  const streakBonus = gamificationService.getStreakBonus(stats.currentStreak)

  return (
    <div className={styles.container}>
      <Card>
        <h2 className={styles.title}>Your Progress</h2>
        
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <h3 className={styles.statTitle}>Level Progress</h3>
            <LevelProgress 
              totalPoints={stats.totalPoints} 
              currentLevel={stats.currentLevel}
            />
          </div>

          <div className={styles.stat}>
            <h3 className={styles.statTitle}>Today's Activity</h3>
            <div className={styles.todayStats}>
              <div className={styles.todayStat}>
                <span className={styles.todayValue}>{stats.todayReviews}</span>
                <span className={styles.todayLabel}>Reviews</span>
              </div>
              <div className={styles.todayStat}>
                <span className={styles.todayValue}>{stats.todayPoints}</span>
                <span className={styles.todayLabel}>Points Earned</span>
              </div>
            </div>
          </div>

          <div className={styles.stat}>
            <h3 className={styles.statTitle}>Streaks</h3>
            <div className={styles.streakStats}>
              <div className={styles.currentStreak}>
                <span className={styles.streakEmoji}>🔥</span>
                <div>
                  <div className={styles.streakValue}>{stats.currentStreak} days</div>
                  <div className={styles.streakLabel}>Current Streak</div>
                  {streakBonus > 0 && (
                    <div className={styles.streakBonus}>+{streakBonus} bonus points</div>
                  )}
                </div>
              </div>
              <div className={styles.longestStreak}>
                <span className={styles.streakLabel}>Longest:</span>
                <span className={styles.streakValue}>{stats.longestStreak} days</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.achievementsCard}>
        <h2 className={styles.title}>Achievements</h2>
        <div className={styles.achievementsGrid}>
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`${styles.achievement} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
            >
              <div className={styles.achievementIcon}>{achievement.icon}</div>
              <h4 className={styles.achievementName}>{achievement.name}</h4>
              <p className={styles.achievementDescription}>{achievement.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}