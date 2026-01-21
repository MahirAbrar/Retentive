import type { LearningMode } from '../types/database'

// Learning modes (synced with gamification config, but inlined to avoid circular dependencies)
export const LEARNING_MODES: Record<string, { label: string; description: string }> = {
  ultracram: {
    label: 'Ultra-Cram Mode',
    description: 'Night before exam, urgent deadlines',
  },
  cram: {
    label: 'Cram Mode',
    description: 'Important presentations, job interviews',
  },
  steady: {
    label: 'Steady Mode',
    description: 'Regular coursework, professional development',
  },
  extended: {
    label: 'Extended Mode',
    description: 'Background knowledge, general interest',
  },
}

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

// Mastery threshold (5 reviews required)
export const MASTERY_THRESHOLD = 5