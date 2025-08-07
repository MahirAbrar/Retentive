import type { LearningItem } from '../types/database'
import { GAMIFICATION_CONFIG } from '../config/gamification'

export interface ReviewResult {
  nextReviewAt: string
  intervalDays: number
  easeFactor: number
  isMastered: boolean
  masteryProgress: number
}

export class SpacedRepetitionGamifiedService {
  private static instance: SpacedRepetitionGamifiedService
  
  private constructor() {}
  
  public static getInstance(): SpacedRepetitionGamifiedService {
    if (!SpacedRepetitionGamifiedService.instance) {
      SpacedRepetitionGamifiedService.instance = new SpacedRepetitionGamifiedService()
    }
    return SpacedRepetitionGamifiedService.instance
  }

  calculateNextReview(item: LearningItem): ReviewResult {
    const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
    
    // Get the current review number (0-indexed)
    const reviewIndex = Math.min(item.review_count, mode.intervals.length - 1)
    
    // Get hours until next review from config
    const hoursUntilNext = mode.intervals[reviewIndex]
    
    // Calculate next review date using milliseconds for precision
    const now = new Date()
    const millisecondsUntilNext = hoursUntilNext * 60 * 60 * 1000
    const nextReviewAt = new Date(now.getTime() + millisecondsUntilNext)
    
    // Convert hours to days for storage
    const intervalDays = hoursUntilNext / 24
    
    // Check if mastered (will be mastered AFTER this review completes)
    const isMastered = item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired
    const masteryProgress = Math.min(
      (item.review_count + 1) / GAMIFICATION_CONFIG.MASTERY.reviewsRequired,
      1
    )
    
    return {
      nextReviewAt: nextReviewAt.toISOString(),
      intervalDays,
      easeFactor: item.ease_factor, // Keep the same for now
      isMastered,
      masteryProgress
    }
  }

  getDueItems(items: LearningItem[]): LearningItem[] {
    const now = new Date()
    
    return items.filter(item => {
      // Never reviewed items (review_count = 0) are considered "ready to learn" not "due"
      if (item.review_count === 0) return false
      
      // If no next_review_at is set but item has been reviewed, something is wrong
      if (!item.next_review_at) {
        console.warn('Item has review_count > 0 but no next_review_at:', item)
        return false
      }
      
      const reviewDate = new Date(item.next_review_at)
      const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
      
      // Check if within early window (windowBefore is in hours)
      const windowBeforeMs = mode.windowBefore * 60 * 60 * 1000
      const earliestReviewTime = reviewDate.getTime() - windowBeforeMs
      
      return now.getTime() >= earliestReviewTime
    }).sort((a, b) => {
      // Sort by priority (descending) then by due date (ascending)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      if (!a.next_review_at) return -1
      if (!b.next_review_at) return 1
      
      return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    })
  }

  getReviewTimeStatus(item: LearningItem): {
    status: 'early' | 'onTime' | 'inWindow' | 'late'
    message: string
    color: string
  } {
    if (!item.next_review_at) {
      return { status: 'onTime', message: 'Ready to review', color: 'var(--color-success)' }
    }
    
    const now = new Date()
    const dueTime = new Date(item.next_review_at)
    const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
    
    const earliestTime = new Date(dueTime)
    earliestTime.setHours(earliestTime.getHours() - mode.windowBefore)
    
    const latestTime = new Date(dueTime)
    latestTime.setHours(latestTime.getHours() + mode.windowAfter)
    
    const hoursDiff = (dueTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const absHoursDiff = Math.abs(hoursDiff)
    
    if (now < earliestTime) {
      return { 
        status: 'early', 
        message: `Available in ${Math.ceil(-hoursDiff)} hours`,
        color: 'var(--color-gray-500)'
      }
    }
    
    if (absHoursDiff <= GAMIFICATION_CONFIG.FEATURES.timePressure.perfectWindow) {
      return { 
        status: 'onTime', 
        message: 'Perfect timing! 🎯',
        color: 'var(--color-perfect)'
      }
    }
    
    if (now <= latestTime) {
      return { 
        status: 'inWindow', 
        message: hoursDiff > 0 ? `Due in ${Math.ceil(hoursDiff)} hours` : 'Due now',
        color: 'var(--color-success)'
      }
    }
    
    return { 
      status: 'late', 
      message: `${Math.ceil(-hoursDiff)} hours overdue`,
      color: 'var(--color-error)'
    }
  }

  getMasteryStage(reviewCount: number) {
    const stageNumber = Math.min(reviewCount + 1, GAMIFICATION_CONFIG.MASTERY.reviewsRequired)
    return GAMIFICATION_CONFIG.MASTERY.stages[stageNumber as keyof typeof GAMIFICATION_CONFIG.MASTERY.stages]
  }

  getUpcomingItems(items: LearningItem[], days: number = 7): LearningItem[] {
    const now = new Date()
    const future = new Date()
    future.setDate(future.getDate() + days)
    
    return items.filter(item => {
      if (!item.next_review_at) return false
      
      const reviewDate = new Date(item.next_review_at)
      const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
      
      // Adjust for early window
      const earliestReview = new Date(reviewDate)
      earliestReview.setHours(earliestReview.getHours() - mode.windowBefore)
      
      return earliestReview > now && earliestReview <= future
    }).sort((a, b) => {
      return new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime()
    })
  }

  getItemsByStatus(items: LearningItem[]) {
    const now = new Date()
    
    const overdue: LearningItem[] = []
    const due: LearningItem[] = []
    const upcoming: LearningItem[] = []
    const mastered: LearningItem[] = []
    
    items.forEach(item => {
      // Check if mastered
      if (item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired) {
        mastered.push(item)
        return
      }
      
      if (!item.next_review_at) {
        due.push(item) // Never reviewed items are due
      } else {
        const timeStatus = this.getReviewTimeStatus(item)
        
        if (timeStatus.status === 'late') {
          overdue.push(item)
        } else if (timeStatus.status === 'early') {
          upcoming.push(item)
        } else {
          due.push(item)
        }
      }
    })
    
    return { overdue, due, upcoming, mastered }
  }
}

export const spacedRepetitionGamified = SpacedRepetitionGamifiedService.getInstance()