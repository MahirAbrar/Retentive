import { supabase } from './supabase'
import type { Topic, LearningItem, ReviewSession, UserSettings } from '@/types/database'
import { DEFAULT_USER_SETTINGS, EASE_FACTOR } from '@/constants/learning'

export interface DataResponse<T> {
  data: T | null
  error: Error | null
}

export interface DataListResponse<T> {
  data: T[] | null
  error: Error | null
}

export class DataService {
  private static instance: DataService
  
  private constructor() {}
  
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  // Topics CRUD
  async createTopic(topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<DataResponse<Topic>> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .insert(topic)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create topic'),
      }
    }
  }

  async getTopics(userId: string): Promise<DataListResponse<Topic>> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch topics'),
      }
    }
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<DataResponse<Topic>> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update topic'),
      }
    }
  }

  async deleteTopic(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to delete topic'),
      }
    }
  }

  // Learning Items CRUD
  async createLearningItem(
    item: Omit<LearningItem, 'id' | 'created_at' | 'updated_at' | 'review_count' | 'ease_factor' | 'interval_days'>
  ): Promise<DataResponse<LearningItem>> {
    try {
      const newItem = {
        ...item,
        review_count: 0,
        ease_factor: EASE_FACTOR.DEFAULT,
        interval_days: 0,
      }

      const { data, error } = await supabase
        .from('learning_items')
        .insert(newItem)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create learning item'),
      }
    }
  }

  async createLearningItems(
    items: Array<Omit<LearningItem, 'id' | 'created_at' | 'updated_at' | 'review_count' | 'ease_factor' | 'interval_days'>>
  ): Promise<DataListResponse<LearningItem>> {
    try {
      const newItems = items.map(item => ({
        ...item,
        review_count: 0,
        ease_factor: EASE_FACTOR.DEFAULT,
        interval_days: 0,
      }))

      const { data, error } = await supabase
        .from('learning_items')
        .insert(newItems)
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create learning items'),
      }
    }
  }

  async getLearningItems(userId: string, topicId?: string): Promise<DataListResponse<LearningItem>> {
    try {
      let query = supabase
        .from('learning_items')
        .select('*')
        .eq('user_id', userId)

      if (topicId) {
        query = query.eq('topic_id', topicId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch learning items'),
      }
    }
  }

  async getDueItems(userId: string): Promise<DataListResponse<LearningItem>> {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('learning_items')
        .select('*')
        .eq('user_id', userId)
        .or(`next_review_at.is.null,next_review_at.lte.${now}`)
        .order('priority', { ascending: false })
        .order('next_review_at', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch due items'),
      }
    }
  }

  async updateLearningItem(id: string, updates: Partial<LearningItem>): Promise<DataResponse<LearningItem>> {
    try {
      const { data, error } = await supabase
        .from('learning_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update learning item'),
      }
    }
  }

  async deleteLearningItem(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('learning_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to delete learning item'),
      }
    }
  }

  // Review Sessions
  async createReviewSession(session: Omit<ReviewSession, 'id'>): Promise<DataResponse<ReviewSession>> {
    try {
      const { data, error } = await supabase
        .from('review_sessions')
        .insert(session)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create review session'),
      }
    }
  }

  // User Settings
  async getUserSettings(userId: string): Promise<DataResponse<UserSettings>> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No settings found, create default
        const defaultSettings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> = {
          user_id: userId,
          ...DEFAULT_USER_SETTINGS,
        }
        return this.createUserSettings(defaultSettings)
      }

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch user settings'),
      }
    }
  }

  async createUserSettings(
    settings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DataResponse<UserSettings>> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert(settings)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create user settings'),
      }
    }
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<DataResponse<UserSettings>> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update user settings'),
      }
    }
  }
}

export const dataService = DataService.getInstance()