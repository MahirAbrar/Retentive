import type { LearningMode } from '../types/database'
import { GAMIFICATION_CONFIG } from '../config/gamification'

// Pull learning modes from gamification config (exclude test mode)
export const LEARNING_MODES: Record<string, { label: string; description: string }> = Object.entries(
  GAMIFICATION_CONFIG.LEARNING_MODES
)
  .filter(([key]) => key !== 'test') // Exclude test mode from UI
  .reduce((acc, [key, mode]) => {
    acc[key] = {
      label: mode.name,
      description: mode.description,
    }
    return acc
  }, {} as Record<string, { label: string; description: string }>)

export const EASE_FACTOR = {
  MIN: 1.3,
  DEFAULT: 2.5,
  MAX: 2.5,
} as const

export const DEFAULT_USER_SETTINGS = {
  default_learning_mode: 'steady' as LearningMode,
  daily_item_limit: 30,
  notification_enabled: true,
  preferred_study_time: null,
}

// Export mastery settings from gamification config
export const MASTERY_THRESHOLD = GAMIFICATION_CONFIG.MASTERY.reviewsRequired