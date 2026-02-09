import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { localStorageCache } from './localStorageCache'
import { logger } from '../utils/logger'
import type { Topic, LearningItem, MasteryStatus, LearningMode } from '../types/database'
import {
  validateTopicName,
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
  learning_mode: LearningMode
  subject_id?: string | null
}

export interface UpdateTopicData {
  name?: string
  learning_mode?: LearningMode
  subject_id?: string | null
}

export interface CreateLearningItemData {
  topic_id: string
  user_id: string
  content: string
  learning_mode: LearningMode
}

export interface UpdateLearningItemData {
  content?: string
  learning_mode?: LearningMode
  last_reviewed_at?: string | null
  next_review_at?: string | null
  review_count?: number
  interval_days?: number
  ease_factor?: number
  updated_at?: string
  mastery_status?: MasteryStatus
  archive_date?: string | null
  mastery_date?: string | null
  maintenance_interval_days?: number | null
}

export class DataService {
  private static instance: DataService
  private readonly CACHE_KEYS = {
    topics: (userId: string) => `topics:${userId}`,
    topic: (id: string) => `topic:${id}`,
    topicItems: (topicId: string) => `topic_items:${topicId}`,
    userItems: (userId: string) => `user_items:${userId}`,
  }
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
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

    const sanitizedData = {
      ...data,
      name: sanitizeInput(data.name),
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .insert(sanitizedData)
          .select()
          .single()

        return await handleSupabaseResponse<Topic>(response)
      })
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topics(data.user_id))
        localStorageCache.remove(this.CACHE_KEYS.topics(data.user_id))
      }

      return result
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getTopics(userId: string): Promise<SupabaseListResult<Topic>> {
    const cacheKey = this.CACHE_KEYS.topics(userId)
    
    // Check in-memory cache first
    const cached = cacheService.get<Topic[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        return await handleSupabaseListResponse<Topic>(response)
      })
      
      if (result.data && !result.error) {
        // Cache in memory for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        // Also cache in localStorage for offline access (24 hours)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // If online request fails, try localStorage cache
      const offlineData = localStorageCache.get<Topic[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      // If no offline data, return the error
      return { data: [], error: error as Error }
    }
  }

  async getTopic(topicId: string): Promise<SupabaseResult<Topic>> {
    const cacheKey = this.CACHE_KEYS.topic(topicId)
    
    // Check in-memory cache first
    const cached = cacheService.get<Topic>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .select('*')
          .eq('id', topicId)
          .single()

        return await handleSupabaseResponse<Topic>(response)
      })
      
      if (result.data && !result.error) {
        // Cache in memory for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        // Also cache in localStorage for offline access (24 hours)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // If online request fails, try localStorage cache
      const offlineData = localStorageCache.get<Topic>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      // If no offline data, return the error
      return { data: null, error: error as Error }
    }
  }

  async updateTopic(topicId: string, data: UpdateTopicData): Promise<SupabaseResult<Topic>> {
    // Validate input
    if (data.name !== undefined && !validateTopicName(data.name)) {
      throw new ValidationError('Topic name must be between 1 and 100 characters')
    }

    const sanitizedData = {
      ...data,
      name: data.name ? sanitizeInput(data.name) : undefined,
      updated_at: new Date().toISOString(),
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .update(sanitizedData)
          .eq('id', topicId)
          .select()
          .single()

        return await handleSupabaseResponse<Topic>(response)
      })
      
      if (result.data) {
        // Invalidate cache
        cacheService.delete(this.CACHE_KEYS.topic(topicId))
        cacheService.delete(this.CACHE_KEYS.topics(result.data.user_id))
        localStorageCache.remove(this.CACHE_KEYS.topic(topicId))
        localStorageCache.remove(this.CACHE_KEYS.topics(result.data.user_id))
      }

      return result
    } catch (error) {
      return { data: null, error: error as Error }
    }
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
      localStorageCache.remove(this.CACHE_KEYS.topic(topicId))
      localStorageCache.remove(this.CACHE_KEYS.topicItems(topicId))
      if (topic) {
        cacheService.delete(this.CACHE_KEYS.topics(topic.user_id))
        localStorageCache.remove(this.CACHE_KEYS.topics(topic.user_id))
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
        localStorageCache.remove(this.CACHE_KEYS.topicItems(data.topic_id))
        localStorageCache.remove(this.CACHE_KEYS.userItems(data.user_id))
      }

      return result
    })
  }

  /**
   * Create multiple learning items
   * @param items - Array of item data
   * @returns Array of created items or error
   */
  async createLearningItems(items: CreateLearningItemData[]): Promise<SupabaseListResult<LearningItem>> {
    // Validate all items
    items.forEach((item, index) => {
      if (!item.content || item.content.trim().length === 0) {
        throw new ValidationError(`Item ${index + 1}: Content is required`)
      }
    })

    const sanitizedItems = items.map(item => ({
      ...item,
      content: sanitizeInput(item.content),
      ease_factor: 2.5,
      review_count: 0,
      interval_days: 0,
      next_review_at: null,
      last_reviewed_at: null,
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
          localStorageCache.remove(this.CACHE_KEYS.topicItems(topicId))
        })
        
        uniqueUserIds.forEach(userId => {
          cacheService.delete(this.CACHE_KEYS.userItems(userId))
          localStorageCache.remove(this.CACHE_KEYS.userItems(userId))
        })
      }

      return result
    })
  }

  async getTopicItems(topicId: string): Promise<SupabaseListResult<LearningItem>> {
    const cacheKey = this.CACHE_KEYS.topicItems(topicId)
    
    // Check in-memory cache first
    const cached = cacheService.get<LearningItem[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('learning_items')
          .select('*')
          .eq('topic_id', topicId)
          .order('created_at', { ascending: true })

        return await handleSupabaseListResponse<LearningItem>(response)
      })
      
      if (result.data && !result.error) {
        // Cache in memory for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        // Also cache in localStorage for offline access (24 hours)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // If online request fails, try localStorage cache
      const offlineData = localStorageCache.get<LearningItem[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      // If no offline data, return the error
      return { data: [], error: error as Error }
    }
  }

  async getUserItems(userId: string): Promise<SupabaseListResult<LearningItem>> {
    const cacheKey = this.CACHE_KEYS.userItems(userId)
    
    // Check in-memory cache first
    const cached = cacheService.get<LearningItem[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('learning_items')
          .select('*')
          .eq('user_id', userId)
          .order('next_review_at', { ascending: true, nullsFirst: true })

        return await handleSupabaseListResponse<LearningItem>(response)
      })
      
      if (result.data && !result.error) {
        // Cache in memory for 2 minutes (shorter since review times change frequently)
        cacheService.set(cacheKey, result.data, 2 * 60 * 1000)
        // Also cache in localStorage for offline access (6 hours)
        localStorageCache.set(cacheKey, result.data, 6 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // If online request fails, try localStorage cache
      const offlineData = localStorageCache.get<LearningItem[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      // If no offline data, return the error
      return { data: [], error: error as Error }
    }
  }

  async updateLearningItem(
    itemId: string, 
    data: UpdateLearningItemData
  ): Promise<SupabaseResult<LearningItem>> {
    // Validate input
    if (data.content !== undefined && (!data.content || data.content.trim().length === 0)) {
      throw new ValidationError('Content cannot be empty')
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
        localStorageCache.remove(this.CACHE_KEYS.topicItems(result.data.topic_id))
        localStorageCache.remove(this.CACHE_KEYS.userItems(result.data.user_id))
      }

      return result
    })
  }

  /**
   * Delete a learning item
   * @param itemId - Item ID to delete
   * @returns Success or error
   */
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
        localStorageCache.remove(this.CACHE_KEYS.topicItems(item.topic_id))
        localStorageCache.remove(this.CACHE_KEYS.userItems(item.user_id))
      }

      return { data: undefined, error: null }
    })
  }

  /**
   * Get a single learning item by ID
   * @param itemId - Item ID
   * @returns Item data or error
   */
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
    localStorageCache.clearAll()
  }

  // Mastery and Archive Management Methods

  async updateItemMasteryStatus(
    itemId: string,
    status: MasteryStatus,
    maintenanceInterval?: number
  ): Promise<SupabaseResult<LearningItem>> {
    const updateData: UpdateLearningItemData = {
      mastery_status: status,
      updated_at: new Date().toISOString()
    }

    // Handle status-specific updates
    if (status === 'archived') {
      updateData.archive_date = new Date().toISOString()
    } else if (status === 'maintenance' && maintenanceInterval) {
      // Ensure maintenance interval is an integer
      updateData.maintenance_interval_days = Math.round(maintenanceInterval)
      // Set next review date based on maintenance interval
      updateData.next_review_at = new Date(Date.now() + Math.round(maintenanceInterval) * 24 * 60 * 60 * 1000).toISOString()
    } else if (status === 'repeat') {
      // Reset review stats for repeat mode - item becomes "new" again
      updateData.review_count = 0
      updateData.interval_days = 0
      updateData.ease_factor = 2.5
      updateData.last_reviewed_at = null
      updateData.next_review_at = null
      updateData.mastery_date = null
      updateData.mastery_status = 'active' // Reset to active status
      updateData.archive_date = null
      updateData.maintenance_interval_days = null
    } else if (status === 'mastered') {
      updateData.mastery_date = new Date().toISOString()
    }

    return this.updateLearningItem(itemId, updateData)
  }

  async archiveTopic(topicId: string): Promise<SupabaseResult<Topic>> {
    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .update({
            archive_status: 'archived',
            archive_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', topicId)
          .select()
          .single()

        return await handleSupabaseResponse<Topic>(response)
      })

      if (result.data) {
        // Invalidate caches - both regular and archived
        cacheService.delete(this.CACHE_KEYS.topic(topicId))
        cacheService.delete(this.CACHE_KEYS.topics(result.data.user_id))
        cacheService.delete(`archived_topics:${result.data.user_id}`)
        localStorageCache.remove(this.CACHE_KEYS.topic(topicId))
        localStorageCache.remove(this.CACHE_KEYS.topics(result.data.user_id))
        localStorageCache.remove(`archived_topics:${result.data.user_id}`)
      }

      return result
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async unarchiveTopic(topicId: string): Promise<SupabaseResult<Topic>> {
    try {
      // First, unarchive the topic
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .update({
            archive_status: 'active',
            archive_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', topicId)
          .select()
          .single()

        return await handleSupabaseResponse<Topic>(response)
      })

      if (result.data) {
        // Try to unarchive items that were archived but not mastered
        // This is optional - if no items need unarchiving, that's fine
        try {
          const itemsResult = await withRetry(async () => {
            const response = await supabase
              .from('learning_items')
              .update({
                mastery_status: 'active',
                archive_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('topic_id', topicId)
              .eq('mastery_status', 'archived')
              .lt('review_count', 5) // Only unarchive items that weren't mastered
              .select()

            return await handleSupabaseResponse<LearningItem[]>(response)
          })

          // Log the result for debugging
          if (itemsResult.data && itemsResult.data.length > 0) {
            logger.log(`Unarchived ${itemsResult.data.length} non-mastered items for topic ${topicId}`)
          }
        } catch {
          // If updating items fails, log it but don't fail the whole operation
          logger.log(`Note: No archived items to restore for topic ${topicId}`)
        }

        // Invalidate caches - both regular and archived
        cacheService.delete(this.CACHE_KEYS.topic(topicId))
        cacheService.delete(this.CACHE_KEYS.topics(result.data.user_id))
        cacheService.delete(this.CACHE_KEYS.topicItems(topicId))
        cacheService.delete(`archived_topics:${result.data.user_id}`)
        localStorageCache.remove(this.CACHE_KEYS.topic(topicId))
        localStorageCache.remove(this.CACHE_KEYS.topics(result.data.user_id))
        localStorageCache.remove(this.CACHE_KEYS.topicItems(topicId))
        localStorageCache.remove(`archived_topics:${result.data.user_id}`)
      }

      return result
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getArchivedTopics(userId: string): Promise<SupabaseListResult<Topic>> {
    const cacheKey = `archived_topics:${userId}`
    
    // Check cache first
    const cached = cacheService.get<Topic[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('topics')
          .select('*')
          .eq('user_id', userId)
          .eq('archive_status', 'archived')
          .order('archive_date', { ascending: false })

        return await handleSupabaseListResponse<Topic>(response)
      })
      
      if (result.data && !result.error) {
        // Cache for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // Try localStorage cache if offline
      const offlineData = localStorageCache.get<Topic[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      return { data: [], error: error as Error }
    }
  }

  async getArchivedItems(userId: string): Promise<SupabaseListResult<LearningItem>> {
    const cacheKey = `archived_items:${userId}`
    
    // Check cache first
    const cached = cacheService.get<LearningItem[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('learning_items')
          .select('*')
          .eq('user_id', userId)
          .eq('mastery_status', 'archived')
          .order('archive_date', { ascending: false })

        return await handleSupabaseListResponse<LearningItem>(response)
      })
      
      if (result.data && !result.error) {
        // Cache for 5 minutes
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      // Try localStorage cache if offline
      const offlineData = localStorageCache.get<LearningItem[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      return { data: [], error: error as Error }
    }
  }

  async bulkUpdateMasteryStatus(
    itemIds: string[],
    status: MasteryStatus
  ): Promise<SupabaseListResult<LearningItem>> {
    const updateData: UpdateLearningItemData = {
      mastery_status: status,
      updated_at: new Date().toISOString()
    }

    // Add status-specific fields
    if (status === 'archived') {
      updateData.archive_date = new Date().toISOString()
    } else if (status === 'repeat') {
      updateData.review_count = 0
      updateData.interval_days = 0
      updateData.ease_factor = 2.5
      updateData.last_reviewed_at = null
      updateData.next_review_at = null
      updateData.mastery_date = null
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('learning_items')
          .update(updateData)
          .in('id', itemIds)
          .select()

        return await handleSupabaseListResponse<LearningItem>(response)
      })

      if (result.data && result.data.length > 0) {
        // Clear all relevant caches
        const uniqueUserIds = new Set(result.data.map(item => item.user_id))
        const uniqueTopicIds = new Set(result.data.map(item => item.topic_id))
        
        uniqueUserIds.forEach(userId => {
          cacheService.delete(this.CACHE_KEYS.userItems(userId))
          localStorageCache.remove(this.CACHE_KEYS.userItems(userId))
        })
        
        uniqueTopicIds.forEach(topicId => {
          cacheService.delete(this.CACHE_KEYS.topicItems(topicId))
          localStorageCache.remove(this.CACHE_KEYS.topicItems(topicId))
        })
      }

      return result
    } catch (error) {
      return { data: [], error: error as Error }
    }
  }
}

export const dataService = DataService.getInstance()