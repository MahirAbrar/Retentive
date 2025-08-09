import { supabase } from './supabase'
import type { Topic, LearningItem, ReviewSession } from '../types/database'

export class OfflineService {
  private isElectron = window.electronAPI !== undefined
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
    
    if (this.isElectron) {
      // Always use local database in Electron
      return await window.electronAPI.database.topics.getAll(this.userId)
    } else {
      // Fallback to Supabase for web
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  }

  async getTopic(id: string): Promise<Topic | null> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.topics.get(id, this.userId)
    } else {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single()
      
      if (error) throw error
      return data
    }
  }

  async createTopic(topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
    if (!this.userId) throw new Error('User not authenticated')
    
    const topicData = { ...topic, user_id: this.userId }
    
    if (this.isElectron) {
      return await window.electronAPI.database.topics.create(topicData)
    } else {
      const { data, error } = await supabase
        .from('topics')
        .insert(topicData)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.topics.update(id, updates, this.userId)
    } else {
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
  }

  async deleteTopic(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      await window.electronAPI.database.topics.delete(id, this.userId)
    } else {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId)
      
      if (error) throw error
    }
  }

  // Learning Items
  async getLearningItems(topicId?: string): Promise<LearningItem[]> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.items.getAll(this.userId, topicId)
    } else {
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
  }

  async getLearningItem(id: string): Promise<LearningItem | null> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.items.get(id, this.userId)
    } else {
      const { data, error } = await supabase
        .from('learning_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single()
      
      if (error) throw error
      return data
    }
  }

  async createLearningItem(item: Omit<LearningItem, 'id' | 'created_at' | 'updated_at' | 'review_count' | 'last_reviewed_at' | 'next_review_at' | 'ease_factor' | 'interval_days'>): Promise<LearningItem> {
    if (!this.userId) throw new Error('User not authenticated')
    
    const itemData = { ...item, user_id: this.userId }
    
    if (this.isElectron) {
      return await window.electronAPI.database.items.create(itemData)
    } else {
      const { data, error } = await supabase
        .from('learning_items')
        .insert(itemData)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }

  async updateLearningItem(id: string, updates: Partial<LearningItem>): Promise<LearningItem> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.items.update(id, updates, this.userId)
    } else {
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
  }

  async deleteLearningItem(id: string): Promise<void> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      await window.electronAPI.database.items.delete(id, this.userId)
    } else {
      const { error } = await supabase
        .from('learning_items')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId)
      
      if (error) throw error
    }
  }

  // Review Sessions
  async createReviewSession(session: Omit<ReviewSession, 'id' | 'created_at'>): Promise<ReviewSession> {
    if (!this.userId) throw new Error('User not authenticated')
    
    const sessionData = { ...session, user_id: this.userId }
    
    if (this.isElectron) {
      return await window.electronAPI.database.reviews.create(sessionData)
    } else {
      const { data, error } = await supabase
        .from('review_sessions')
        .insert(sessionData)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }

  async getRecentReviews(limit: number = 100): Promise<ReviewSession[]> {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.reviews.getRecent(this.userId, limit)
    } else {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('user_id', this.userId)
        .order('reviewed_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    }
  }

  // Gamification
  async getGamificationStats() {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.gamification.getStats(this.userId)
    } else {
      const { data, error } = await supabase
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', this.userId)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  }

  async updateGamificationStats(updates: any) {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.gamification.updateStats(this.userId, updates)
    } else {
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
  }

  async getAchievements() {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.gamification.getAchievements(this.userId)
    } else {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', this.userId)
        .order('unlocked_at', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  }

  async unlockAchievement(achievementId: string, pointsAwarded: number) {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.gamification.unlockAchievement(this.userId, achievementId, pointsAwarded)
    } else {
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
  }

  // Daily Stats
  async getDailyStats(date: string) {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.daily.getStats(this.userId, date)
    } else {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', this.userId)
        .eq('date', date)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  }

  async updateDailyStats(date: string, updates: any) {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      await window.electronAPI.database.daily.updateStats(this.userId, date, updates)
    } else {
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
  }

  // Sync
  async syncAll() {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.sync.all(this.userId)
    }
    
    // No-op for web
    return { success: true, synced: 0, failed: 0, errors: [] }
  }

  async getSyncStatus() {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.sync.status(this.userId)
    }
    
    // Return online status for web
    return {
      pendingOperations: 0,
      offlineStats: { pendingSync: 0, totalTopics: 0, totalItems: 0 },
      lastSync: new Date().toISOString()
    }
  }

  onSyncStatusChange(callback: (status: any) => void) {
    if (this.isElectron) {
      window.electronAPI.database.sync.onStatusChange(callback)
    }
  }

  async getOfflineStats() {
    if (!this.userId) throw new Error('User not authenticated')
    
    if (this.isElectron) {
      return await window.electronAPI.database.offline.stats(this.userId)
    }
    
    // Return empty stats for web
    return { pendingSync: 0, totalTopics: 0, totalItems: 0 }
  }
}

export const offlineService = new OfflineService()