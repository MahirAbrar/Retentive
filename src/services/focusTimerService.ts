import { supabase } from './supabase'
import { logger } from '../utils/logger'

// ================================================
// TYPES & INTERFACES
// ================================================

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

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Calculate recommended break time based on work duration (Pomodoro ratio)
 * Formula: (work_minutes / 25) * 5
 */
export function calculateRecommendedBreak(workMinutes: number): number {
  const breakMinutes = Math.round((workMinutes / 25) * 5)
  // Clamp between 5 and 20 minutes
  return Math.max(5, Math.min(20, breakMinutes))
}

/**
 * Calculate adherence percentage
 * Formula: (work_time / (work_time + break_time)) * 100
 */
export function calculateAdherence(workMinutes: number, breakMinutes: number): number {
  if (workMinutes === 0 && breakMinutes === 0) return 100
  const total = workMinutes + breakMinutes
  return Math.round((workMinutes / total) * 100 * 100) / 100 // Round to 2 decimals
}

/**
 * Get adherence color based on percentage
 */
export function getAdherenceColor(adherence: number): {
  color: string
  status: string
  emoji: string
} {
  if (adherence >= 95) {
    return { color: '#2ecc71', status: 'Excellent', emoji: '🟢' }
  } else if (adherence >= 80) {
    return { color: '#90ee90', status: 'Good', emoji: '🟢' }
  } else if (adherence >= 70) {
    return { color: '#f1c40f', status: 'Moderate', emoji: '🟡' }
  } else if (adherence >= 60) {
    return { color: '#e67e22', status: 'Low', emoji: '🟠' }
  } else {
    return { color: '#e74c3c', status: 'Very Low', emoji: '🔴' }
  }
}

// ================================================
// FOCUS TIMER SERVICE CLASS
// ================================================

class FocusTimerService {
  private static instance: FocusTimerService

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): FocusTimerService {
    if (!FocusTimerService.instance) {
      FocusTimerService.instance = new FocusTimerService()
    }
    return FocusTimerService.instance
  }

  // ================================================
  // SESSION MANAGEMENT
  // ================================================

  /**
   * Create a new focus session
   */
  async createSession(userId: string, goalMinutes: number): Promise<FocusSession> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: userId,
        goal_minutes: goalMinutes,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get active session for user with calculated elapsed time
   */
  async getActiveSession(userId: string): Promise<FocusSession | null> {
    const { data: session, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // Note: Elapsed time calculation is done in useFocusTimer.loadActiveSession
    // by iterating through segments, so we don't need an RPC call here

    return session
  }

  /**
   * Get active segment for a session
   */
  async getActiveSegment(sessionId: string, userId: string): Promise<FocusSegment | null> {
    const { data, error } = await supabase
      .from('focus_segments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Sync session state to database (for periodic updates)
   */
  async syncSession(
    sessionId: string,
    userId: string,
    updates: {
      totalWorkMinutes: number
      totalBreakMinutes: number
      adherencePercentage: number
      currentSegmentType?: 'work' | 'break' | null
      currentSegmentId?: string | null
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .update({
          total_work_minutes: updates.totalWorkMinutes,
          total_break_minutes: updates.totalBreakMinutes,
          adherence_percentage: updates.adherencePercentage,
          current_segment_type: updates.currentSegmentType,
          current_segment_id: updates.currentSegmentId,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        // Check if it's a network error
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          // Re-throw with a cleaner message
          throw new Error(`NetworkError: ${error.message}`)
        }
        throw error
      }
    } catch (error: any) {
      // Don't throw on network errors, just log them
      if (error?.message?.includes('NetworkError') ||
          error?.message?.includes('ERR_INTERNET_DISCONNECTED') ||
          error?.message?.includes('Failed to fetch')) {
        logger.debug('Focus timer sync failed due to network issues')
        // Silently fail for network errors to prevent spam
        return
      }
      // Re-throw other errors
      throw error
    }
  }

  /**
   * End segment with immediate effect (for cleanup operations)
   * Uses synchronous-like approach for beforeunload scenarios
   */
  async quickEndSegment(
    segmentId: string,
    userId: string,
    durationMinutes: number
  ): Promise<void> {
    try {
      // Use a simpler update that's more likely to complete
      await supabase
        .from('focus_segments')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: Math.min(durationMinutes, 120), // Cap at 2 hours
        })
        .eq('id', segmentId)
        .eq('user_id', userId)
    } catch (error) {
      logger.error('Error in quickEndSegment:', error)
    }
  }

  /**
   * Update session metrics in real-time
   */
  async updateSession(
    sessionId: string,
    userId: string,
    updates: Partial<FocusSession>
  ): Promise<FocusSession> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * End a focus session
   */
  async endSession(
    sessionId: string,
    userId: string,
    finalStats: {
      totalWorkMinutes: number
      totalBreakMinutes: number
      adherencePercentage: number
      isIncomplete?: boolean
      pointsEarned?: number
      pointsPenalty?: number
    }
  ): Promise<FocusSession> {
    // Only include columns that exist in the database
    const updateData: Record<string, unknown> = {
      ended_at: new Date().toISOString(),
      is_active: false,
      total_work_minutes: finalStats.totalWorkMinutes,
      total_break_minutes: finalStats.totalBreakMinutes,
      adherence_percentage: finalStats.adherencePercentage,
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get user's session history
   */
  async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<FocusSession[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false) // Only completed sessions
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get sessions for a date range
   */
  async getSessionsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<FocusSession[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get paginated sessions with cursor-based pagination
   * Supports time filtering and bidirectional navigation
   */
  async getPaginatedSessions(
    userId: string,
    options: {
      limit?: number
      cursor?: string
      direction?: 'forward' | 'backward'
      timeFilter?: SessionTimeFilter
    } = {}
  ): Promise<PaginatedSessionsResult> {
    const {
      limit = 10,
      cursor,
      direction = 'forward',
      timeFilter = 'all'
    } = options

    // Calculate time filter boundary
    const now = new Date()
    let startDate: Date | null = null

    if (timeFilter === 'week') {
      // Start of current week (Sunday)
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay())
      startDate.setHours(0, 0, 0, 0)
    } else if (timeFilter === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Build query
    let query = supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false)

    // Apply time filter
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    // Apply cursor for pagination
    if (cursor) {
      if (direction === 'forward') {
        // Going to older sessions (next page)
        query = query.lt('created_at', cursor)
      } else {
        // Going to newer sessions (previous page)
        query = query.gt('created_at', cursor)
      }
    }

    // Order and limit
    // For backward direction, we need ascending order to get the right records,
    // then reverse the results to maintain newest-first display
    query = query
      .order('created_at', { ascending: direction === 'backward' })
      .limit(limit + 1) // Fetch one extra to check if there are more

    const { data, error } = await query

    if (error) throw error

    let sessions = data || []

    // Determine if there are more pages
    const hasMore = sessions.length > limit

    // Trim the extra record used for checking
    if (hasMore) {
      sessions = sessions.slice(0, limit)
    }

    // For backward direction, reverse to maintain newest-first order
    if (direction === 'backward') {
      sessions = sessions.reverse()
    }

    // Determine pagination state
    const hasNextPage = direction === 'forward' ? hasMore : cursor !== undefined
    const hasPreviousPage = direction === 'forward' ? cursor !== undefined : hasMore

    // Get cursors for navigation
    const firstSession = sessions[0]
    const lastSession = sessions[sessions.length - 1]

    return {
      sessions,
      hasNextPage,
      hasPreviousPage,
      nextCursor: lastSession?.created_at || null,
      previousCursor: firstSession?.created_at || null,
    }
  }

  // ================================================
  // SEGMENT MANAGEMENT
  // ================================================

  /**
   * Create a new segment (work or break)
   */
  async createSegment(
    sessionId: string,
    userId: string,
    segmentType: 'work' | 'break'
  ): Promise<FocusSegment> {
    const { data, error } = await supabase
      .from('focus_segments')
      .insert({
        session_id: sessionId,
        user_id: userId,
        segment_type: segmentType,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * End the current segment
   */
  async endSegment(
    segmentId: string,
    userId: string,
    durationMinutes: number
  ): Promise<FocusSegment> {
    const { data, error } = await supabase
      .from('focus_segments')
      .update({
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', segmentId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get segments for a session
   */
  async getSessionSegments(
    sessionId: string,
    userId: string
  ): Promise<FocusSegment[]> {
    const { data, error } = await supabase
      .from('focus_segments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('started_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // ================================================
  // USER PREFERENCES
  // ================================================

  /**
   * Get user's focus preferences
   */
  async getPreferences(userId: string): Promise<UserFocusPreferences | null> {
    const { data, error } = await supabase
      .from('user_focus_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Create or update user preferences
   */
  async upsertPreferences(
    userId: string,
    preferences: Partial<UserFocusPreferences>
  ): Promise<UserFocusPreferences> {
    const { data, error } = await supabase
      .from('user_focus_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ================================================
  // STATISTICS & ANALYTICS
  // ================================================

  /**
   * Get aggregated focus statistics for a user
   */
  async getUserStats(userId: string, days: number = 30): Promise<SessionStats> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const sessions = await this.getSessionsByDateRange(
      userId,
      startDate.toISOString(),
      new Date().toISOString()
    )

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        averageAdherence: 0,
        bestAdherence: 0,
        totalFocusTime: 0,
      }
    }

    const totalWorkMinutes = sessions.reduce(
      (sum, s) => sum + s.total_work_minutes,
      0
    )
    const totalBreakMinutes = sessions.reduce(
      (sum, s) => sum + s.total_break_minutes,
      0
    )
    const adherences = sessions
      .filter((s) => s.adherence_percentage !== null)
      .map((s) => s.adherence_percentage as number)
    const averageAdherence =
      adherences.length > 0
        ? adherences.reduce((sum, a) => sum + a, 0) / adherences.length
        : 0
    const bestAdherence = adherences.length > 0 ? Math.max(...adherences) : 0

    return {
      totalSessions: sessions.length,
      totalWorkMinutes,
      totalBreakMinutes,
      averageAdherence: Math.round(averageAdherence * 100) / 100,
      bestAdherence: Math.round(bestAdherence * 100) / 100,
      totalFocusTime: totalWorkMinutes + totalBreakMinutes,
    }
  }

  // ================================================
  // SESSION EDITING
  // ================================================

  /**
   * Update session duration after completion
   * Allows users to adjust work/break times for sessions they forgot to stop
   */
  async updateSessionDuration(
    sessionId: string,
    userId: string,
    updates: {
      totalWorkMinutes: number
      totalBreakMinutes: number
      adjustmentReason?: string
    }
  ): Promise<FocusSession> {
    // Validation: Get original session first
    const { data: originalSession, error: fetchError } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError
    if (!originalSession) throw new Error('Session not found')

    // Validate: Can only edit completed sessions
    if (originalSession.is_active) {
      throw new Error('Cannot edit active sessions. Please end the session first.')
    }

    // Validate: Work minutes must be positive
    if (updates.totalWorkMinutes <= 0) {
      throw new Error('Work time must be greater than 0 minutes')
    }

    // Validate: Break minutes must be non-negative
    if (updates.totalBreakMinutes < 0) {
      throw new Error('Break time cannot be negative')
    }

    // Validate: Can only reduce time, not increase (prevent cheating)
    if (updates.totalWorkMinutes > originalSession.total_work_minutes) {
      throw new Error('Cannot increase work time beyond original duration')
    }

    if (updates.totalBreakMinutes > originalSession.total_break_minutes) {
      throw new Error('Cannot increase break time beyond original duration')
    }

    // Recalculate adherence with new values
    const newAdherence = calculateAdherence(
      updates.totalWorkMinutes,
      updates.totalBreakMinutes
    )

    // Update session
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        total_work_minutes: updates.totalWorkMinutes,
        total_break_minutes: updates.totalBreakMinutes,
        adherence_percentage: newAdherence,
        productivity_percentage: newAdherence,
        was_adjusted: true,
        adjustment_reason: updates.adjustmentReason || 'No reason provided',
        adjusted_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    logger.info('Session duration updated:', {
      sessionId,
      originalWork: originalSession.total_work_minutes,
      newWork: updates.totalWorkMinutes,
      originalBreak: originalSession.total_break_minutes,
      newBreak: updates.totalBreakMinutes,
      reason: updates.adjustmentReason
    })

    return data
  }
}

export const focusTimerService = FocusTimerService.getInstance()