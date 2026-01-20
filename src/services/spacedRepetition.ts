import type { LearningItem, ReviewDifficulty } from '@/types/database'
import {
  BASE_INTERVALS,
  EASE_FACTOR_DELTA,
  EASE_FACTOR,
} from '@/constants/learning'
import { GAMIFICATION_CONFIG } from '@/config/gamification'

export interface ReviewResult {
  nextReviewAt: string
  intervalDays: number
  easeFactor: number
}

export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  public static getInstance(): SpacedRepetitionService {
    if (!SpacedRepetitionService.instance) {
      SpacedRepetitionService.instance = new SpacedRepetitionService()
    }
    return SpacedRepetitionService.instance
  }

  calculateNextReview(
    item: LearningItem,
    difficulty: ReviewDifficulty
  ): ReviewResult {
    // Handle different mastery statuses
    if (item.mastery_status === 'archived') {
      // Archived items don't get reviewed
      return {
        nextReviewAt: '',
        intervalDays: 0,
        easeFactor: item.ease_factor,
      }
    }
    
    if (item.mastery_status === 'maintenance') {
      // Maintenance mode: double the interval each time
      const maintenanceInterval = this.calculateMaintenanceInterval(item)
      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + maintenanceInterval)
      
      return {
        nextReviewAt: nextReviewAt.toISOString(),
        intervalDays: maintenanceInterval,
        easeFactor: item.ease_factor,
      }
    }
    
    if (item.mastery_status === 'repeat') {
      // Repeat mode: treat as first review
      const newEaseFactor = 2.5
      const intervalDays = this.calculateInterval(
        { ...item, review_count: 0, interval_days: 0 },
        difficulty,
        newEaseFactor
      )
      
      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + Math.ceil(intervalDays))
      
      return {
        nextReviewAt: nextReviewAt.toISOString(),
        intervalDays,
        easeFactor: newEaseFactor,
      }
    }
    
    // Normal review calculation
    const newEaseFactor = this.calculateEaseFactor(item.ease_factor, difficulty)
    const intervalDays = this.calculateInterval(
      item,
      difficulty,
      newEaseFactor
    )
    
    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + Math.ceil(intervalDays))
    
    return {
      nextReviewAt: nextReviewAt.toISOString(),
      intervalDays,
      easeFactor: newEaseFactor,
    }
  }

  private calculateMaintenanceInterval(item: LearningItem): number {
    // Use stored maintenance interval or calculate based on mode
    const currentInterval = item.maintenance_interval_days || item.interval_days
    const nextInterval = currentInterval * 2
    
    // Cap based on learning mode
    switch (item.learning_mode) {
      case 'ultracram':
        return Math.min(nextInterval, 60) // 2 months max
      case 'cram':
        return Math.min(nextInterval, 90) // 3 months max
      case 'extended':
        return Math.min(nextInterval, 180) // 6 months max
      case 'steady':
        return Math.min(nextInterval, 365) // 1 year max
      default:
        return nextInterval
    }
  }

  private calculateEaseFactor(currentFactor: number, difficulty: ReviewDifficulty): number {
    const delta = EASE_FACTOR_DELTA[difficulty]
    const newFactor = currentFactor + delta
    
    return Math.max(EASE_FACTOR.MIN, Math.min(EASE_FACTOR.MAX, newFactor))
  }

  private calculateInterval(
    item: LearningItem,
    difficulty: ReviewDifficulty,
    easeFactor: number
  ): number {
    const mode = item.learning_mode

    // Use fixed intervals from gamification config
    const modeConfig = GAMIFICATION_CONFIG.LEARNING_MODES[mode]
    if (modeConfig && modeConfig.intervals) {
      // Determine which review this is
      let reviewIndex = item.review_count

      // If "again" was selected, reset to first interval
      if (difficulty === 'again') {
        reviewIndex = 0
      }

      // Get the interval in hours from config
      const intervalHours = modeConfig.intervals[reviewIndex] || modeConfig.intervals[modeConfig.intervals.length - 1]

      // Convert hours to days
      let intervalDays = intervalHours / 24

      // Apply difficulty modifier if not using "good"
      if (difficulty === 'hard' && reviewIndex > 0) {
        intervalDays *= 0.8 // 20% shorter for hard
      } else if (difficulty === 'easy' && reviewIndex > 0) {
        intervalDays *= 1.2 // 20% longer for easy
      }

      return intervalDays
    }

    // Fallback to old calculation if config not found
    // First review or "Again" response
    if (item.review_count === 0 || difficulty === 'again') {
      return BASE_INTERVALS[mode][difficulty]
    }

    // Calculate base interval
    let baseInterval: number

    if (item.interval_days < 1) {
      // Still in initial learning phase
      baseInterval = BASE_INTERVALS[mode][difficulty]
    } else {
      // Beyond initial learning
      switch (difficulty) {
        case 'hard':
          baseInterval = item.interval_days * 1.2
          break
        case 'good':
          baseInterval = item.interval_days * easeFactor
          break
        case 'easy':
          baseInterval = item.interval_days * easeFactor * 1.3
          break
        default:
          baseInterval = BASE_INTERVALS[mode][difficulty]
      }
    }

    // Apply mode-specific caps
    if (mode === 'cram') {
      // Cram mode caps at 7 days
      return Math.min(baseInterval, 7)
    } else {
      // Steady mode has no cap
      return baseInterval
    }
  }

  getDueItems(items: LearningItem[]): LearningItem[] {
    const now = new Date()
    
    return items.filter(item => {
      // Skip archived items
      if (item.mastery_status === 'archived') return false
      
      // Skip items that are mastered but not in maintenance
      if (item.mastery_status === 'mastered' && item.review_count >= 5) return false
      
      if (!item.next_review_at) return true // Never reviewed
      
      const reviewDate = new Date(item.next_review_at)
      return reviewDate <= now
    }).sort((a, b) => {
      // Sort by due date (ascending)
      if (!a.next_review_at) return -1
      if (!b.next_review_at) return 1

      return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    })
  }

  getUpcomingItems(items: LearningItem[], days: number = 7): LearningItem[] {
    const now = new Date()
    const future = new Date()
    future.setDate(future.getDate() + days)
    
    return items.filter(item => {
      // Skip archived items
      if (item.mastery_status === 'archived') return false
      
      // Skip items that are mastered but not in maintenance
      if (item.mastery_status === 'mastered' && item.review_count >= 5) return false
      
      if (!item.next_review_at) return false
      
      const reviewDate = new Date(item.next_review_at)
      return reviewDate > now && reviewDate <= future
    }).sort((a, b) => {
      // Sort by due date (ascending)
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : 0
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : 0
      return aTime - bTime
    })
  }

  getItemsByStatus(items: LearningItem[]) {
    const now = new Date()
    
    const overdue: LearningItem[] = []
    const due: LearningItem[] = []
    const upcoming: LearningItem[] = []
    const mastered: LearningItem[] = []
    const archived: LearningItem[] = []
    const maintenance: LearningItem[] = []
    
    items.forEach(item => {
      // Handle different mastery statuses
      if (item.mastery_status === 'archived') {
        archived.push(item)
        return
      }
      
      if (item.mastery_status === 'maintenance') {
        maintenance.push(item)
        // Also check if maintenance review is due
        if (item.next_review_at) {
          const reviewDate = new Date(item.next_review_at)
          const daysDiff = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff <= 0) {
            due.push(item)
          }
        }
        return
      }
      
      if (item.mastery_status === 'mastered' || item.review_count >= 5) {
        mastered.push(item)
        return
      }
      
      // Normal items
      if (!item.next_review_at) {
        due.push(item) // Never reviewed items are due
      } else {
        const reviewDate = new Date(item.next_review_at)
        const daysDiff = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDiff < -1) {
          overdue.push(item)
        } else if (daysDiff <= 0) {
          due.push(item)
        } else {
          upcoming.push(item)
        }
      }
    })
    
    return { overdue, due, upcoming, mastered, archived, maintenance }
  }

  // Helper method to check if item should show mastery dialog
  shouldShowMasteryDialog(item: LearningItem, reviewCount: number): boolean {
    return reviewCount === 5 && 
           (!item.mastery_status || item.mastery_status === 'active') &&
           item.review_count === 4 // About to become 5
  }

  // Helper to get active items only (for review queue)
  getActiveItems(items: LearningItem[]): LearningItem[] {
    return items.filter(item => 
      !item.mastery_status || 
      item.mastery_status === 'active' || 
      item.mastery_status === 'maintenance' ||
      item.mastery_status === 'repeat'
    )
  }

  // Helper to get archived items
  getArchivedItems(items: LearningItem[]): LearningItem[] {
    return items.filter(item => item.mastery_status === 'archived')
  }

  // Helper to get mastered items
  getMasteredItems(items: LearningItem[]): LearningItem[] {
    return items.filter(item => 
      item.mastery_status === 'mastered' || 
      item.mastery_status === 'maintenance' ||
      (item.review_count >= 5 && !item.mastery_status)
    )
  }
}

export const spacedRepetitionService = SpacedRepetitionService.getInstance()