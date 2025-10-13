import { logger } from './logger'

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  shouldRetry: (error: Error) => boolean
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: Error) => {
    const message = error.message.toLowerCase()
    // Retry on network errors but not on auth or validation errors
    return (
      message.includes('err_network') ||
      message.includes('err_timed_out') ||
      message.includes('err_internet_disconnected') ||
      message.includes('network') ||
      message.includes('timeout')
    ) && !message.includes('auth') && !message.includes('401')
  }
}

/**
 * Wraps an async function with retry logic and exponential backoff
 */
export function withRetryInterceptor<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  const retryConfig = { ...defaultConfig, ...config }

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        // If not the first attempt, wait before retrying
        if (attempt > 0) {
          const delay = Math.min(
            retryConfig.baseDelay * Math.pow(2, attempt - 1),
            retryConfig.maxDelay
          )
          logger.info(`Retrying request (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))

          // Check if we're online before retrying
          if (!navigator.onLine) {
            logger.info('Offline, skipping retry')
            throw new Error('Network offline')
          }
        }

        // Try the request
        return await fn(...args)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && retryConfig.shouldRetry(lastError)) {
          logger.warn(`Request failed (attempt ${attempt + 1}):`, lastError.message)
          continue
        }

        // Don't retry, throw the error
        throw lastError
      }
    }

    // All retries exhausted
    throw lastError || new Error('Request failed after all retries')
  }) as T
}

/**
 * Silences network errors in console but still logs them
 */
export function silenceNetworkErrors(error: unknown): void {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('err_network') ||
      message.includes('err_timed_out') ||
      message.includes('err_internet_disconnected')
    ) {
      // Log to our logger but don't throw to console
      logger.debug('Network error (silenced):', error.message)
      return
    }
  }

  // Re-throw non-network errors
  throw error
}