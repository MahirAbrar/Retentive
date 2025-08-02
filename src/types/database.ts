export type LearningMode = 'cram' | 'steady'
export type ReviewDifficulty = 'again' | 'hard' | 'good' | 'easy'
export type Priority = 1 | 2 | 3 | 4 | 5

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Topic {
  id: string
  user_id: string
  name: string
  learning_mode: LearningMode
  priority: number
  created_at: string
  updated_at: string
}

export interface LearningItem {
  id: string
  topic_id: string
  user_id: string
  content: string
  priority: number
  learning_mode: LearningMode
  review_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  ease_factor: number
  interval_days: number
  created_at: string
  updated_at: string
}

export interface ReviewSession {
  id: string
  user_id: string
  learning_item_id: string
  difficulty: ReviewDifficulty
  reviewed_at: string
  next_review_at: string
  interval_days: number
}

export interface UserSettings {
  id: string
  user_id: string
  default_learning_mode: LearningMode
  daily_item_limit: number
  notification_enabled: boolean
  preferred_study_time: string | null
  created_at: string
  updated_at: string
}