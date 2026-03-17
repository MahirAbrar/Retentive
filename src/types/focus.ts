// Focus timer and break activity types

export interface FocusSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  goal_minutes: number
  total_work_minutes: number
  total_break_minutes: number
  adherence_percentage: number | null
  productivity_percentage: number | null
  is_active: boolean
  is_incomplete?: boolean
  points_earned?: number
  points_penalty?: number
  created_at: string
  updated_at: string
  last_updated_at?: string | null
  current_segment_type?: 'work' | 'break' | null
  current_segment_id?: string | null
  was_adjusted?: boolean
  adjustment_reason?: string | null
  adjusted_at?: string | null
}

export interface FocusSegment {
  id: string
  session_id: string
  user_id: string
  segment_type: 'work' | 'break'
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  created_at: string
}

export interface UserFocusPreferences {
  id: string
  user_id: string
  default_goal_minutes: number
  enable_sound_alerts: boolean
  enable_desktop_notifications: boolean
  enable_auto_break_reminders: boolean
  created_at: string
  updated_at: string
}

export interface SessionStats {
  totalSessions: number
  totalWorkMinutes: number
  totalBreakMinutes: number
  averageAdherence: number
  bestAdherence: number
  totalFocusTime: number
}

export interface PaginatedSessionsResult {
  sessions: FocusSession[]
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}

export type SessionTimeFilter = 'week' | '7days' | 'month' | 'all'

export interface BreakActivity {
  id: string
  name: string
  emoji: string
  durationMinutes: number
  description: string
}

export interface BreakCategory {
  id: 'cognitive-overload' | 'attention-drift' | 'urge-management'
  title: string
  emoji: string
  description: string
  activities: BreakActivity[]
}
