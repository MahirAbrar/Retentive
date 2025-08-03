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
  private tempStats: Map<string, UserGamificationStats> = new Map()
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
    // Check temp stats first
    if (this.tempStats.has(userId)) {
      return this.tempStats.get(userId)!
    }
    
    const cacheKey = `gamification:${userId}`
    const cached = cacheService.get<UserGamificationStats>(cacheKey)
    if (cached) return cached
    
    try {
      // Calculate initial streak from review history
      const streak = await this.calculateStreakFromHistory(userId)
      
      // Initialize temp stats for new user
      const stats: UserGamificationStats = {
        userId,
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: streak,
        longestStreak: streak,
        lastReviewDate: null,
        todayReviews: 0,
        todayPoints: 0,
        achievements: []
      }
      
      this.tempStats.set(userId, stats)
      
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
  ): Promise<void> {
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
      
      // Save updated stats
      this.tempStats.set(userId, stats)
      
      // Clear cache
      cacheService.delete(`gamification:${userId}`)
      
      // Notify listeners of the update
      this.notifyListeners(stats)
      
      // Check for achievements
      if (reviewData) {
        await this.checkAchievements(userId, reviewData)
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
    
    // Check for first review achievement
    if (reviewData.reviewCount === 1) {
      // Would check if user already has this achievement
      newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_REVIEW.id)
    }
    
    // Check for perfect timing achievements
    if (reviewData.wasPerfectTiming) {
      // Would track perfect timing count
    }
    
    // Check for mastery achievement
    if (reviewData.reviewCount === GAMIFICATION_CONFIG.MASTERY.reviewsRequired) {
      newAchievements.push(GAMIFICATION_CONFIG.ACHIEVEMENTS.FIRST_MASTERY.id)
    }
    
    return newAchievements
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
    this.tempStats.delete(userId)
    cacheService.delete(`gamification:${userId}`)
  }
}

export const gamificationService = GamificationService.getInstance()