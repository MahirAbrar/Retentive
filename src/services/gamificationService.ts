import { GAMIFICATION_CONFIG } from '../config/gamification'
import type { LearningItem } from '../types/database'
import { supabase } from './supabase'
import { cacheService } from './cacheService'

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
      let { data: dbStats, error } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching gamification stats:', error)
        return null
      }
      
      // If no stats exist, create them
      if (!dbStats) {
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
          console.error('Error creating gamification stats:', insertError)
          return null
        }
        
        dbStats = newStats
      }
      
      // Get today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: todayStats } = await supabase
        .from('daily_stats')
        .select('points_earned, reviews_completed')
        .eq('user_id', userId)
        .eq('date', today.toISOString().split('T')[0])
        .single()
      
      // Get achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId)
      
      const stats: UserGamificationStats = {
        userId,
        totalPoints: dbStats.total_points || 0,
        currentLevel: dbStats.current_level || 1,
        currentStreak: dbStats.current_streak || 0,
        longestStreak: dbStats.longest_streak || 0,
        lastReviewDate: dbStats.last_review_date,
        todayReviews: todayStats?.reviews_completed || 0,
        todayPoints: todayStats?.points_earned || 0,
        achievements: achievements?.map(a => a.achievement_id) || []
      }
      
      // Cache for 1 minute
      cacheService.set(cacheKey, stats, 60 * 1000)
      return stats
    } catch (error) {
      console.error('Error fetching gamification stats:', error)
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
          const date = new Date(session.reviewed_at).toDateString()
          dates.add(date)
        })
        
        // Check consecutive days from today backwards
        const checkDate = new Date()
        while (dates.has(checkDate.toDateString())) {
          streakDays++
          checkDate.setDate(checkDate.getDate() - 1)
        }
      }
      
      return streakDays
    } catch (error) {
      console.error('Error calculating streak from history:', error)
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
      console.log('Updating user points:', { userId, pointsToAdd })
      
      // Get current stats
      const stats = await this.getUserStats(userId)
      if (!stats) {
        console.error('No stats found for user:', userId)
        return
      }
      
      // Update points
      stats.totalPoints += pointsToAdd
      stats.todayPoints += pointsToAdd
      stats.todayReviews += 1
      
      console.log('Updated stats:', { 
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
        console.error('Error updating gamification stats:', updateError)
      }
      
      // Update daily stats
      const todayForDaily = new Date()
      todayForDaily.setHours(0, 0, 0, 0)
      const todayStrForDaily = todayForDaily.toISOString().split('T')[0]
      
      // First check if daily stats exist
      const { data: existingDaily } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', todayStrForDaily)
        .single()
      
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
          console.error('Error updating daily stats:', dailyError)
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
          console.error('Error creating daily stats:', dailyError)
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
      console.error('Error updating user points:', error)
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
      
      // Check for first review achievement
      if (reviewData.reviewCount === 1 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_REVIEW.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_REVIEW)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_REVIEW.id)
      }
      
      // Check for perfect timing achievements
      if (reviewData.wasPerfectTiming) {
        // Get today's perfect timing count
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { data: todayStats } = await supabase
          .from('daily_stats')
          .select('perfect_timing_count')
          .eq('user_id', userId)
          .eq('date', today.toISOString().split('T')[0])
          .single()
        
        const perfectCount = (todayStats?.perfect_timing_count || 0) + 1
        
        // Check perfect timing milestones
        if (perfectCount === 5 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.PERFECT_WEEK.id)) {
          await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.PERFECT_WEEK)
          newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.PERFECT_WEEK.id)
        }
      }
      
      // Check for mastery achievement
      if (reviewData.reviewCount === GAMIFICATION_CONFIG.MASTERY.reviewsRequired && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_MASTERY.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_MASTERY)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_MASTERY.id)
      }
      
      // Check streak achievements
      if (stats.currentStreak === 7 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.WEEK_STREAK.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.WEEK_STREAK)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.WEEK_STREAK.id)
      }
      
      if (stats.currentStreak === 30 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.MONTH_STREAK.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.MONTH_STREAK)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.MONTH_STREAK.id)
      }
      
      // Check point milestones
      if (stats.totalPoints >= 100 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_100.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_100)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_100.id)
      }
      
      if (stats.totalPoints >= 1000 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_1000.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_1000)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.POINTS_1000.id)
      }
      
      // Check level achievements
      if (stats.currentLevel >= 5 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_5.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_5)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_5.id)
      }
      
      if (stats.currentLevel >= 10 && !existingIds.has(GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_10.id)) {
        await this.unlockAchievement(userId, GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_10)
        newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.LEVEL_10.id)
      }
      
      // Clear cache to force refresh
      if (newAchievements.length > 0) {
        cacheService.delete(`gamification:${userId}`)
      }
      
    } catch (error) {
      console.error('Error checking achievements:', error)
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
        console.error('Error unlocking achievement:', error)
      } else {
        console.log(`Achievement unlocked: ${achievement.name}`)
        
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
      console.error('Error in unlockAchievement:', error)
    }
  }

  calculateLevel(totalPoints: number): number {
    const { experienceBase, experienceGrowth } = GAMIFICATION_CONFIG.FEATURES.levels
    let level = 1
    let requiredXP = experienceBase
    let accumulatedXP = 0
    
    while (accumulatedXP + requiredXP <= totalPoints) {
      accumulatedXP += requiredXP
      level++
      requiredXP = Math.floor(experienceBase * Math.pow(experienceGrowth, level - 1))
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
    
    // Calculate total points needed for current level
    let levelStartPoints = 0
    for (let i = 1; i < level; i++) {
      levelStartPoints += Math.floor(experienceBase * Math.pow(experienceGrowth, i - 1))
    }
    
    const pointsForCurrentLevel = Math.floor(experienceBase * Math.pow(experienceGrowth, level - 1))
    const currentLevelProgress = currentPoints - levelStartPoints
    const pointsNeeded = pointsForCurrentLevel - currentLevelProgress
    const progressPercentage = (currentLevelProgress / pointsForCurrentLevel) * 100
    
    return {
      currentLevelProgress,
      pointsNeeded,
      progressPercentage
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
}

export const gamificationService = GamificationService.getInstance()