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
  test: {
    label: 'Test Mode',
    description: '30-second intervals for testing',
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

/**
 * Mode tooltip data — used in TopicCard and TopicList
 */
export const MODE_TOOLTIP: Record<LearningMode, {
  schedule: string
  session: string
  chunk: string
}> = {
  ultracram: {
    schedule: '30s → 2h → 1d → 3d',
    session: '15-20 min',
    chunk: '~50-75 words'
  },
  cram: {
    schedule: '2h → 1d → 3d → 7d',
    session: '25-30 min',
    chunk: '~50-75 words'
  },
  steady: {
    schedule: '1d → 3d → 7d → 14d',
    session: '25-30 min',
    chunk: '~75-125 words'
  },
  extended: {
    schedule: '3d → 7d → 14d → 30d',
    session: '30-45 min',
    chunk: '~100-150 words'
  },
  test: {
    schedule: '30s → 30s → 30s → 30s',
    session: '1-2 min',
    chunk: 'Any length'
  }
}

/**
 * Mode guidance data — used in NewTopicPage
 */
export const MODE_GUIDANCE: Record<LearningMode, {
  intervals: string
  sessionLength: string
  contentLength: string
  example: string
}> = {
  ultracram: {
    intervals: '30s → 2h → 1d → 3d',
    sessionLength: '15-20 min, then break',
    contentLength: '~50-75 words',
    example: 'ATP definition: page 42\nKrebs cycle: diagram 3.1\nMitosis phases: bullet points'
  },
  cram: {
    intervals: '2h → 1d → 3d → 7d',
    sessionLength: '25-30 min, then break',
    contentLength: '~50-75 words',
    example: 'REST API basics: section 2.1\nHTTP methods: notes p.15\nStatus codes: summary table'
  },
  steady: {
    intervals: '1d → 3d → 7d → 14d',
    sessionLength: '25-30 min, then break',
    contentLength: '~75-125 words',
    example: 'Growth Hormone: paragraphs 1-3\nPhotosynthesis: light reactions section\nReact Hooks: useEffect basics + examples'
  },
  extended: {
    intervals: '3d → 7d → 14d → 30d',
    sessionLength: '30-45 min, then break',
    contentLength: '~100-150 words',
    example: 'Compound interest: chapter 4, worked examples\nNeural networks: architecture + backprop notes\nDesign patterns: singleton with code samples'
  },
  test: {
    intervals: '30s → 30s → 30s → 30s',
    sessionLength: '1-2 min',
    contentLength: 'Any length',
    example: 'Quick test item 1\nQuick test item 2\nQuick test item 3'
  }
}