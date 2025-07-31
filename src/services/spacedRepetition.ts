import type { LearningItem, ReviewDifficulty } from '@/types/database'
import {
  BASE_INTERVALS,
  EASE_FACTOR_DELTA,
  EASE_FACTOR,
  PRIORITY_INTERVAL_MODIFIER,
} from '@/constants/learning'

export interface ReviewResult {
  nextReviewAt: string
  intervalDays: number
  easeFactor: number
}

export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService
  
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
    const priority = item.priority
    const priorityModifier = PRIORITY_INTERVAL_MODIFIER[priority as keyof typeof PRIORITY_INTERVAL_MODIFIER] || 1
    
    // First review or "Again" response
    if (item.review_count === 0 || difficulty === 'again') {
      return BASE_INTERVALS[mode][difficulty] * priorityModifier
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
    
    // Apply priority modifier
    const finalInterval = baseInterval * priorityModifier
    
    // Apply mode-specific caps
    if (mode === 'cram') {
      // Cram mode caps at 7 days
      return Math.min(finalInterval, 7)
    } else {
      // Steady mode has no cap
      return finalInterval
    }
  }

  getDueItems(items: LearningItem[]): LearningItem[] {
    const now = new Date()
    
    return items.filter(item => {
      if (!item.next_review_at) return true // Never reviewed
      
      const reviewDate = new Date(item.next_review_at)
      return reviewDate <= now
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

  getUpcomingItems(items: LearningItem[], days: number = 7): LearningItem[] {
    const now = new Date()
    const future = new Date()
    future.setDate(future.getDate() + days)
    
    return items.filter(item => {
      if (!item.next_review_at) return false
      
      const reviewDate = new Date(item.next_review_at)
      return reviewDate > now && reviewDate <= future
    }).sort((a, b) => {
      // Sort by due date (ascending)
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
      if (!item.next_review_at) {
        due.push(item) // Never reviewed items are due
      } else {
        const reviewDate = new Date(item.next_review_at)
        const daysDiff = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDiff < -1) {
          overdue.push(item)
        } else if (daysDiff <= 0) {
          due.push(item)
        } else if (item.interval_days >= 21) {
          mastered.push(item)
        } else {
          upcoming.push(item)
        }
      }
    })
    
    return { overdue, due, upcoming, mastered }
  }
}

export const spacedRepetitionService = SpacedRepetitionService.getInstance()