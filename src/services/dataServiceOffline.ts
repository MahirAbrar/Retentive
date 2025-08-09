import { offlineService } from './offlineService'
import type { Topic, LearningItem } from '../types/database'
import { 
  validateTopicName, 
  validatePriority, 
  sanitizeInput 
} from '../utils/validation'
import { 
  ValidationError
} from '../utils/errors'
import {
  type SupabaseResult,
  type SupabaseListResult
} from '../utils/supabase'

export interface CreateTopicData {
  name: string
  user_id: string
  learning_mode: 'cram' | 'steady'
  priority: number
}

export interface UpdateTopicData {
  name?: string
  learning_mode?: 'cram' | 'steady'
  priority?: number
}

export interface CreateLearningItemData {
  topic_id: string
  user_id: string
  content: string
  learning_mode: 'cram' | 'steady'
  priority: number
}

export interface UpdateLearningItemData {
  content?: string
  learning_mode?: 'cram' | 'steady'
  priority?: number
  last_reviewed_at?: string
  next_review_at?: string
  review_count?: number
  interval_days?: number
  ease_factor?: number
}

export class DataService {
  private static instance: DataService
  
  private constructor() {
    // Set userId when auth changes
    const authData = localStorage.getItem('supabase.auth.token')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        if (parsed?.currentSession?.user?.id) {
          offlineService.setUserId(parsed.currentSession.user.id)
        }
      } catch (e) {
        console.error('Failed to parse auth data:', e)
      }
    }
  }
  
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  // Topic Operations
  async createTopic(data: CreateTopicData): Promise<SupabaseResult<Topic>> {
    try {
      // Validate input
      if (!validateTopicName(data.name)) {
        throw new ValidationError('Topic name must be between 1 and 100 characters')
      }
      
      if (!validatePriority(data.priority)) {
        throw new ValidationError('Priority must be between 1 and 10')
      }
      
      const sanitizedData = {
        ...data,
        name: sanitizeInput(data.name)
      }
      
      const topic = await offlineService.createTopic(sanitizedData)
      return { data: topic, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
  
  async updateTopic(id: string, updates: UpdateTopicData): Promise<SupabaseResult<Topic>> {
    try {
      // Validate input
      if (updates.name !== undefined && !validateTopicName(updates.name)) {
        throw new ValidationError('Topic name must be between 1 and 100 characters')
      }
      
      if (updates.priority !== undefined && !validatePriority(updates.priority)) {
        throw new ValidationError('Priority must be between 1 and 10')
      }
      
      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: sanitizeInput(updates.name) })
      }
      
      const topic = await offlineService.updateTopic(id, sanitizedUpdates)
      return { data: topic, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
  
  async deleteTopic(id: string): Promise<SupabaseResult<void>> {
    try {
      await offlineService.deleteTopic(id)
      return { data: undefined, error: null }
    } catch (error) {
      return { data: undefined, error: error as Error }
    }
  }
  
  async getTopic(id: string): Promise<SupabaseResult<Topic>> {
    try {
      const topic = await offlineService.getTopic(id)
      return { data: topic, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
  
  async getTopics(userId: string): Promise<SupabaseListResult<Topic>> {
    try {
      offlineService.setUserId(userId)
      const topics = await offlineService.getTopics()
      return { data: topics, error: null, count: topics.length }
    } catch (error) {
      return { data: [], error: error as Error, count: 0 }
    }
  }
  
  // Learning Item Operations
  async createLearningItem(data: CreateLearningItemData): Promise<SupabaseResult<LearningItem>> {
    try {
      // Validate input
      if (!data.content?.trim()) {
        throw new ValidationError('Content cannot be empty')
      }
      
      if (!validatePriority(data.priority)) {
        throw new ValidationError('Priority must be between 1 and 10')
      }
      
      const sanitizedData = {
        ...data,
        content: sanitizeInput(data.content)
      }
      
      const item = await offlineService.createLearningItem(sanitizedData)
      return { data: item, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
  
  async updateLearningItem(
    id: string, 
    updates: UpdateLearningItemData
  ): Promise<SupabaseResult<LearningItem>> {
    try {
      // Validate input
      if (updates.content !== undefined && !updates.content.trim()) {
        throw new ValidationError('Content cannot be empty')
      }
      
      if (updates.priority !== undefined && !validatePriority(updates.priority)) {
        throw new ValidationError('Priority must be between 1 and 10')
      }
      
      const sanitizedUpdates = {
        ...updates,
        ...(updates.content && { content: sanitizeInput(updates.content) })
      }
      
      const item = await offlineService.updateLearningItem(id, sanitizedUpdates)
      return { data: item, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
  
  async deleteLearningItem(id: string): Promise<SupabaseResult<void>> {
    try {
      await offlineService.deleteLearningItem(id)
      return { data: undefined, error: null }
    } catch (error) {
      return { data: undefined, error: error as Error }
    }
  }
  
  async getLearningItems(
    topicId: string
  ): Promise<SupabaseListResult<LearningItem>> {
    try {
      const items = await offlineService.getLearningItems(topicId)
      return { data: items, error: null, count: items.length }
    } catch (error) {
      return { data: [], error: error as Error, count: 0 }
    }
  }
  
  async getUserLearningItems(
    userId: string
  ): Promise<SupabaseListResult<LearningItem>> {
    try {
      offlineService.setUserId(userId)
      const items = await offlineService.getLearningItems()
      return { data: items, error: null, count: items.length }
    } catch (error) {
      return { data: [], error: error as Error, count: 0 }
    }
  }
  
  async getLearningItemsDue(
    userId: string
  ): Promise<SupabaseListResult<LearningItem>> {
    try {
      offlineService.setUserId(userId)
      const allItems = await offlineService.getLearningItems()
      const now = new Date()
      const dueItems = allItems.filter(item => {
        if (!item.next_review_at) return true
        const nextReview = new Date(item.next_review_at)
        return nextReview <= now
      })
      
      return { data: dueItems, error: null, count: dueItems.length }
    } catch (error) {
      return { data: [], error: error as Error, count: 0 }
    }
  }
}

export const dataService = DataService.getInstance()