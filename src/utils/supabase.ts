import type { PostgrestError, PostgrestResponse } from '@supabase/supabase-js'
import { NetworkError, handleError, AppError } from './errors'
import { supabaseService } from '../services/supabaseService'

function parseSupabaseError(error: PostgrestError): Error {
  if (error.code === 'PGRST116') {
    return new NetworkError('Network error - unable to reach server')
  }
  
  return new AppError(
    error.message || 'Database operation failed',
    error.code || 'DATABASE_ERROR',
    400,
    { hint: error.hint, details: error.details }
  )
}

export interface SupabaseResult<T> {
  data: T | null
  error: Error | null
}

export interface SupabaseListResult<T> {
  data: T[]
  error: Error | null
  count?: number
}

export async function handleSupabaseResponse<T>(
  response: PostgrestResponse<T>
): Promise<SupabaseResult<T>> {
  if (response.error) {
    const appError = parseSupabaseError(response.error)
    handleError(appError, 'Supabase Response')
    return { data: null, error: appError }
  }

  return { data: response.data as T, error: null }
}

export async function handleSupabaseListResponse<T>(
  response: PostgrestResponse<T[]>
): Promise<SupabaseListResult<T>> {
  if (response.error) {
    const appError = parseSupabaseError(response.error)
    handleError(appError, 'Supabase List Response')
    return { data: [], error: appError }
  }

  return { 
    data: (response.data || []) as T[], 
    error: null,
    count: response.count || undefined
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for connection if offline
      const isOnline = await supabaseService.waitForConnection()
      if (!isOnline && attempt < maxRetries) {
        throw new NetworkError('No connection available')
      }

      const result = await operation()
      return result
    } catch (error) {
      lastError = error as Error
      
      // Don't retry auth errors or validation errors
      if (
        error instanceof Error &&
        (error.message.includes('JWT') ||
         error.message.includes('auth') ||
         error.message.includes('validation'))
      ) {
        throw error
      }
      
      // Check if we should retry
      if (attempt < maxRetries) {
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

export function createOptimisticUpdate<T>(
  currentData: T[],
  newItem: Partial<T>,
  identifierKey: keyof T = 'id' as keyof T
): { optimisticData: T[]; rollback: () => T[] } {
  const tempId = `temp_${Date.now()}`
  const optimisticItem = { ...newItem, [identifierKey]: tempId } as T
  const optimisticData = [...currentData, optimisticItem]

  return {
    optimisticData,
    rollback: () => currentData,
  }
}

export function createOptimisticDelete<T>(
  currentData: T[],
  itemId: string | number,
  identifierKey: keyof T = 'id' as keyof T
): { optimisticData: T[]; rollback: () => T[] } {
  const optimisticData = currentData.filter(
    item => item[identifierKey] !== itemId
  )

  return {
    optimisticData,
    rollback: () => currentData,
  }
}

export function createOptimisticUpdateItem<T>(
  currentData: T[],
  itemId: string | number,
  updates: Partial<T>,
  identifierKey: keyof T = 'id' as keyof T
): { optimisticData: T[]; rollback: () => T[] } {
  const optimisticData = currentData.map(item =>
    item[identifierKey] === itemId ? { ...item, ...updates } : item
  )

  return {
    optimisticData,
    rollback: () => currentData,
  }
}

export async function batchOperation<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<{ results: R[]; errors: Error[] }> {
  const results: R[] = []
  const errors: Error[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchPromises = batch.map(item =>
      operation(item)
        .then(result => ({ success: true as const, result }))
        .catch(error => ({ success: false as const, error }))
    )

    const batchResults = await Promise.all(batchPromises)

    batchResults.forEach(result => {
      if (result.success) {
        results.push(result.result)
      } else {
        errors.push(result.error)
      }
    })
  }

  return { results, errors }
}

export function buildSupabaseQuery(
  baseQuery: any,
  options?: {
    select?: string
    filter?: Record<string, any>
    sort?: { column: string; ascending?: boolean }[]
    limit?: number
    offset?: number
  }
): any {
  let query = baseQuery

  if (options?.select) {
    query = query.select(options.select)
  }

  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })
  }

  if (options?.sort) {
    options.sort.forEach(({ column, ascending = true }) => {
      query = query.order(column, { ascending })
    })
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  return query
}