import type { LearningMode, ReviewDifficulty } from '../types/database'

export const LEARNING_MODES: Record<LearningMode, { label: string; description: string }> = {
  cram: {
    label: 'Cram Mode',
    description: 'Intensive review with shorter intervals for quick learning',
  },
  steady: {
    label: 'Steady Mode',
    description: 'Traditional spaced repetition for long-term retention',
  },
}

export const PRIORITY_LEVELS = {
  MIN: 1,
  DEFAULT: 5,
  MAX: 10,
} as const

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Low',
  4: 'Medium-Low',
  5: 'Medium',
  6: 'Medium',
  7: 'Medium-High',
  8: 'High',
  9: 'High',
  10: 'Critical',
}

export const BASE_INTERVALS = {
  cram: {
    again: 0.0007, // ~1 minute (1/1440 of a day)
    hard: 0.0014, // ~2 minutes
    good: 0.0021, // ~3 minutes
    easy: 0.0035, // ~5 minutes
  },
  steady: {
    again: 0.0007, // ~1 minute
    hard: 0.0021, // ~3 minutes
    good: 0.0035, // ~5 minutes
    easy: 0.007, // ~10 minutes
  },
} as const

export const EASE_FACTOR_DELTA: Record<ReviewDifficulty, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.13,
}

export const EASE_FACTOR = {
  MIN: 1.3,
  DEFAULT: 2.5,
  MAX: 2.5,
} as const

export const PRIORITY_INTERVAL_MODIFIER = {
  1: 1.5, // Very Low: 50% longer intervals
  2: 1.3,
  3: 1.2,
  4: 1.1,
  5: 1.0, // Medium: Standard intervals
  6: 1.0,
  7: 0.9,
  8: 0.8, // High: 20% shorter intervals
  9: 0.7,
  10: 0.6, // Critical: 40% shorter intervals
} as const

export const DEFAULT_USER_SETTINGS = {
  default_learning_mode: 'steady' as LearningMode,
  daily_item_limit: 30,
  notification_enabled: true,
  preferred_study_time: null,
}