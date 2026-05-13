import { useEffect, useState, useCallback, useMemo } from 'react'
import { gamificationService } from '../../services/gamificationService'
import { logger } from '../../utils/logger'
import { useAuth } from '../../hooks/useAuth'
import { useAchievements } from '../../hooks/useAchievements'
import { useVisibilityAwareInterval } from '../../hooks/useVisibilityAwareInterval'
import { LevelProgress } from './LevelProgress'
import { Card, Button, useToast } from '../ui'
import styles from './GamificationDashboard.module.css'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import { supabase } from '../../services/supabase'
import { Flame } from 'lucide-react'

interface AchievementDisplay {
  id: string
  name: string
  description: string
  icon: string
  category: string
  points: number
  unlocked: boolean
}

const CATEGORY_ORDER = ['reviews', 'streaks', 'mastery', 'focus', 'milestones'] as const
const CATEGORY_LABELS: Record<string, string> = {
  reviews: 'Reviews',
  streaks: 'Streaks',
  mastery: 'Mastery',
  focus: 'Focus',
  milestones: 'Milestones',
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
  const [achievementsExpanded, setAchievementsExpanded] = useState(() => window.innerWidth > 1024)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set())

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }
  const [perfectTimingCount, setPerfectTimingCount] = useState(0)
  const [sessionReviewCount, setSessionReviewCount] = useState(0)

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
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user, loadStats])

  // Refresh stats every 60 seconds, but pause when window is hidden (saves energy)
  useVisibilityAwareInterval(loadStats, 60000)

  // Memoize achievements array to prevent recalculation on every render
  // Must be before early return to follow Rules of Hooks
  const achievements: AchievementDisplay[] = useMemo(() =>
    Object.values(GAMIFICATION_CONFIG.ACHIEVEMENTS).map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      points: achievement.points,
      unlocked: stats.achievements.includes(achievement.id)
    })), [stats.achievements])

  const groupedAchievements = useMemo(() => {
    return CATEGORY_ORDER.map((category, idx) => {
      const items = achievements
        .filter(a => a.category === category)
        .sort((a, b) => {
          if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
          return a.points - b.points
        })
        .map((item, rowIndex) => ({ ...item, rowIndex }))
      const unlockedCount = items.filter(i => i.unlocked).length
      return {
        category,
        label: CATEGORY_LABELS[category],
        number: String(idx + 1).padStart(2, '0'),
        items,
        unlockedCount,
        totalCount: items.length,
      }
    }).filter(g => g.items.length > 0)
  }, [achievements])

  const getAchievementProgress = (id: string): { percent: number; current: number; target: number } => {
    switch (id) {
      case 'first_review':
        return { percent: stats.todayReviews > 0 ? 100 : 0, current: Math.min(stats.todayReviews, 1), target: 1 }
      case 'streak_7':
        return { percent: Math.min((stats.currentStreak / 7) * 100, 100), current: Math.min(stats.currentStreak, 7), target: 7 }
      case 'streak_30':
        return { percent: Math.min((stats.currentStreak / 30) * 100, 100), current: Math.min(stats.currentStreak, 30), target: 30 }
      case 'points_100':
        return { percent: Math.min((stats.totalPoints / 100) * 100, 100), current: Math.min(stats.totalPoints, 100), target: 100 }
      case 'points_1000':
        return { percent: Math.min((stats.totalPoints / 1000) * 100, 100), current: Math.min(stats.totalPoints, 1000), target: 1000 }
      case 'level_5':
        return { percent: Math.min((stats.currentLevel / 5) * 100, 100), current: Math.min(stats.currentLevel, 5), target: 5 }
      case 'level_10':
        return { percent: Math.min((stats.currentLevel / 10) * 100, 100), current: Math.min(stats.currentLevel, 10), target: 10 }
      case 'perfect_10':
        return { percent: Math.min((perfectTimingCount / 10) * 100, 100), current: Math.min(perfectTimingCount, 10), target: 10 }
      case 'speed_demon':
        return { percent: Math.min((sessionReviewCount / 50) * 100, 100), current: Math.min(sessionReviewCount, 50), target: 50 }
      default:
        return { percent: 0, current: 0, target: 0 }
    }
  }

  const streakBonus = useMemo(() =>
    gamificationService.getStreakBonus(stats.currentStreak), [stats.currentStreak])

  if (!user || loading) {
    return (
      <Card>
        <div className={styles.loading}>Loading stats...</div>
      </Card>
    )
  }

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
            <h3 className={styles.statTitle}>Today&rsquo;s Activity</h3>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: achievementsExpanded ? 'var(--space-4)' : 0 }}>
          <button
            onClick={() => setAchievementsExpanded(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--color-text-primary)',
            }}
          >
            <h2 className={styles.title} style={{ marginBottom: 0 }}>Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})</h2>
            <span style={{
              fontSize: 'var(--text-xl)',
              color: 'var(--color-text-secondary)',
              transition: 'transform 0.2s ease',
              transform: achievementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              lineHeight: 1,
            }}>
              ▾
            </span>
          </button>
          {achievementsExpanded && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleCheckAchievements}
              loading={checkingAchievements}
              disabled={checkingAchievements}
            >
              Check for Achievements
            </Button>
          )}
        </div>
        {achievementsExpanded && (
          <div className={styles.achievementsList}>
            {groupedAchievements.map(group => {
              const isOpen = expandedCategories.has(group.category)
              return (
              <section key={group.category} className={styles.categorySection}>
                <button
                  type="button"
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(group.category)}
                  aria-expanded={isOpen}
                  aria-controls={`achievement-group-${group.category}`}
                >
                  <span className={styles.categoryNumber}>N°&nbsp;{group.number}</span>
                  <span className={styles.categoryName}>{group.label}</span>
                  <hr className={styles.categoryRule} />
                  <span className={styles.categoryCount}>
                    {group.unlockedCount}/{group.totalCount}
                  </span>
                  <span
                    className={styles.categoryChevron}
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                <ul id={`achievement-group-${group.category}`} className={styles.rowList}>
                  {group.items.map(achievement => {
                    const progress = achievement.unlocked ? null : getAchievementProgress(achievement.id)
                    return (
                      <li
                        key={achievement.id}
                        className={`${styles.row} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
                        style={{ animationDelay: `${achievement.rowIndex * 50}ms` }}
                        title={achievement.unlocked ? 'Unlocked' : `${progress?.current ?? 0}/${progress?.target ?? '?'}`}
                      >
                        <span className={styles.marker} aria-hidden="true">
                          {achievement.unlocked ? '✦' : '○'}
                        </span>
                        <div className={styles.rowText}>
                          <div className={styles.rowTitle}>{achievement.name}</div>
                          <div className={styles.rowDescription}>{achievement.description}</div>
                        </div>
                        {progress && progress.percent > 0 && progress.target > 0 && (
                          <div className={styles.rowProgress}>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                            <span className={styles.progressFraction}>
                              {progress.current}/{progress.target}
                            </span>
                          </div>
                        )}
                        <span className={styles.rowPoints}>+{achievement.points} pts</span>
                      </li>
                    )
                  })}
                </ul>
                )}
              </section>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}