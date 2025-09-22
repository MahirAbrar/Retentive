import type { LearningMode } from '../types/database'

export interface ModeRecommendation {
  chunkSize: {
    min: number
    max: number
    description: string
  }
  sessionLength: {
    chunks: string
    minutes: number
    description: string
  }
  breakTime: {
    after: number
    duration: string
    description: string
  }
  cognitiveLoad: {
    level: 'Light' | 'Moderate' | 'Heavy' | 'Intense'
    color: string
  }
}

export const LEARNING_MODE_RECOMMENDATIONS: Record<LearningMode, ModeRecommendation> = {
  ultracram: {
    chunkSize: {
      min: 4,
      max: 6,
      description: '4-6 sentences per item for rapid processing'
    },
    sessionLength: {
      chunks: '3-4 chunks',
      minutes: 20,
      description: 'Short bursts to prevent cognitive overload'
    },
    breakTime: {
      after: 20,
      duration: '5 minutes',
      description: 'Quick mental reset between sessions'
    },
    cognitiveLoad: {
      level: 'Intense',
      color: 'var(--color-error)'
    }
  },
  cram: {
    chunkSize: {
      min: 4,
      max: 6,
      description: '4-6 sentences for efficient cramming'
    },
    sessionLength: {
      chunks: '3-4 chunks',
      minutes: 25,
      description: 'Focused sessions with high frequency'
    },
    breakTime: {
      after: 25,
      duration: '5-10 minutes',
      description: 'Brief recovery between intensive reviews'
    },
    cognitiveLoad: {
      level: 'Heavy',
      color: 'var(--color-warning)'
    }
  },
  steady: {
    chunkSize: {
      min: 5,
      max: 8,
      description: '5-8 sentences for optimal retention'
    },
    sessionLength: {
      chunks: '4-6 chunks',
      minutes: 30,
      description: 'Balanced sessions for daily practice'
    },
    breakTime: {
      after: 30,
      duration: '10 minutes',
      description: 'Standard break for memory consolidation'
    },
    cognitiveLoad: {
      level: 'Moderate',
      color: 'var(--color-success)'
    }
  },
  extended: {
    chunkSize: {
      min: 7,
      max: 10,
      description: '7-10 sentences with rich context'
    },
    sessionLength: {
      chunks: '5-7 chunks',
      minutes: 35,
      description: 'Extended sessions for deep learning'
    },
    breakTime: {
      after: 35,
      duration: '10-15 minutes',
      description: 'Longer breaks for complex material'
    },
    cognitiveLoad: {
      level: 'Light',
      color: 'var(--color-info)'
    }
  }
}

export interface LearningModeExample {
  title: string
  description: string
  example: string
  benefits: string[]
  idealFor: string[]
}

export const LEARNING_MODE_EXAMPLES: Record<LearningMode, LearningModeExample> = {
  ultracram: {
    title: 'Ultra-Cram Mode',
    description: 'Lightning-fast reviews every 30 minutes for immediate retention. Perfect for last-minute preparation or quick memorization tasks.',
    example: 'Imagine you have a presentation in 2 hours. Ultra-Cram shows you key points every 30 minutes, reinforcing them 3-4 times before you present. Your brain gets multiple rapid exposures, creating strong short-term memory traces.',
    benefits: [
      'Maximum exposure in minimum time',
      'Ideal for emergency learning',
      'Creates strong short-term memory'
    ],
    idealFor: [
      'Presentations in <3 hours',
      'Quick vocabulary before conversations',
      'Last-minute exam facts'
    ]
  },
  cram: {
    title: 'Cram Mode',
    description: 'Strategic 4-hour review cycles for exam preparation. Balances frequency with processing time for better encoding.',
    example: 'Studying for tomorrow\'s test? Cram mode reviews material every 4 hours, giving you 3-4 exposures today and 2-3 tomorrow morning. Each review strengthens neural pathways while preventing fatigue from over-reviewing.',
    benefits: [
      'Optimal for 1-2 day preparation',
      'Prevents cognitive fatigue',
      'Balances repetition with rest'
    ],
    idealFor: [
      'Next-day exams',
      'Weekend study sessions',
      'Intensive workshops'
    ]
  },
  steady: {
    title: 'Steady Mode',
    description: 'Scientifically optimized intervals starting at 1 day, doubling with each successful review. The gold standard for long-term retention.',
    example: 'Learning a new language? Steady mode shows new words today, again tomorrow, then in 2 days, 4 days, 8 days, and so on. This exponential spacing matches your brain\'s forgetting curve perfectly, achieving 90%+ retention with minimal daily effort. Just 15 minutes daily can help you master thousands of items per year.',
    benefits: [
      'Maximum long-term retention (90%+)',
      'Minimal daily time investment',
      'Prevents forgetting curve',
      'Sustainable learning habit'
    ],
    idealFor: [
      'Language learning',
      'Professional knowledge',
      'Academic subjects',
      'Lifelong learning goals'
    ]
  },
  extended: {
    title: 'Extended Mode',
    description: 'Relaxed intervals starting at 3 days for complex material requiring deep processing. Ideal when quality matters more than speed.',
    example: 'Mastering advanced concepts like quantum physics or philosophy? Extended mode gives you 3 days to digest material before the first review, then gradually increases to weekly, biweekly, and monthly reviews. This allows time for subconscious processing and connection-making between sessions. Perfect for material that needs to "marinate" in your mind.',
    benefits: [
      'Deep conceptual understanding',
      'Time for reflection between reviews',
      'Reduces cognitive load',
      'Ideal for complex interconnected topics'
    ],
    idealFor: [
      'Advanced academic subjects',
      'Professional certifications',
      'Complex technical skills',
      'Philosophical or abstract concepts'
    ]
  }
}

export function getModeRecommendation(mode: LearningMode): ModeRecommendation {
  return LEARNING_MODE_RECOMMENDATIONS[mode] || LEARNING_MODE_RECOMMENDATIONS['steady']
}

export function getModeExample(mode: LearningMode): LearningModeExample {
  return LEARNING_MODE_EXAMPLES[mode] || LEARNING_MODE_EXAMPLES['steady']
}

export function formatChunkRecommendation(mode: LearningMode): string {
  const rec = LEARNING_MODE_RECOMMENDATIONS[mode] || LEARNING_MODE_RECOMMENDATIONS['steady']
  return `${rec.chunkSize.min}-${rec.chunkSize.max} sentences`
}

export function formatSessionRecommendation(mode: LearningMode): string {
  const rec = LEARNING_MODE_RECOMMENDATIONS[mode] || LEARNING_MODE_RECOMMENDATIONS['steady']
  return `${rec.sessionLength.chunks} (${rec.sessionLength.minutes} min)`
}

export function formatBreakRecommendation(mode: LearningMode): string {
  const rec = LEARNING_MODE_RECOMMENDATIONS[mode] || LEARNING_MODE_RECOMMENDATIONS['steady']
  return `${rec.breakTime.duration} after ${rec.breakTime.after} min`
}