import { logger } from '../utils/logger'
import { supabase } from './supabase'
import type { Topic, LearningItem } from '../types/database'
import { sanitizeInput } from '../utils/sanitize'

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
      // Sanitize user input to prevent XSS
      const sanitizedTopic = {
        ...topic,
        name: sanitizeInput(topic.name)
      }

      logger.log('Creating topic with data:', sanitizedTopic)
      const { data, error } = await supabase
        .from('topics')
        .insert(sanitizedTopic)
        .select()
        .single()

      if (error) {
        logger.error('Supabase error details:', error)
        throw error
      }

      return { data, error: null }
    } catch (error) {
      logger.error('Error in createTopic:', error)
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create topic'),
      }
    }
  }

  async updateTopic(topicId: string, updates: Partial<Topic>): Promise<TopicsResponse<Topic>> {
    try {
      // Sanitize name if it's being updated
      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: sanitizeInput(updates.name) })
      }

      const { data, error } = await supabase
        .from('topics')
        .update(sanitizedUpdates)
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
      // Sanitize content for all items to prevent XSS
      const sanitizedItems = items.map(item => ({
        ...item,
        content: sanitizeInput(item.content)
      }))

      const { data, error } = await supabase
        .from('learning_items')
        .insert(sanitizedItems)
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