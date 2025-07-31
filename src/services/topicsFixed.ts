import { supabase } from './supabase'
import type { Topic, LearningItem } from '../types/database'

export interface TopicsResponse<T> {
  data: T | null
  error: Error | null
}

class TopicsService {
  private static instance: TopicsService
  
  private constructor() {}
  
  public static getInstance(): TopicsService {
    if (!TopicsService.instance) {
      TopicsService.instance = new TopicsService()
    }
    return TopicsService.instance
  }

  async getTopics(userId: string): Promise<TopicsResponse<Topic[]>> {
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

  async getTopic(topicId: string): Promise<TopicsResponse<Topic>> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch topic'),
      }
    }
  }

  async createTopic(topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<TopicsResponse<Topic>> {
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

  async updateTopic(topicId: string, updates: Partial<Topic>): Promise<TopicsResponse<Topic>> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', topicId)
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

  async deleteTopic(topicId: string): Promise<TopicsResponse<null>> {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId)

      if (error) throw error

      return { data: null, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to delete topic'),
      }
    }
  }

  async createLearningItems(items: Omit<LearningItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<TopicsResponse<LearningItem[]>> {
    try {
      const { data, error } = await supabase
        .from('learning_items')
        .insert(items)
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

  async getTopicItems(topicId: string): Promise<TopicsResponse<LearningItem[]>> {
    try {
      const { data, error } = await supabase
        .from('learning_items')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch learning items'),
      }
    }
  }
}

export const topicsService = TopicsService.getInstance()