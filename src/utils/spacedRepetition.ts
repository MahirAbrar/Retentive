import type { LearningItem, ReviewDifficulty } from '../types/database'
import { BASE_INTERVALS, EASE_FACTOR_DELTA, EASE_FACTOR, PRIORITY_INTERVAL_MODIFIER } from '../constants/learning'

interface NextReviewResult {
  next_review_at: string
  interval_days: number
  ease_factor: number
}

export function calculateNextReview(
  item: LearningItem,
  difficulty: ReviewDifficulty
): NextReviewResult {
  // Calculate new ease factor
  let newEaseFactor = item.ease_factor + EASE_FACTOR_DELTA[difficulty]
  newEaseFactor = Math.max(EASE_FACTOR.MIN, Math.min(EASE_FACTOR.MAX, newEaseFactor))

  // Calculate base interval
  let intervalDays: number

  if (item.review_count === 0) {
    // First review - use base intervals
    intervalDays = BASE_INTERVALS[item.learning_mode][difficulty]
  } else if (difficulty === 'again') {
    // Failed review - reset to short interval
    intervalDays = BASE_INTERVALS[item.learning_mode].again
  } else {
    // Calculate next interval based on previous interval and ease factor
    intervalDays = item.interval_days * newEaseFactor
    
    // Apply minimum intervals based on difficulty
    const minInterval = BASE_INTERVALS[item.learning_mode][difficulty]
    intervalDays = Math.max(intervalDays, minInterval)
  }

  // Apply priority modifier
  const priorityModifier = PRIORITY_INTERVAL_MODIFIER[item.priority as keyof typeof PRIORITY_INTERVAL_MODIFIER] || 1.0
  intervalDays = intervalDays * priorityModifier

  // Add some randomness to prevent clustering (±10%)
  const randomFactor = 0.9 + Math.random() * 0.2
  intervalDays = intervalDays * randomFactor

  // Calculate next review date
  const nextReviewDate = new Date()
  nextReviewDate.setTime(nextReviewDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  return {
    next_review_at: nextReviewDate.toISOString(),
    interval_days: intervalDays,
    ease_factor: newEaseFactor
  }
}