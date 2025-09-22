import { useEffect, useState, useCallback, useRef } from 'react'
import { gamificationService } from '../../services/gamificationService'
import { logger } from '../../utils/logger'
import { useAuth } from '../../hooks/useAuthFixed'
import { useAchievements } from '../../hooks/useAchievements'
import { LevelProgress } from './LevelProgress'
import { Card, Button, useToast } from '../ui'
import styles from './GamificationDashboard.module.css'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import { supabase } from '../../services/supabase'
import { Flame } from 'lucide-react'
import { AchievementIcon } from '../../config/icons'

interface AchievementDisplay {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
}

export function GamificationDashboard() {
  const { user } = useAuth()
  const { showAchievements } = useAchievements()
  const { addToast } = useToast()
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
  const [checkingAchievements, setCheckingAchievements] = useState(false)
  const [perfectTimingCount, setPerfectTimingCount] = useState(0)
  const [sessionReviewCount, setSessionReviewCount] = useState(0)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadStats = useCallback(async () => {
    if (!user) return
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
        
        // Get perfect timing count
        const { data: dailyStats } = await supabase
          .from('daily_stats')
          .select('perfect_timing_count')
          .eq('user_id', user.id)
        
        const totalPerfectTimings = (dailyStats || []).reduce((sum, stat) => sum + (stat.perfect_timing_count || 0), 0)
        setPerfectTimingCount(totalPerfectTimings)
        
        // Get session review count (reviews today)
        setSessionReviewCount(userStats?.todayReviews || 0)
      } catch (error) {
        logger.error('Error loading gamification stats:', error)
      } finally {
        setLoading(false)
      }
  }, [user])

  useEffect(() => {
    if (!user) return

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
        setLastActivity(Date.now()) // Update activity timestamp
      }
    })
    
    // Intelligent polling - reduce frequency when inactive
    const setupPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      
      const timeSinceActivity = Date.now() - lastActivity
      const pollInterval = timeSinceActivity > 5 * 60 * 1000 ? 60000 : 30000 // 1 min if inactive, 30s if active
      
      pollIntervalRef.current = setInterval(() => {
        const currentTimeSinceActivity = Date.now() - lastActivity
        if (currentTimeSinceActivity < 10 * 60 * 1000) { // Only poll if active in last 10 min
          loadStats()
        }
      }, pollInterval)
    }
    
    setupPolling()
    const activityInterval = setInterval(setupPolling, 60000) // Re-evaluate polling every minute
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      clearInterval(activityInterval)
      unsubscribe()
    }
  }, [user, loadStats, lastActivity])

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

  const handleCheckAchievements = async () => {
    if (!user) return
    
    setCheckingAchievements(true)
    try {
      const newAchievements = await gamificationService.checkAndUnlockMissedAchievements(user.id)
      
      if (newAchievements.length > 0) {
        showAchievements(newAchievements)
        addToast('success', `Unlocked ${newAchievements.length} achievement${newAchievements.length > 1 ? 's' : ''}!`)
        
        // Reload stats to show new achievements
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
      } else {
        addToast('info', 'No new achievements to unlock')
      }
    } catch (error) {
      logger.error('Error checking achievements:', error)
      addToast('error', 'Failed to check achievements')
    } finally {
      setCheckingAchievements(false)
    }
  }

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
                <Flame className={styles.streakEmoji} size={24} />
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 className={styles.title} style={{ marginBottom: 0 }}>Achievements</h2>
          <Button 
            variant="secondary" 
            size="small"
            onClick={handleCheckAchievements}
            loading={checkingAchievements}
            disabled={checkingAchievements}
          >
            Check for Achievements
          </Button>
        </div>
        <div className={styles.achievementsGrid}>
          {achievements.map(achievement => {
            // Calculate progress for locked achievements
            let progress = 0
            let progressText = ''
            
            if (!achievement.unlocked) {
              const config = Object.values(GAMIFICATION_CONFIG.ACHIEVEMENTS).find(a => a.id === achievement.id)
              
              if (config) {
                switch (achievement.id) {
                  case 'first_review':
                    progress = stats.todayReviews > 0 ? 100 : 0
                    progressText = stats.todayReviews > 0 ? 'Complete!' : 'Review your first item'
                    break
                  case 'streak_7':
                    progress = Math.min((stats.currentStreak / 7) * 100, 100)
                    progressText = `${stats.currentStreak}/7 days`
                    break
                  case 'streak_30':
                    progress = Math.min((stats.currentStreak / 30) * 100, 100)
                    progressText = `${stats.currentStreak}/30 days`
                    break
                  case 'points_100':
                    progress = Math.min((stats.totalPoints / 100) * 100, 100)
                    progressText = `${stats.totalPoints}/100 points`
                    break
                  case 'points_1000':
                    progress = Math.min((stats.totalPoints / 1000) * 100, 100)
                    progressText = `${stats.totalPoints}/1000 points`
                    break
                  case 'level_5':
                    progress = Math.min((stats.currentLevel / 5) * 100, 100)
                    progressText = `Level ${stats.currentLevel}/5`
                    break
                  case 'level_10':
                    progress = Math.min((stats.currentLevel / 10) * 100, 100)
                    progressText = `Level ${stats.currentLevel}/10`
                    break
                  case 'perfect_10':
                    progress = Math.min((perfectTimingCount / 10) * 100, 100)
                    progressText = `${perfectTimingCount}/10 perfect timings`
                    break
                  case 'speed_demon':
                    progress = Math.min((sessionReviewCount / 50) * 100, 100)
                    progressText = `${sessionReviewCount}/50 reviews today`
                    break
                  default:
                    progressText = 'Keep learning!'
                }
              }
            }
            
            return (
              <div 
                key={achievement.id} 
                className={`${styles.achievement} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
                title={achievement.unlocked ? 'Unlocked!' : progressText}
              >
                <div className={styles.achievementIcon}>
                  <AchievementIcon achievementId={achievement.id} size={32} />
                </div>
                <h4 className={styles.achievementName}>{achievement.name}</h4>
                <p className={styles.achievementDescription}>{achievement.description}</p>
                
                {!achievement.unlocked && progress > 0 && (
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                
                {!achievement.unlocked && (
                  <p className={styles.progressText}>{progressText}</p>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}