import { GAMIFICATION_CONFIG } from '../config/gamification'
import type { LearningItem } from '../types/database'
import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { logger } from '../utils/logger'

export interface PointsBreakdown {
  basePoints: number
  timeBonus: number
  priorityBonus: number
  totalPoints: number
  message: string
  isPerfectTiming: boolean
}

export interface UserGamificationStats {
  userId: string
  totalPoints: number
  currentLevel: number
  currentStreak: number
  longestStreak: number
  lastReviewDate: string | null
  todayReviews: number
  todayPoints: number
  achievements: string[]
}

export class GamificationService {
  private static instance: GamificationService
  private sessionCombo: number = 0
  private lastReviewTime: Date | null = null
  private updateListeners: Set<(stats: UserGamificationStats) => void> = new Set()

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService()
    }
    return GamificationService.instance
  }
  
  // Add listener for stats updates
  addUpdateListener(callback: (stats: UserGamificationStats) => void) {
    this.updateListeners.add(callback)
    return () => this.updateListeners.delete(callback)
  }
  
  private notifyListeners(stats: UserGamificationStats) {
    this.updateListeners.forEach(callback => callback(stats))
  }

  calculateReviewPoints(
    item: LearningItem,
    reviewedAt: Date = new Date()
  ): PointsBreakdown {
    const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
    const basePoints = GAMIFICATION_CONFIG.POINTS.baseReview
    let timeBonus = 1
    let message = ''
    let isPerfectTiming = false
    
    // Calculate time bonus
    if (item.next_review_at) {
      const dueTime = new Date(item.next_review_at)
      const hoursDiff = Math.abs(reviewedAt.getTime() - dueTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff <= GAMIFICATION_CONFIG.FEATURES.timePressure.perfectWindow) {
        timeBonus = mode.pointsMultiplier.onTime
        message = GAMIFICATION_CONFIG.MESSAGES.perfectTiming[
          Math.floor(Math.random() * GAMIFICATION_CONFIG.MESSAGES.perfectTiming.length)
        ]
        isPerfectTiming = true
      } else {
        const earliestTime = new Date(dueTime)
        earliestTime.setHours(earliestTime.getHours() - mode.windowBefore)
        
        const latestTime = new Date(dueTime)
        latestTime.setHours(latestTime.getHours() + mode.windowAfter)
        
        if (reviewedAt >= earliestTime && reviewedAt <= latestTime) {
          timeBonus = mode.pointsMultiplier.inWindow
          message = 'Good timing!'
        } else {
          timeBonus = mode.pointsMultiplier.late
          message = reviewedAt < earliestTime ? 'Reviewed early' : 'Reviewed late'
        }
      }
    } else {
      // First review
      message = 'First review!'
    }
    
    // Apply priority bonus
    const priorityBonus = GAMIFICATION_CONFIG.POINTS.priorityBonus[
      item.priority as keyof typeof GAMIFICATION_CONFIG.POINTS.priorityBonus
    ] || 1
    
    // Calculate total
    const totalPoints = Math.round(basePoints * timeBonus * priorityBonus)
    
    // Update session combo
    this.updateCombo()
    
    return {
      basePoints,
      timeBonus,
      priorityBonus,
      totalPoints,
      message,
      isPerfectTiming
    }
  }

  private updateCombo() {
    const now = new Date()
    
    // Reset combo if more than 5 minutes since last review
    if (this.lastReviewTime && 
        now.getTime() - this.lastReviewTime.getTime() > 5 * 60 * 1000) {
      this.sessionCombo = 0
    }
    
    this.sessionCombo++
    this.lastReviewTime = now
  }

  getComboBonus(): number {
    const comboBonuses = GAMIFICATION_CONFIG.POINTS.comboBonus
    let bonus = 0
    
    for (const [threshold, points] of Object.entries(comboBonuses)) {
      if (this.sessionCombo >= parseInt(threshold)) {
        bonus = points
      }
    }
    
    return bonus
  }

  async getUserStats(userId: string): Promise<UserGamificationStats | null> {
    const cacheKey = `gamification:${userId}`
    const cached = cacheService.get<UserGamificationStats>(cacheKey)
    if (cached) {
      return cached
    }
    
    try {
      // Try to get stats from database first
      const { data: dbStats, error } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching gamification stats:', error)
        return null
      }
      
      // If no stats exist, create them
      let statsToUse = dbStats
      if (!statsToUse) {
        const streak = await this.calculateStreakFromHistory(userId)
        
        const { data: newStats, error: insertError } = await supabase
          .from('user_gamification_stats')
          .insert({
            user_id: userId,
            total_points: 0,
            current_level: 1,
            current_streak: streak,
            longest_streak: streak,
            last_review_date: null
          })
          .select()
          .single()
        
        if (insertError) {
          logger.error('Error creating gamification stats:', insertError)
          return null
        }
        
        statsToUse = newStats
      }
      
      // Always recalculate streak from history to ensure accuracy
      const actualStreak = await this.calculateStreakFromHistory(userId)
      if (actualStreak !== statsToUse.current_streak) {
        logger.log(`Streak mismatch detected. DB: ${statsToUse.current_streak}, Actual: ${actualStreak}. Updating...`)
        await supabase
          .from('user_gamification_stats')
          .update({ 
            current_streak: actualStreak,
            longest_streak: Math.max(actualStreak, statsToUse.longest_streak || 0)
          })
          .eq('user_id', userId)
        statsToUse.current_streak = actualStreak
        statsToUse.longest_streak = Math.max(actualStreak, statsToUse.longest_streak || 0)
      }
      
      // Get today's stats (handle error gracefully if no stats for today)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]
      
      const { data: todayStats, error: todayStatsError } = await supabase
        .from('daily_stats')
        .select('points_earned, reviews_completed')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .maybeSingle() // Use maybeSingle instead of single to avoid 406 error when no data
      
      if (todayStatsError) {
        logger.warn('Error fetching today stats:', todayStatsError)
      }
      
      // Get achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId)
      
      const stats: UserGamificationStats = {
        userId,
        totalPoints: statsToUse.total_points || 0,
        currentLevel: statsToUse.current_level || 1,
        currentStreak: statsToUse.current_streak || 0,
        longestStreak: statsToUse.longest_streak || 0,
        lastReviewDate: statsToUse.last_review_date,
        todayReviews: todayStats?.reviews_completed || 0,
        todayPoints: todayStats?.points_earned || 0,
        achievements: achievements?.map(a => a.achievement_id) || []
      }
      
      // Cache for 1 minute
      cacheService.set(cacheKey, stats, 60 * 1000)
      return stats
    } catch (error) {
      logger.error('Error fetching gamification stats:', error)
      return null
    }
  }
  
  private async calculateStreakFromHistory(userId: string): Promise<number> {
    try {
      // Get recent review sessions to calculate streak
      const { data: recentSessions } = await supabase
        .from('review_sessions')
        .select('reviewed_at')
        .eq('user_id', userId)
        .order('reviewed_at', { ascending: false })
        .limit(100)

      let streakDays = 0
      if (recentSessions && recentSessions.length > 0) {
        const dates = new Set<string>()
        recentSessions.forEach(session => {
          // Use UTC date to avoid timezone issues
          const date = new Date(session.reviewed_at)
          const utcDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
          dates.add(utcDate)
        })

        // Check consecutive days from today backwards (in UTC)
        const checkDate = new Date()
        let currentUtcDate = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(checkDate.getUTCDate()).padStart(2, '0')}`

        while (dates.has(currentUtcDate)) {
          streakDays++
          checkDate.setUTCDate(checkDate.getUTCDate() - 1)
          currentUtcDate = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(checkDate.getUTCDate()).padStart(2, '0')}`
        }
      }

      return streakDays
    } catch (error) {
      logger.error('Error calculating streak from history:', error)
      return 0
    }
  }

  async updateUserPoints(
    userId: string,
    pointsToAdd: number,
    reviewData?: {
      itemId: string
      wasPerfectTiming: boolean
      reviewCount: number
    }
  ): Promise<{ newAchievements?: string[] } | void> {
    try {
      logger.log('Updating user points:', { userId, pointsToAdd })
      
      // Get current stats
      const stats = await this.getUserStats(userId)
      if (!stats) {
        logger.error('No stats found for user:', userId)
        return
      }
      
      // Update points
      stats.totalPoints += pointsToAdd
      stats.todayPoints += pointsToAdd
      stats.todayReviews += 1
      
      logger.log('Updated stats:', { 
        totalPoints: stats.totalPoints, 
        todayPoints: stats.todayPoints,
        level: stats.currentLevel 
      })
      
      // Update level
      stats.currentLevel = this.calculateLevel(stats.totalPoints)
      
      // Update last review date and streak
      const today = new Date()
      const todayStr = today.toDateString()
      const lastReviewDate = stats.lastReviewDate ? new Date(stats.lastReviewDate).toDateString() : null
      
      // Only update streak if this is the first review of the day
      if (lastReviewDate !== todayStr) {
        // If we haven't set lastReviewDate yet, calculate it from history
        if (!stats.lastReviewDate) {
          const currentStreak = await this.calculateStreakFromHistory(userId)
          stats.currentStreak = currentStreak
          stats.longestStreak = Math.max(stats.longestStreak, currentStreak)
        } else {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toDateString()
          
          if (lastReviewDate === yesterdayStr) {
            // Continuing streak from yesterday
            stats.currentStreak += 1
            stats.longestStreak = Math.max(stats.currentStreak, stats.longestStreak)
          } else {
            // Streak was broken, start new streak
            stats.currentStreak = 1
          }
        }
        
        stats.lastReviewDate = today.toISOString()
      }
      
      // Save to database
      const { error: updateError } = await supabase
        .from('user_gamification_stats')
        .update({
          total_points: stats.totalPoints,
          current_level: stats.currentLevel,
          current_streak: stats.currentStreak,
          longest_streak: stats.longestStreak,
          last_review_date: stats.lastReviewDate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (updateError) {
        logger.error('Error updating gamification stats:', updateError)
      }
      
      // Update daily stats
      const todayForDaily = new Date()
      todayForDaily.setHours(0, 0, 0, 0)
      const todayStrForDaily = todayForDaily.toISOString().split('T')[0]
      
      // First check if daily stats exist
      const { data: existingDaily, error: checkError } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStrForDaily)
        .maybeSingle() // Use maybeSingle to avoid error when no row exists
      
      if (checkError) {
        logger.warn('Error checking daily stats:', checkError)
      }
      
      if (existingDaily) {
        // Update existing
        const { error: dailyError } = await supabase
          .from('daily_stats')
          .update({
            points_earned: existingDaily.points_earned + pointsToAdd,
            reviews_completed: existingDaily.reviews_completed + 1,
            perfect_timing_count: existingDaily.perfect_timing_count + (reviewData?.wasPerfectTiming ? 1 : 0),
            items_mastered: existingDaily.items_mastered + (reviewData?.reviewCount === GAMIFICATION_CONFIG.MASTERY.reviewsRequired ? 1 : 0)
          })
          .eq('user_id', userId)
          .eq('date', todayStrForDaily)
        
        if (dailyError) {
          logger.error('Error updating daily stats:', dailyError)
        }
      } else {
        // Create new
        const { error: dailyError } = await supabase
          .from('daily_stats')
          .insert({
            user_id: userId,
            date: todayStrForDaily,
            points_earned: pointsToAdd,
            reviews_completed: 1,
            perfect_timing_count: reviewData?.wasPerfectTiming ? 1 : 0,
            items_mastered: reviewData?.reviewCount === GAMIFICATION_CONFIG.MASTERY.reviewsRequired ? 1 : 0
          })
        
        if (dailyError) {
          logger.error('Error creating daily stats:', dailyError)
        }
      }
      
      // Clear cache
      cacheService.delete(`gamification:${userId}`)
      
      // Notify listeners of the update
      this.notifyListeners(stats)
      
      // Check for achievements
      if (reviewData) {
        const newAchievements = await this.checkAchievements(userId, reviewData)
        if (newAchievements.length > 0) {
          // Return achievements to be displayed
          return { newAchievements }
        }
      }
    } catch (error) {
      logger.error('Error updating user points:', error)
    }
  }

  private async checkAchievements(
    userId: string,
    reviewData: {
      itemId: string
      wasPerfectTiming: boolean
      reviewCount: number
    }
  ): Promise<string[]> {
    const newAchievements: string[] = []

    try {
      // Get current stats to check against achievement criteria
      const stats = await this.getUserStats(userId)
      if (!stats) return []

      // Get existing achievements
      const { data: existingAchievements } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      const existingIds = new Set(existingAchievements?.map(a => a.achievement_id) || [])
      const ACHIEVEMENTS = GAMIFICATION_CONFIG.ACHIEVEMENTS

      // Get total review count
      const { count: totalReviews } = await supabase
        .from('review_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // === REVIEW ACHIEVEMENTS ===
      if (totalReviews && totalReviews >= 1 && !existingIds.has(ACHIEVEMENTS.FIRST_REVIEW.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_REVIEW)
        newAchievements.push(ACHIEVEMENTS.FIRST_REVIEW.id)
      }
      if (totalReviews && totalReviews >= 10 && !existingIds.has(ACHIEVEMENTS.REVIEWS_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_10)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_10.id)
      }
      if (totalReviews && totalReviews >= 50 && !existingIds.has(ACHIEVEMENTS.REVIEWS_50.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_50)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_50.id)
      }
      if (totalReviews && totalReviews >= 100 && !existingIds.has(ACHIEVEMENTS.REVIEWS_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_100)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_100.id)
      }
      if (totalReviews && totalReviews >= 500 && !existingIds.has(ACHIEVEMENTS.REVIEWS_500.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_500)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_500.id)
      }
      if (totalReviews && totalReviews >= 1000 && !existingIds.has(ACHIEVEMENTS.REVIEWS_1000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_1000)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_1000.id)
      }

      // === STREAK ACHIEVEMENTS ===
      if (stats.currentStreak >= 3 && !existingIds.has(ACHIEVEMENTS.STREAK_3.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_3)
        newAchievements.push(ACHIEVEMENTS.STREAK_3.id)
      }
      if (stats.currentStreak >= 7 && !existingIds.has(ACHIEVEMENTS.STREAK_7.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_7)
        newAchievements.push(ACHIEVEMENTS.STREAK_7.id)
      }
      if (stats.currentStreak >= 14 && !existingIds.has(ACHIEVEMENTS.STREAK_14.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_14)
        newAchievements.push(ACHIEVEMENTS.STREAK_14.id)
      }
      if (stats.currentStreak >= 30 && !existingIds.has(ACHIEVEMENTS.STREAK_30.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_30)
        newAchievements.push(ACHIEVEMENTS.STREAK_30.id)
      }
      if (stats.currentStreak >= 100 && !existingIds.has(ACHIEVEMENTS.STREAK_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_100)
        newAchievements.push(ACHIEVEMENTS.STREAK_100.id)
      }

      // === MASTERY ACHIEVEMENTS ===
      const { count: masteredCount } = await supabase
        .from('learning_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('review_count', GAMIFICATION_CONFIG.MASTERY.reviewsRequired)

      if (masteredCount && masteredCount >= 1 && !existingIds.has(ACHIEVEMENTS.FIRST_MASTERY.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_MASTERY)
        newAchievements.push(ACHIEVEMENTS.FIRST_MASTERY.id)
      }
      if (masteredCount && masteredCount >= 10 && !existingIds.has(ACHIEVEMENTS.MASTERY_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_10)
        newAchievements.push(ACHIEVEMENTS.MASTERY_10.id)
      }
      if (masteredCount && masteredCount >= 50 && !existingIds.has(ACHIEVEMENTS.MASTERY_50.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_50)
        newAchievements.push(ACHIEVEMENTS.MASTERY_50.id)
      }
      if (masteredCount && masteredCount >= 100 && !existingIds.has(ACHIEVEMENTS.MASTERY_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_100)
        newAchievements.push(ACHIEVEMENTS.MASTERY_100.id)
      }

      // === MILESTONE ACHIEVEMENTS (Level & Points) ===
      if (stats.currentLevel >= 5 && !existingIds.has(ACHIEVEMENTS.LEVEL_5.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_5)
        newAchievements.push(ACHIEVEMENTS.LEVEL_5.id)
      }
      if (stats.currentLevel >= 10 && !existingIds.has(ACHIEVEMENTS.LEVEL_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_10)
        newAchievements.push(ACHIEVEMENTS.LEVEL_10.id)
      }
      if (stats.currentLevel >= 20 && !existingIds.has(ACHIEVEMENTS.LEVEL_20.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_20)
        newAchievements.push(ACHIEVEMENTS.LEVEL_20.id)
      }
      if (stats.totalPoints >= 1000 && !existingIds.has(ACHIEVEMENTS.POINTS_1000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.POINTS_1000)
        newAchievements.push(ACHIEVEMENTS.POINTS_1000.id)
      }
      if (stats.totalPoints >= 10000 && !existingIds.has(ACHIEVEMENTS.POINTS_10000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.POINTS_10000)
        newAchievements.push(ACHIEVEMENTS.POINTS_10000.id)
      }

      // Note: Focus achievements are checked in checkFocusAchievements()

      // Clear cache to force refresh
      if (newAchievements.length > 0) {
        cacheService.delete(`gamification:${userId}`)
      }

    } catch (error) {
      logger.error('Error checking achievements:', error)
    }

    return newAchievements
  }
  
  private async unlockAchievement(userId: string, achievement: typeof GAMIFICATION_CONFIG.ACHIEVEMENTS[keyof typeof GAMIFICATION_CONFIG.ACHIEVEMENTS]): Promise<void> {
    try {
      const { error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          points_awarded: achievement.points,
          unlocked_at: new Date().toISOString()
        })
      
      if (error) {
        logger.error('Error unlocking achievement:', error)
      } else {
        logger.log(`Achievement unlocked: ${achievement.name}`)
        
        // Award points for the achievement
        if (achievement.points > 0) {
          // Update total points in the database
          const { data: currentStats } = await supabase
            .from('user_gamification_stats')
            .select('total_points')
            .eq('user_id', userId)
            .single()
          
          if (currentStats) {
            const newTotalPoints = (currentStats.total_points || 0) + achievement.points
            const newLevel = this.calculateLevel(newTotalPoints)
            
            await supabase
              .from('user_gamification_stats')
              .update({
                total_points: newTotalPoints,
                current_level: newLevel,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
          }
        }
      }
    } catch (error) {
      logger.error('Error in unlockAchievement:', error)
    }
  }

  async checkAndUnlockMissedAchievements(userId: string): Promise<string[]> {
    const newAchievements: string[] = []

    try {
      const stats = await this.getUserStats(userId)
      if (!stats) return []

      // Get existing achievements
      const { data: existingAchievements } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      const existingIds = new Set(existingAchievements?.map(a => a.achievement_id) || [])
      const ACHIEVEMENTS = GAMIFICATION_CONFIG.ACHIEVEMENTS

      // Get total review count
      const { count: totalReviews } = await supabase
        .from('review_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // === REVIEW ACHIEVEMENTS ===
      if (totalReviews && totalReviews >= 1 && !existingIds.has(ACHIEVEMENTS.FIRST_REVIEW.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_REVIEW)
        newAchievements.push(ACHIEVEMENTS.FIRST_REVIEW.id)
      }
      if (totalReviews && totalReviews >= 10 && !existingIds.has(ACHIEVEMENTS.REVIEWS_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_10)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_10.id)
      }
      if (totalReviews && totalReviews >= 50 && !existingIds.has(ACHIEVEMENTS.REVIEWS_50.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_50)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_50.id)
      }
      if (totalReviews && totalReviews >= 100 && !existingIds.has(ACHIEVEMENTS.REVIEWS_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_100)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_100.id)
      }
      if (totalReviews && totalReviews >= 500 && !existingIds.has(ACHIEVEMENTS.REVIEWS_500.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_500)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_500.id)
      }
      if (totalReviews && totalReviews >= 1000 && !existingIds.has(ACHIEVEMENTS.REVIEWS_1000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.REVIEWS_1000)
        newAchievements.push(ACHIEVEMENTS.REVIEWS_1000.id)
      }

      // === STREAK ACHIEVEMENTS ===
      if (stats.currentStreak >= 3 && !existingIds.has(ACHIEVEMENTS.STREAK_3.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_3)
        newAchievements.push(ACHIEVEMENTS.STREAK_3.id)
      }
      if (stats.currentStreak >= 7 && !existingIds.has(ACHIEVEMENTS.STREAK_7.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_7)
        newAchievements.push(ACHIEVEMENTS.STREAK_7.id)
      }
      if (stats.currentStreak >= 14 && !existingIds.has(ACHIEVEMENTS.STREAK_14.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_14)
        newAchievements.push(ACHIEVEMENTS.STREAK_14.id)
      }
      if (stats.currentStreak >= 30 && !existingIds.has(ACHIEVEMENTS.STREAK_30.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_30)
        newAchievements.push(ACHIEVEMENTS.STREAK_30.id)
      }
      if (stats.currentStreak >= 100 && !existingIds.has(ACHIEVEMENTS.STREAK_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.STREAK_100)
        newAchievements.push(ACHIEVEMENTS.STREAK_100.id)
      }

      // === MASTERY ACHIEVEMENTS ===
      const { count: masteredCount } = await supabase
        .from('learning_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('review_count', GAMIFICATION_CONFIG.MASTERY.reviewsRequired)

      if (masteredCount && masteredCount >= 1 && !existingIds.has(ACHIEVEMENTS.FIRST_MASTERY.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_MASTERY)
        newAchievements.push(ACHIEVEMENTS.FIRST_MASTERY.id)
      }
      if (masteredCount && masteredCount >= 10 && !existingIds.has(ACHIEVEMENTS.MASTERY_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_10)
        newAchievements.push(ACHIEVEMENTS.MASTERY_10.id)
      }
      if (masteredCount && masteredCount >= 50 && !existingIds.has(ACHIEVEMENTS.MASTERY_50.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_50)
        newAchievements.push(ACHIEVEMENTS.MASTERY_50.id)
      }
      if (masteredCount && masteredCount >= 100 && !existingIds.has(ACHIEVEMENTS.MASTERY_100.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.MASTERY_100)
        newAchievements.push(ACHIEVEMENTS.MASTERY_100.id)
      }

      // === FOCUS ACHIEVEMENTS ===
      const { data: focusSessions } = await supabase
        .from('focus_sessions')
        .select('total_work_minutes, adherence_percentage')
        .eq('user_id', userId)
        .eq('is_active', false)

      if (focusSessions && focusSessions.length > 0) {
        // First focus session
        if (!existingIds.has(ACHIEVEMENTS.FIRST_FOCUS.id)) {
          await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_FOCUS)
          newAchievements.push(ACHIEVEMENTS.FIRST_FOCUS.id)
        }

        // Total focus hours
        const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0)
        if (totalMinutes >= 60 && !existingIds.has(ACHIEVEMENTS.FOCUS_1_HOUR.id)) {
          await this.unlockAchievement(userId, ACHIEVEMENTS.FOCUS_1_HOUR)
          newAchievements.push(ACHIEVEMENTS.FOCUS_1_HOUR.id)
        }
        if (totalMinutes >= 600 && !existingIds.has(ACHIEVEMENTS.FOCUS_10_HOURS.id)) {
          await this.unlockAchievement(userId, ACHIEVEMENTS.FOCUS_10_HOURS)
          newAchievements.push(ACHIEVEMENTS.FOCUS_10_HOURS.id)
        }

        // Perfect adherence
        const hasPerfectAdherence = focusSessions.some(s => s.adherence_percentage >= 100)
        if (hasPerfectAdherence && !existingIds.has(ACHIEVEMENTS.PERFECT_ADHERENCE.id)) {
          await this.unlockAchievement(userId, ACHIEVEMENTS.PERFECT_ADHERENCE)
          newAchievements.push(ACHIEVEMENTS.PERFECT_ADHERENCE.id)
        }
      }

      // === MILESTONE ACHIEVEMENTS (Level & Points) ===
      if (stats.currentLevel >= 5 && !existingIds.has(ACHIEVEMENTS.LEVEL_5.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_5)
        newAchievements.push(ACHIEVEMENTS.LEVEL_5.id)
      }
      if (stats.currentLevel >= 10 && !existingIds.has(ACHIEVEMENTS.LEVEL_10.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_10)
        newAchievements.push(ACHIEVEMENTS.LEVEL_10.id)
      }
      if (stats.currentLevel >= 20 && !existingIds.has(ACHIEVEMENTS.LEVEL_20.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.LEVEL_20)
        newAchievements.push(ACHIEVEMENTS.LEVEL_20.id)
      }
      if (stats.totalPoints >= 1000 && !existingIds.has(ACHIEVEMENTS.POINTS_1000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.POINTS_1000)
        newAchievements.push(ACHIEVEMENTS.POINTS_1000.id)
      }
      if (stats.totalPoints >= 10000 && !existingIds.has(ACHIEVEMENTS.POINTS_10000.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.POINTS_10000)
        newAchievements.push(ACHIEVEMENTS.POINTS_10000.id)
      }

      // Clear cache to force refresh
      if (newAchievements.length > 0) {
        cacheService.delete(`gamification:${userId}`)
      }

      return newAchievements
    } catch (error) {
      logger.error('Error checking missed achievements:', error)
      return []
    }
  }

  /**
   * Check and unlock focus-related achievements after a focus session ends
   */
  async checkFocusAchievements(
    userId: string,
    sessionStats: {
      totalWorkMinutes: number
      adherencePercentage: number
    }
  ): Promise<string[]> {
    const newAchievements: string[] = []

    try {
      // Get existing achievements
      const { data: existingAchievements } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      const existingIds = new Set(existingAchievements?.map(a => a.achievement_id) || [])
      const ACHIEVEMENTS = GAMIFICATION_CONFIG.ACHIEVEMENTS

      // Get all completed focus sessions for this user
      const { data: focusSessions } = await supabase
        .from('focus_sessions')
        .select('total_work_minutes, adherence_percentage')
        .eq('user_id', userId)
        .eq('is_active', false)

      if (!focusSessions || focusSessions.length === 0) return []

      // First focus session
      if (!existingIds.has(ACHIEVEMENTS.FIRST_FOCUS.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FIRST_FOCUS)
        newAchievements.push(ACHIEVEMENTS.FIRST_FOCUS.id)
      }

      // Total focus hours
      const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0)
      if (totalMinutes >= 60 && !existingIds.has(ACHIEVEMENTS.FOCUS_1_HOUR.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FOCUS_1_HOUR)
        newAchievements.push(ACHIEVEMENTS.FOCUS_1_HOUR.id)
      }
      if (totalMinutes >= 600 && !existingIds.has(ACHIEVEMENTS.FOCUS_10_HOURS.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.FOCUS_10_HOURS)
        newAchievements.push(ACHIEVEMENTS.FOCUS_10_HOURS.id)
      }

      // Perfect adherence (check if current session has 100% adherence)
      if (sessionStats.adherencePercentage >= 100 && !existingIds.has(ACHIEVEMENTS.PERFECT_ADHERENCE.id)) {
        await this.unlockAchievement(userId, ACHIEVEMENTS.PERFECT_ADHERENCE)
        newAchievements.push(ACHIEVEMENTS.PERFECT_ADHERENCE.id)
      }

      // Clear cache to force refresh
      if (newAchievements.length > 0) {
        cacheService.delete(`gamification:${userId}`)
      }

      return newAchievements
    } catch (error) {
      logger.error('Error checking focus achievements:', error)
      return []
    }
  }

  calculateLevel(totalPoints: number): number {
    const { experienceBase, experienceGrowth } = GAMIFICATION_CONFIG.FEATURES.levels
    let level = 1
    let accumulatedXP = 0
    
    while (true) {
      const requiredXP = Math.floor(experienceBase * Math.pow(experienceGrowth, level - 1))
      if (accumulatedXP + requiredXP > totalPoints) {
        break
      }
      accumulatedXP += requiredXP
      level++
    }
    
    return level
  }

  getPointsForNextLevel(currentPoints: number): {
    currentLevelProgress: number
    pointsNeeded: number
    progressPercentage: number
  } {
    const level = this.calculateLevel(currentPoints)
    const { experienceBase, experienceGrowth } = GAMIFICATION_CONFIG.FEATURES.levels
    
    // Calculate total points needed to reach current level
    let levelStartPoints = 0
    for (let i = 1; i < level; i++) {
      levelStartPoints += Math.floor(experienceBase * Math.pow(experienceGrowth, i - 1))
    }
    
    // Points required for current level
    const pointsForCurrentLevel = Math.floor(experienceBase * Math.pow(experienceGrowth, level - 1))
    
    // Progress within current level
    const currentLevelProgress = Math.max(0, currentPoints - levelStartPoints)
    const pointsNeeded = Math.max(0, pointsForCurrentLevel - currentLevelProgress)
    const progressPercentage = Math.min(100, Math.max(0, (currentLevelProgress / pointsForCurrentLevel) * 100))
    
    return {
      currentLevelProgress: Math.max(0, currentLevelProgress),
      pointsNeeded: Math.max(0, pointsNeeded),
      progressPercentage: isNaN(progressPercentage) ? 0 : progressPercentage
    }
  }

  getStreakBonus(streakDays: number): number {
    const milestones = GAMIFICATION_CONFIG.POINTS.streakMilestones
    let bonus = 0
    
    for (const [days, points] of Object.entries(milestones)) {
      if (streakDays >= parseInt(days)) {
        bonus = points
      }
    }
    
    return bonus
  }

  resetSessionCombo(): void {
    this.sessionCombo = 0
    this.lastReviewTime = null
  }
  
  // Clear user stats to force recalculation
  clearUserStats(userId: string): void {
    cacheService.delete(`gamification:${userId}`)
  }
  
  // Force refresh stats from database
  async refreshUserStats(userId: string): Promise<UserGamificationStats | null> {
    this.clearUserStats(userId)
    return this.getUserStats(userId)
  }

  /**
   * Calculate points penalty based on adherence percentage.
   * Lower adherence = higher penalty.
   *
   * @param adherencePercentage - The session adherence percentage (0-100)
   * @param basePoints - The base points earned from the session
   * @returns Object with penalty amount and whether session is considered incomplete
   */
  calculateAdherencePenalty(
    adherencePercentage: number,
    basePoints: number
  ): { penalty: number; isIncomplete: boolean; penaltyRate: number } {
    // 80%+ adherence = no penalty, session complete
    if (adherencePercentage >= 80) {
      return { penalty: 0, isIncomplete: false, penaltyRate: 0 }
    }

    // 60-79% adherence = 25% penalty
    if (adherencePercentage >= 60) {
      const penalty = Math.floor(basePoints * 0.25)
      return { penalty, isIncomplete: false, penaltyRate: 0.25 }
    }

    // 40-59% adherence = 50% penalty, session incomplete
    if (adherencePercentage >= 40) {
      const penalty = Math.floor(basePoints * 0.5)
      return { penalty, isIncomplete: true, penaltyRate: 0.5 }
    }

    // Below 40% = 75% penalty, session incomplete
    const penalty = Math.floor(basePoints * 0.75)
    return { penalty, isIncomplete: true, penaltyRate: 0.75 }
  }

  /**
   * Award points for a focus session with adherence penalty applied
   *
   * @param userId - The user ID
   * @param workMinutes - Total work minutes in the session
   * @param adherencePercentage - The session adherence percentage
   * @returns Object with points breakdown
   */
  async awardFocusSessionPoints(
    userId: string,
    workMinutes: number,
    adherencePercentage: number
  ): Promise<{
    basePoints: number
    penalty: number
    netPoints: number
    isIncomplete: boolean
    penaltyRate: number
  }> {
    // Base points: 2 points per minute of work
    const basePoints = workMinutes * 2

    // Calculate penalty
    const { penalty, isIncomplete, penaltyRate } = this.calculateAdherencePenalty(
      adherencePercentage,
      basePoints
    )

    // Net points (minimum 0)
    const netPoints = Math.max(0, basePoints - penalty)

    // Update user points if there are points to award
    if (netPoints > 0) {
      try {
        const stats = await this.getUserStats(userId)
        if (stats) {
          stats.totalPoints += netPoints
          stats.todayPoints += netPoints
          stats.currentLevel = this.calculateLevel(stats.totalPoints)

          // Save to database
          await supabase
            .from('user_gamification_stats')
            .update({
              total_points: stats.totalPoints,
              current_level: stats.currentLevel,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          // Update daily stats
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const todayStr = today.toISOString().split('T')[0]

          const { data: existingDaily } = await supabase
            .from('daily_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('date', todayStr)
            .maybeSingle()

          if (existingDaily) {
            await supabase
              .from('daily_stats')
              .update({
                points_earned: existingDaily.points_earned + netPoints
              })
              .eq('user_id', userId)
              .eq('date', todayStr)
          } else {
            await supabase
              .from('daily_stats')
              .insert({
                user_id: userId,
                date: todayStr,
                points_earned: netPoints,
                reviews_completed: 0,
                perfect_timing_count: 0,
                items_mastered: 0
              })
          }

          // Clear cache
          cacheService.delete(`gamification:${userId}`)

          // Notify listeners
          this.notifyListeners(stats)
        }
      } catch (error) {
        logger.error('Error awarding focus session points:', error)
      }
    }

    return {
      basePoints,
      penalty,
      netPoints,
      isIncomplete,
      penaltyRate
    }
  }
}

export const gamificationService = GamificationService.getInstance()