import { offlineService } from './offlineService'
import { GAMIFICATION_CONFIG } from '../config/gamification'
import type { LearningItem } from '../types/database'
import { formatDateForDB } from '../utils/date'

export interface GamificationStats {
  total_points: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_review_date: string | null
}

export interface Achievement {
  id: string
  name: string
  description: string
  points: number
  unlocked: boolean
  unlockedAt?: string
}

export interface DailyStats {
  points_earned: number
  reviews_completed: number
  perfect_timing_count: number
  items_mastered: number
}

export interface SessionStats {
  sessionPoints: number
  sessionCombo: number
  sessionReviews: number
  sessionPerfectTiming: number
  achievements: Achievement[]
}

export class GamificationService {
  private userId: string | null = null
  private sessionStats: SessionStats = {
    sessionPoints: 0,
    sessionCombo: 0,
    sessionReviews: 0,
    sessionPerfectTiming: 0,
    achievements: []
  }
  private listeners = new Set<(stats: GamificationStats) => void>()

  setUserId(userId: string) {
    this.userId = userId
    offlineService.setUserId(userId)
  }

  addUpdateListener(callback: (stats: GamificationStats) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(stats: GamificationStats) {
    this.listeners.forEach(callback => callback(stats))
  }

  startSession() {
    this.sessionStats = {
      sessionPoints: 0,
      sessionCombo: 0,
      sessionReviews: 0,
      sessionPerfectTiming: 0,
      achievements: []
    }
  }

  async calculateReviewPoints(
    item: LearningItem,
    reviewedAt: Date = new Date()
  ): Promise<{ points: number; timingBonus: number; isPerfectTiming: boolean }> {
    const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
    if (!item.next_review_at || item.review_count === 0) {
      return { points: GAMIFICATION_CONFIG.POINTS.baseReview, timingBonus: 1.0, isPerfectTiming: false }
    }

    const scheduledTime = new Date(item.next_review_at)
    const actualTime = reviewedAt
    const hoursEarly = (scheduledTime.getTime() - actualTime.getTime()) / (1000 * 60 * 60)
    const hoursLate = -hoursEarly

    let timingBonus: number = mode.pointsMultiplier.late
    let isPerfectTiming = false

    if (hoursEarly <= mode.windowBefore && hoursLate <= mode.windowAfter) {
      timingBonus = mode.pointsMultiplier.onTime
      isPerfectTiming = true
    } else if (hoursEarly <= mode.windowBefore * 2 || hoursLate <= mode.windowAfter * 2) {
      timingBonus = mode.pointsMultiplier.inWindow
    }

    const basePoints = GAMIFICATION_CONFIG.POINTS.baseReview
    const comboBonus = Math.min(this.sessionStats.sessionCombo, 10) * GAMIFICATION_CONFIG.POINTS.comboBonus[Math.min(this.sessionStats.sessionCombo, 10) as keyof typeof GAMIFICATION_CONFIG.POINTS.comboBonus] || 0
    const points = Math.round((basePoints + comboBonus) * timingBonus)

    return { points, timingBonus, isPerfectTiming }
  }

  async recordReview(
    item: LearningItem,
    reviewedAt: Date = new Date()
  ): Promise<number> {
    if (!this.userId) throw new Error('User ID not set')

    const { points, isPerfectTiming } = await this.calculateReviewPoints(item, reviewedAt)
    
    // Update session stats
    this.sessionStats.sessionPoints += points
    this.sessionStats.sessionReviews++
    if (isPerfectTiming) {
      this.sessionStats.sessionCombo++
      this.sessionStats.sessionPerfectTiming++
    } else {
      this.sessionStats.sessionCombo = 0
    }

    // Update daily stats
    const today = formatDateForDB(reviewedAt)
    await offlineService.updateDailyStats(today, {
      points_earned: points,
      reviews_completed: 1,
      perfect_timing_count: isPerfectTiming ? 1 : 0,
      items_mastered: 0
    })

    // Update total points and check for level up
    const stats = await this.getStats()
    const newTotalPoints = (stats?.total_points || 0) + points
    const newLevel = this.calculateLevel(newTotalPoints)
    
    await offlineService.updateGamificationStats({
      total_points: newTotalPoints,
      current_level: newLevel,
      last_review_date: today
    })

    // Check achievements
    await this.checkAchievements(stats)

    // Notify listeners
    const updatedStats = await this.getStats()
    if (updatedStats) {
      this.notifyListeners(updatedStats)
    }

    return points
  }

  async recordMastery(_item: LearningItem): Promise<number> {
    if (!this.userId) throw new Error('User ID not set')
    
    const points = GAMIFICATION_CONFIG.MASTERY.bonusPoints
    this.sessionStats.sessionPoints += points

    // Update daily stats
    const today = formatDateForDB(new Date())
    await offlineService.updateDailyStats(today, {
      points_earned: points,
      reviews_completed: 0,
      perfect_timing_count: 0,
      items_mastered: 1
    })

    // Update total points
    const stats = await this.getStats()
    const newTotalPoints = (stats?.total_points || 0) + points
    const newLevel = this.calculateLevel(newTotalPoints)
    
    await offlineService.updateGamificationStats({
      total_points: newTotalPoints,
      current_level: newLevel
    })

    // Check achievements
    await this.checkAchievements(stats)

    // Notify listeners
    const updatedStats = await this.getStats()
    if (updatedStats) {
      this.notifyListeners(updatedStats)
    }

    return points
  }

  calculateLevel(totalPoints: number): number {
    let level = 1
    let pointsForNextLevel = GAMIFICATION_CONFIG.FEATURES.levels.experienceBase

    while (totalPoints >= pointsForNextLevel) {
      level++
      pointsForNextLevel += GAMIFICATION_CONFIG.FEATURES.levels.experienceBase * 
        Math.pow(GAMIFICATION_CONFIG.FEATURES.levels.experienceGrowth, level - 1)
    }

    return level
  }

  getPointsForLevel(level: number): { current: number; next: number } {
    let current = 0
    let next = GAMIFICATION_CONFIG.FEATURES.levels.experienceBase

    for (let i = 1; i < level; i++) {
      current = next
      next += GAMIFICATION_CONFIG.FEATURES.levels.experienceBase * 
        Math.pow(GAMIFICATION_CONFIG.FEATURES.levels.experienceGrowth, i)
    }

    return { current, next }
  }

  async getStats(): Promise<GamificationStats | null> {
    if (!this.userId) return null
    
    const stats = await offlineService.getGamificationStats()
    if (!stats) {
      // Initialize stats if they don't exist
      await offlineService.updateGamificationStats({
        total_points: 0,
        current_level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_review_date: null
      })
      return await offlineService.getGamificationStats()
    }
    
    return stats
  }

  async calculateStreakFromHistory(): Promise<number> {
    if (!this.userId) return 0
    
    try {
      const reviews = await offlineService.getRecentReviews(365)
      if (!reviews || reviews.length === 0) return 0
      
      const dates = new Set<string>()
      reviews.forEach(review => {
        const date = formatDateForDB(new Date(review.reviewed_at))
        dates.add(date)
      })
      
      const sortedDates = Array.from(dates).sort().reverse()
      if (sortedDates.length === 0) return 0
      
      const today = formatDateForDB(new Date())
      const yesterday = formatDateForDB(new Date(Date.now() - 24 * 60 * 60 * 1000))
      
      if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
        return 0
      }
      
      let streak = 0
      let checkDate = sortedDates[0] === today ? today : yesterday
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] === checkDate) {
          streak++
          const prevDate = new Date(checkDate)
          prevDate.setDate(prevDate.getDate() - 1)
          checkDate = formatDateForDB(prevDate)
        } else {
          break
        }
      }
      
      return streak
    } catch (error) {
      console.error('Error calculating streak:', error)
      return 0
    }
  }

  async updateStreak(): Promise<void> {
    if (!this.userId) return
    
    const stats = await this.getStats()
    if (!stats) return
    
    const today = formatDateForDB(new Date())
    const yesterday = formatDateForDB(new Date(Date.now() - 24 * 60 * 60 * 1000))
    
    let newStreak = 0
    
    if (stats.last_review_date === today) {
      newStreak = stats.current_streak
    } else if (stats.last_review_date === yesterday) {
      const dailyStats = await offlineService.getDailyStats(today)
      if (dailyStats && dailyStats.reviews_completed > 0) {
        newStreak = stats.current_streak + 1
      } else {
        newStreak = stats.current_streak
      }
    } else if (stats.last_review_date) {
      const lastReview = new Date(stats.last_review_date)
      const daysSince = Math.floor((Date.now() - lastReview.getTime()) / (24 * 60 * 60 * 1000))
      
      if (daysSince > 1) {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }
    
    const longestStreak = Math.max(newStreak, stats.longest_streak)
    
    await offlineService.updateGamificationStats({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_review_date: today
    })
    
    // Notify listeners
    const updatedStats = await this.getStats()
    if (updatedStats) {
      this.notifyListeners(updatedStats)
    }
  }

  async checkAchievements(previousStats: GamificationStats | null): Promise<void> {
    if (!this.userId || !previousStats) return
    
    const currentStats = await this.getStats()
    if (!currentStats) return
    
    const achievements = []
    
    // Check each achievement
    for (const [id, achievement] of Object.entries(GAMIFICATION_CONFIG.ACHIEVEMENTS)) {
      const unlocked = await this.isAchievementUnlocked(id)
      if (!unlocked) {
        let shouldUnlock = false
        
        switch (id) {
          case 'first_review':
            shouldUnlock = currentStats.total_points > 0
            break
          case 'streak_7':
            shouldUnlock = currentStats.current_streak >= 7
            break
          case 'streak_30':
            shouldUnlock = currentStats.current_streak >= 30
            break
          case 'points_1000':
            shouldUnlock = currentStats.total_points >= 1000
            break
          case 'points_10000':
            shouldUnlock = currentStats.total_points >= 10000
            break
          case 'level_10':
            shouldUnlock = currentStats.current_level >= 10
            break
          case 'perfect_timing_10':
            shouldUnlock = this.sessionStats.sessionPerfectTiming >= 10
            break
          case 'reviews_100': {
            const totalReviews = await this.getTotalReviews()
            shouldUnlock = totalReviews >= 100
            break
          }
        }
        
        if (shouldUnlock) {
          await offlineService.unlockAchievement(id, achievement.points)
          achievements.push({
            id,
            name: achievement.name,
            description: achievement.description,
            points: achievement.points,
            unlocked: true,
            unlockedAt: new Date().toISOString()
          })
          
          // Add achievement points
          await offlineService.updateGamificationStats({
            total_points: currentStats.total_points + achievement.points
          })
        }
      }
    }
    
    this.sessionStats.achievements = achievements
  }

  async isAchievementUnlocked(achievementId: string): Promise<boolean> {
    if (!this.userId) return false
    
    const achievements = await offlineService.getAchievements()
    return achievements.some(a => a.achievement_id === achievementId)
  }

  async getAchievements(): Promise<Achievement[]> {
    if (!this.userId) return []
    
    const unlockedAchievements = await offlineService.getAchievements()
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id))
    
    return Object.entries(GAMIFICATION_CONFIG.ACHIEVEMENTS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      points: config.points,
      unlocked: unlockedIds.has(id),
      unlockedAt: unlockedAchievements.find(a => a.achievement_id === id)?.unlocked_at
    }))
  }

  async getTotalReviews(): Promise<number> {
    if (!this.userId) return 0
    
    const reviews = await offlineService.getRecentReviews(10000)
    return reviews.length
  }

  getSessionStats(): SessionStats {
    return { ...this.sessionStats }
  }

  async getDailyStats(date: Date = new Date()): Promise<DailyStats> {
    if (!this.userId) {
      return {
        points_earned: 0,
        reviews_completed: 0,
        perfect_timing_count: 0,
        items_mastered: 0
      }
    }
    
    const dateStr = formatDateForDB(date)
    const stats = await offlineService.getDailyStats(dateStr)
    
    return {
      points_earned: stats?.points_earned || 0,
      reviews_completed: stats?.reviews_completed || 0,
      perfect_timing_count: stats?.perfect_timing_count || 0,
      items_mastered: stats?.items_mastered || 0
    }
  }
}

export const gamificationService = new GamificationService()