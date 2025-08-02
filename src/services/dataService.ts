import { supabase } from './supabase'
import { cacheService } from './cacheService'
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
  handleSupabaseResponse,
  handleSupabaseListResponse,
  withRetry,
  createOptimisticUpdate,
  createOptimisticDelete,
  createOptimisticUpdateItem,
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
  private readonly CACHE_KEYS = {
    topics: (userId: string) => `topics:${userId}`,
    topic: (id: string) => `topic:${id}`,
    topicItems: (topicId: string) => `topic_items:${topicId}`,
    userItems: (userId: string) => `user_items:${userId}`,
  }
  
  private constructor() {}
  
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  // Topic Operations

  async createTopic(data: CreateTopicData): Promise<SupabaseResult<Topic>> {
    // Validate input
    if (!validateTopicName(data.name)) {
      throw new ValidationError('Topic name must be between 1 and 100 characters')
    }
    if (!validatePriority(data.priority)) {
      throw new ValidationError('Priority must be between 1 and 10')
    }

    const sanitizedData = {
      ...data,
      name: sanitizeInput(data.name),
    }

    return withRetry(async () => {
      const response = await supabase
        .from('topics')
        .insert(sanitizedData)
        .select()
        .single()

      const result = await handleSupabaseResponse<Topic>(response)
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topics(data.user_id))
      }

      return result
    })
  }

  async getTopics(userId: string): Promise<SupabaseListResult<Topic>> {
    const cacheKey = this.CACHE_KEYS.topics(userId)
    
    // Check cache first
    const cached = cacheService.get<Topic[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    return withRetry(async () => {
      const response = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const result = await handleSupabaseListResponse<Topic>(response)
      
      if (result.data && !result.error) {
        // Cache for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
      }

      return result
    })
  }

  async getTopic(topicId: string): Promise<SupabaseResult<Topic>> {
    const cacheKey = this.CACHE_KEYS.topic(topicId)
    
    // Check cache first
    const cached = cacheService.get<Topic>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    return withRetry(async () => {
      const response = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single()

      const result = await handleSupabaseResponse<Topic>(response)
      
      if (result.data && !result.error) {
        // Cache for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
      }

      return result
    })
  }

  async updateTopic(topicId: string, data: UpdateTopicData): Promise<SupabaseResult<Topic>> {
    // Validate input
    if (data.name !== undefined && !validateTopicName(data.name)) {
      throw new ValidationError('Topic name must be between 1 and 100 characters')
    }
    if (data.priority !== undefined && !validatePriority(data.priority)) {
      throw new ValidationError('Priority must be between 1 and 10')
    }

    const sanitizedData = {
      ...data,
      name: data.name ? sanitizeInput(data.name) : undefined,
      updated_at: new Date().toISOString(),
    }

    return withRetry(async () => {
      const response = await supabase
        .from('topics')
        .update(sanitizedData)
        .eq('id', topicId)
        .select()
        .single()

      const result = await handleSupabaseResponse<Topic>(response)
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topic(topicId))
        cacheService.delete(this.CACHE_KEYS.topics(result.data.user_id))
      }

      return result
    })
  }

  async deleteTopic(topicId: string): Promise<SupabaseResult<void>> {
    // Get topic first to invalidate user's cache
    const { data: topic } = await this.getTopic(topicId)

    return withRetry(async () => {
      const response = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId)

      if (response.error) {
        return { data: null, error: new Error(response.error.message) }
      }

      // Invalidate cache
      cacheService.delete(this.CACHE_KEYS.topic(topicId))
      cacheService.delete(this.CACHE_KEYS.topicItems(topicId))
      if (topic) {
        cacheService.delete(this.CACHE_KEYS.topics(topic.user_id))
      }

      return { data: undefined, error: null }
    })
  }

  // Learning Item Operations

  async createLearningItem(data: CreateLearningItemData): Promise<SupabaseResult<LearningItem>> {
    // Validate input
    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError('Content is required')
    }
    if (!validatePriority(data.priority)) {
      throw new ValidationError('Priority must be between 1 and 10')
    }

    const sanitizedData = {
      ...data,
      content: sanitizeInput(data.content),
      ease_factor: 2.5,
      review_count: 0,
      interval_days: 0,
    }

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .insert(sanitizedData)
        .select()
        .single()

      const result = await handleSupabaseResponse<LearningItem>(response)
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topicItems(data.topic_id))
        cacheService.delete(this.CACHE_KEYS.userItems(data.user_id))
      }

      return result
    })
  }

  async createLearningItems(items: CreateLearningItemData[]): Promise<SupabaseListResult<LearningItem>> {
    // Validate all items
    items.forEach((item, index) => {
      if (!item.content || item.content.trim().length === 0) {
        throw new ValidationError(`Item ${index + 1}: Content is required`)
      }
      if (!validatePriority(item.priority)) {
        throw new ValidationError(`Item ${index + 1}: Priority must be between 1 and 10`)
      }
    })

    const sanitizedItems = items.map(item => ({
      ...item,
      content: sanitizeInput(item.content),
      ease_factor: 2.5,
      review_count: 0,
      interval_days: 0,
    }))

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .insert(sanitizedItems)
        .select()

      const result = await handleSupabaseListResponse<LearningItem>(response)
      
      if (result.data && result.data.length > 0) {
        // Invalidate cache for all affected topics
        const uniqueTopicIds = new Set(items.map(item => item.topic_id))
        const uniqueUserIds = new Set(items.map(item => item.user_id))
        
        uniqueTopicIds.forEach(topicId => {
          cacheService.delete(this.CACHE_KEYS.topicItems(topicId))
        })
        
        uniqueUserIds.forEach(userId => {
          cacheService.delete(this.CACHE_KEYS.userItems(userId))
        })
      }

      return result
    })
  }

  async getTopicItems(topicId: string): Promise<SupabaseListResult<LearningItem>> {
    const cacheKey = this.CACHE_KEYS.topicItems(topicId)
    
    // Check cache first
    const cached = cacheService.get<LearningItem[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true })

      const result = await handleSupabaseListResponse<LearningItem>(response)
      
      if (result.data && !result.error) {
        // Cache for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
      }

      return result
    })
  }

  async getUserItems(userId: string): Promise<SupabaseListResult<LearningItem>> {
    const cacheKey = this.CACHE_KEYS.userItems(userId)
    
    // Check cache first
    const cached = cacheService.get<LearningItem[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .select('*')
        .eq('user_id', userId)
        .order('next_review_at', { ascending: true, nullsFirst: true })

      const result = await handleSupabaseListResponse<LearningItem>(response)
      
      if (result.data && !result.error) {
        // Cache for 2 minutes (shorter since review times change frequently)
        cacheService.set(cacheKey, result.data, 2 * 60 * 1000)
      }

      return result
    })
  }

  async updateLearningItem(
    itemId: string, 
    data: UpdateLearningItemData
  ): Promise<SupabaseResult<LearningItem>> {
    // Validate input
    if (data.content !== undefined && (!data.content || data.content.trim().length === 0)) {
      throw new ValidationError('Content cannot be empty')
    }
    if (data.priority !== undefined && !validatePriority(data.priority)) {
      throw new ValidationError('Priority must be between 1 and 10')
    }

    const sanitizedData = {
      ...data,
      content: data.content ? sanitizeInput(data.content) : undefined,
      updated_at: new Date().toISOString(),
    }

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .update(sanitizedData)
        .eq('id', itemId)
        .select()
        .single()

      const result = await handleSupabaseResponse<LearningItem>(response)
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topicItems(result.data.topic_id))
        cacheService.delete(this.CACHE_KEYS.userItems(result.data.user_id))
      }

      return result
    })
  }

  async deleteLearningItem(itemId: string): Promise<SupabaseResult<void>> {
    // Get item first to invalidate caches
    const { data: item } = await this.getLearningItem(itemId)

    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .delete()
        .eq('id', itemId)

      if (response.error) {
        return { data: null, error: new Error(response.error.message) }
      }

      // Invalidate cache
      if (item) {
        cacheService.delete(this.CACHE_KEYS.topicItems(item.topic_id))
        cacheService.delete(this.CACHE_KEYS.userItems(item.user_id))
      }

      return { data: undefined, error: null }
    })
  }

  async getLearningItem(itemId: string): Promise<SupabaseResult<LearningItem>> {
    return withRetry(async () => {
      const response = await supabase
        .from('learning_items')
        .select('*')
        .eq('id', itemId)
        .single()

      return handleSupabaseResponse<LearningItem>(response)
    })
  }

  // Optimistic Updates

  createOptimisticTopic(topics: Topic[], newTopic: Partial<Topic>) {
    return createOptimisticUpdate(topics, newTopic)
  }

  createOptimisticTopicDelete(topics: Topic[], topicId: string) {
    return createOptimisticDelete(topics, topicId)
  }

  createOptimisticTopicUpdate(topics: Topic[], topicId: string, updates: Partial<Topic>) {
    return createOptimisticUpdateItem(topics, topicId, updates)
  }

  createOptimisticItem(items: LearningItem[], newItem: Partial<LearningItem>) {
    return createOptimisticUpdate(items, newItem)
  }

  createOptimisticItemDelete(items: LearningItem[], itemId: string) {
    return createOptimisticDelete(items, itemId)
  }

  createOptimisticItemUpdate(items: LearningItem[], itemId: string, updates: Partial<LearningItem>) {
    return createOptimisticUpdateItem(items, itemId, updates)
  }

  // Clear all caches
  clearCache() {
    cacheService.clear()
  }
}

export const dataService = DataService.getInstance()