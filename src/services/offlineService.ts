import { supabase } from './supabase'
import type { Topic, LearningItem, ReviewSession } from '../types/database'

export class OfflineService {
  private userId: string | null = null

  setUserId(userId: string) {
    this.userId = userId
  }

  async checkOnlineStatus(): Promise<boolean> {
    try {
      const { error } = await supabase.from('topics').select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }

  // Topics
  async getTopics(): Promise<Topic[]> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getTopic(id: string): Promise<Topic | null> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single()

    if (error) throw error
    return data
  }

  async createTopic(topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
    if (!this.userId) throw new Error('User not authenticated')

    const topicData = { ...topic, user_id: this.userId }

    const { data, error } = await supabase
      .from('topics')
      .insert(topicData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('topics')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTopic(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw error
  }

  // Learning Items
  async getLearningItems(topicId?: string): Promise<LearningItem[]> {
    if (!this.userId) throw new Error('User not authenticated')

    let query = supabase
      .from('learning_items')
      .select('*, topics!inner(name, priority)')
      .eq('user_id', this.userId)
      .order('next_review_at', { ascending: true })
      .order('priority', { ascending: false })

    if (topicId) {
      query = query.eq('topic_id', topicId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async getLearningItem(id: string): Promise<LearningItem | null> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('learning_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single()

    if (error) throw error
    return data
  }

  async createLearningItem(item: Omit<LearningItem, 'id' | 'created_at' | 'updated_at' | 'review_count' | 'last_reviewed_at' | 'next_review_at' | 'ease_factor' | 'interval_days'>): Promise<LearningItem> {
    if (!this.userId) throw new Error('User not authenticated')

    const itemData = { ...item, user_id: this.userId }

    const { data, error } = await supabase
      .from('learning_items')
      .insert(itemData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateLearningItem(id: string, updates: Partial<LearningItem>): Promise<LearningItem> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('learning_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteLearningItem(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('learning_items')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw error
  }

  // Review Sessions
  async createReviewSession(session: Omit<ReviewSession, 'id' | 'created_at'>): Promise<ReviewSession> {
    if (!this.userId) throw new Error('User not authenticated')

    const sessionData = { ...session, user_id: this.userId }

    const { data, error } = await supabase
      .from('review_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getRecentReviews(limit: number = 100): Promise<ReviewSession[]> {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', this.userId)
      .order('reviewed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Gamification
  async getGamificationStats() {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', this.userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async updateGamificationStats(updates: any) {
    if (!this.userId) throw new Error('User not authenticated')

    const { data: existing } = await supabase
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', this.userId)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('user_gamification_stats')
        .update(updates)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('user_gamification_stats')
        .insert({ ...updates, user_id: this.userId })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  async getAchievements() {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', this.userId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async unlockAchievement(achievementId: string, pointsAwarded: number) {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('achievements')
      .insert({
        user_id: this.userId,
        achievement_id: achievementId,
        points_awarded: pointsAwarded
      })
      .select()

    if (error && error.code !== '23505') throw error // Ignore duplicate key errors
    return !!data
  }

  // Daily Stats
  async getDailyStats(date: string) {
    if (!this.userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async updateDailyStats(date: string, updates: any) {
    if (!this.userId) throw new Error('User not authenticated')

    const { data: existing } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', date)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('daily_stats')
        .update({
          points_earned: (existing.points_earned || 0) + (updates.points_earned || 0),
          reviews_completed: (existing.reviews_completed || 0) + (updates.reviews_completed || 0),
          perfect_timing_count: (existing.perfect_timing_count || 0) + (updates.perfect_timing_count || 0),
          items_mastered: (existing.items_mastered || 0) + (updates.items_mastered || 0)
        })
        .eq('user_id', this.userId)
        .eq('date', date)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('daily_stats')
        .insert({
          user_id: this.userId,
          date,
          ...updates
        })

      if (error) throw error
    }
  }

  // Sync - no-op for PWA (all data is already in Supabase)
  async syncAll() {
    return { success: true, synced: 0, failed: 0, errors: [] }
  }

  async getSyncStatus() {
    return {
      pendingOperations: 0,
      offlineStats: { pendingSync: 0, totalTopics: 0, totalItems: 0 },
      lastSync: new Date().toISOString()
    }
  }

  onSyncStatusChange(_callback: (status: any) => void) {
    // No-op for PWA - data is always synced via Supabase
  }

  async getOfflineStats() {
    return { pendingSync: 0, totalTopics: 0, totalItems: 0 }
  }
}

export const offlineService = new OfflineService()
