import { cacheService } from '../services/cacheService'
import { logger } from './logger'

/**
 * Clear all authentication and subscription related caches
 * This is useful for testing when trial status changes
 */
export function clearAuthCache(userId?: string) {
  if (userId) {
    // Clear specific user's cache
    cacheService.delete(`trial:${userId}`)
    cacheService.delete(`subscription:${userId}`)
    logger.info('Cleared auth cache for user:', userId)
  } else {
    // Clear all auth-related caches
    cacheService.clear()
    logger.info('Cleared all auth caches')
  }
  
  // Also clear localStorage items that might be caching auth state
  if (typeof window !== 'undefined') {
    const keysToRemove = ['sb-auth-token', 'sb-refresh-token']
    keysToRemove.forEach(key => {
      Object.keys(localStorage).forEach(storageKey => {
        if (storageKey.includes(key)) {
          localStorage.removeItem(storageKey)
        }
      })
    })
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAuthCache = clearAuthCache
}