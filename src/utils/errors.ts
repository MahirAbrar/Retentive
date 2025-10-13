import { logger } from './logger'
import { PostgrestError } from '@supabase/supabase-js'

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field })
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

export function isSupabaseError(error: any): error is PostgrestError {
  return error && typeof error.code === 'string' && error.message && error.details !== undefined
}

export function parseSupabaseError(error: PostgrestError): AppError {
  // Map common Supabase/PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new ValidationError('This value already exists')
    
    case '23503': // foreign_key_violation
      return new ValidationError('Referenced item does not exist')
    
    case '23502': // not_null_violation
      return new ValidationError('Required field is missing')
    
    case '22P02': // invalid_text_representation
      return new ValidationError('Invalid data format')
    
    case 'PGRST116': // not found
      return new NotFoundError('Resource')
    
    case 'PGRST301': // JWT expired
      return new AuthenticationError('Session expired')
    
    case '42501': // insufficient_privilege
      return new AuthorizationError()
    
    default:
      return new AppError(error.message || 'Database error', error.code)
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (isSupabaseError(error)) {
    return parseSupabaseError(error).message
  }
  
  return 'An unexpected error occurred'
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true
  }
  
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('connection')
    )
  }
  
  return false
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    (error instanceof AppError && (error.code === 'AUTHENTICATION_ERROR' || error.code === 'AUTHORIZATION_ERROR'))
  )
}

export function handleError(error: unknown, context?: string): void {
  const message = getErrorMessage(error)
  const errorContext = context ? `[${context}] ` : ''

  // Silence network errors to prevent console spam
  if (error instanceof Error) {
    const errorMsg = error.message.toUpperCase()
    if (errorMsg.includes('ERR_NETWORK') ||
        errorMsg.includes('ERR_TIMED_OUT') ||
        errorMsg.includes('ERR_INTERNET_DISCONNECTED') ||
        errorMsg.includes('ERR_NETWORK_IO_SUSPENDED') ||
        errorMsg.includes('ERR_DNS_NO_MATCHING_SUPPORTED_ALPN')) {
      // Log to debug level only
      logger.debug(`${errorContext}Network error (silenced): ${message}`)
      return
    }
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(`${errorContext}${message}`, error)
  } else {
    logger.error(`${errorContext}${message}`)
  }

  // In production, you might want to send errors to a monitoring service
  // logToSentry(error, context)
}

export interface ErrorWithRetry {
  error: Error
  retry: () => void
  canRetry: boolean
}

export function createRetryableError(
  error: Error,
  retryFn: () => void,
  maxRetries: number = 3,
  currentRetry: number = 0
): ErrorWithRetry {
  const canRetry = currentRetry < maxRetries && (isNetworkError(error) || error instanceof RateLimitError)
  
  return {
    error,
    retry: retryFn,
    canRetry,
  }
}