import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { localStorageCache } from './localStorageCache'
import { logger } from '../utils/logger'
import type { Subject } from '../types/database'
import type { SubjectWithStats } from '../types/subject'
import { validateSubjectName, sanitizeInput } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import {
  handleSupabaseResponse,
  handleSupabaseListResponse,
  withRetry,
  type SupabaseResult,
  type SupabaseListResult,
} from '../utils/supabase'

export interface CreateSubjectData {
  user_id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface UpdateSubjectData {
  name?: string
  description?: string | null
  icon?: string
  color?: string
  display_order?: number
}

export class SubjectService {
  private static instance: SubjectService
  private readonly CACHE_KEYS = {
    subjects: (userId: string) => `subjects:${userId}`,
    subject: (id: string) => `subject:${id}`,
    subjectStats: (userId: string) => `subject_stats:${userId}`,
  }

  private constructor() {}

  public static getInstance(): SubjectService {
    if (!SubjectService.instance) {
      SubjectService.instance = new SubjectService()
    }
    return SubjectService.instance
  }

  async createSubject(data: CreateSubjectData): Promise<SupabaseResult<Subject>> {
    if (!validateSubjectName(data.name)) {
      throw new ValidationError('Subject name must be between 1 and 100 characters')
    }

    const sanitizedData = {
      ...data,
      name: sanitizeInput(data.name),
      description: data.description ? sanitizeInput(data.description) : null,
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('subjects')
          .insert(sanitizedData)
          .select()
          .single()

        return await handleSupabaseResponse<Subject>(response)
      })

      if (result.data) {
        this.invalidateCache(data.user_id)
      }

      return result
    } catch (error) {
      logger.error('Error creating subject:', error)
      return { data: null, error: error as Error }
    }
  }

  async getSubjects(userId: string): Promise<SupabaseListResult<Subject>> {
    const cacheKey = this.CACHE_KEYS.subjects(userId)

    const cached = cacheService.get<Subject[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', userId)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true })

        return await handleSupabaseListResponse<Subject>(response)
      })

      if (result.data && !result.error) {
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
        localStorageCache.set(cacheKey, result.data, 24 * 60 * 60 * 1000)
      }

      return result
    } catch (error) {
      const offlineData = localStorageCache.get<Subject[]>(cacheKey)
      if (offlineData) {
        return { data: offlineData, error: null }
      }
      logger.error('Error fetching subjects:', error)
      return { data: [], error: error as Error }
    }
  }

  async getSubject(subjectId: string): Promise<SupabaseResult<Subject>> {
    const cacheKey = this.CACHE_KEYS.subject(subjectId)

    const cached = cacheService.get<Subject>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const result = await withRetry(async () => {
        const response = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single()

        return await handleSupabaseResponse<Subject>(response)
      })

      if (result.data) {
        cacheService.set(cacheKey, result.data, 5 * 60 * 1000)
      }

      return result
    } catch (error) {
      logger.error('Error fetching subject:', error)
      return { data: null, error: error as Error }
    }
  }

  async getSubjectsWithStats(userId: string): Promise<SupabaseListResult<SubjectWithStats>> {
    const cacheKey = this.CACHE_KEYS.subjectStats(userId)

    const cached = cacheService.get<SubjectWithStats[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    try {
      const { data: subjects, error } = await this.getSubjects(userId)
      if (error || !subjects) {
        return { data: [], error }
      }

      const now = new Date()

      const subjectsWithStats = await Promise.all(
        subjects.map(async (subject) => {
          // Get active topics for this subject
          const { data: topics } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subject.id)
            .neq('archive_status', 'archived')

          const topicIds = topics?.map((t) => t.id) || []

          if (topicIds.length === 0) {
            return {
              ...subject,
              topicCount: 0,
              itemCount: 0,
              dueCount: 0,
              newCount: 0,
              masteredCount: 0,
            }
          }

          // Get item stats for topics in this subject
          const { data: items } = await supabase
            .from('learning_items')
            .select('review_count, next_review_at, mastery_status')
            .in('topic_id', topicIds)
            .neq('mastery_status', 'archived')

          const itemsList = items || []

          return {
            ...subject,
            topicCount: topicIds.length,
            itemCount: itemsList.length,
            dueCount: itemsList.filter(
              (i) => i.review_count > 0 && i.next_review_at && new Date(i.next_review_at) <= now
            ).length,
            newCount: itemsList.filter((i) => i.review_count === 0).length,
            masteredCount: itemsList.filter((i) => i.review_count >= 5).length,
          }
        })
      )

      cacheService.set(cacheKey, subjectsWithStats, 2 * 60 * 1000)
      return { data: subjectsWithStats, error: null }
    } catch (error) {
      logger.error('Error fetching subjects with stats:', error)
      return { data: [], error: error as Error }
    }
  }

  async updateSubject(subjectId: string, data: UpdateSubjectData): Promise<SupabaseResult<Subject>> {
    if (data.name !== undefined && !validateSubjectName(data.name)) {
      throw new ValidationError('Subject name must be between 1 and 100 characters')
    }

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (data.name !== undefined) updateData.name = sanitizeInput(data.name)
      if (data.description !== undefined) {
        updateData.description = data.description ? sanitizeInput(data.description) : null
      }
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.color !== undefined) updateData.color = data.color
      if (data.display_order !== undefined) updateData.display_order = data.display_order

      const result = await withRetry(async () => {
        const response = await supabase
          .from('subjects')
          .update(updateData)
          .eq('id', subjectId)
          .select()
          .single()

        return await handleSupabaseResponse<Subject>(response)
      })

      if (result.data) {
        this.invalidateCache(result.data.user_id)
        cacheService.delete(this.CACHE_KEYS.subject(subjectId))
      }

      return result
    } catch (error) {
      logger.error('Error updating subject:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteSubject(subjectId: string): Promise<SupabaseResult<void>> {
    try {
      // Get subject first to invalidate correct user's cache
      const { data: subject } = await supabase
        .from('subjects')
        .select('user_id')
        .eq('id', subjectId)
        .single()

      const result = await withRetry(async () => {
        const response = await supabase.from('subjects').delete().eq('id', subjectId)

        if (response.error) {
          return { data: null, error: new Error(response.error.message) }
        }

        return { data: undefined, error: null }
      })

      if (!result.error && subject) {
        this.invalidateCache(subject.user_id)
        cacheService.delete(this.CACHE_KEYS.subject(subjectId))
      }

      return result as SupabaseResult<void>
    } catch (error) {
      logger.error('Error deleting subject:', error)
      return { data: null, error: error as Error }
    }
  }

  private invalidateCache(userId: string) {
    cacheService.delete(this.CACHE_KEYS.subjects(userId))
    cacheService.delete(this.CACHE_KEYS.subjectStats(userId))
    localStorageCache.remove(this.CACHE_KEYS.subjects(userId))
  }

  /**
   * Clear all caches for a user (called by realtimeService)
   */
  public clearCache(userId: string) {
    this.invalidateCache(userId)
  }
}

export const subjectService = SubjectService.getInstance()
