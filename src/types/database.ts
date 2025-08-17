export type LearningMode = 'ultracram' | 'cram' | 'extended' | 'steady'
export type ReviewDifficulty = 'again' | 'hard' | 'good' | 'easy'
export type Priority = 1 | 2 | 3 | 4 | 5
export type MasteryStatus = 'active' | 'mastered' | 'archived' | 'maintenance' | 'repeat'
export type ArchiveStatus = 'active' | 'archived'
export type SubscriptionType = 'monthly' | 'yearly' | null
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'inactive'

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  user_metadata?: {
    display_name?: string
    [key: string]: any
  }
  // Subscription fields
  is_paid?: boolean
  is_trial?: boolean
  trial_started_at?: string | null
  trial_ended_at?: string | null
  subscription_type?: SubscriptionType
  subscription_started_at?: string | null
  subscription_expires_at?: string | null
  subscription_status?: SubscriptionStatus
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  has_used_trial?: boolean
  trial_days_remaining?: number
}

export interface Topic {
  id: string
  user_id: string
  name: string
  learning_mode: LearningMode
  priority: number
  archive_status?: ArchiveStatus
  archive_date?: string | null
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
  mastery_status?: MasteryStatus
  mastery_date?: string | null
  archive_date?: string | null
  maintenance_interval_days?: number | null
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

export interface UserGamificationStats {
  id: string
  user_id: string
  total_points: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_review_date: string | null
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  points_awarded: number
  created_at: string
}

export interface DailyStats {
  id: string
  user_id: string
  date: string
  points_earned: number
  reviews_completed: number
  perfect_timing_count: number
  items_mastered: number
  created_at: string
}