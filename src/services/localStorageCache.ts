/**
 * Simple localStorage-based cache for offline functionality
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt?: number
}

class LocalStorageCache {
  private prefix = 'retentive_cache_'

  /**
   * Set an item in cache
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined
      }
      localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem))
    } catch (e) {
      console.warn('Failed to cache item:', e)
      // Handle quota exceeded error
      if (e instanceof DOMException && e.code === 22) {
        this.clearExpired()
        // Retry once after clearing
        try {
          const cacheItem: CacheItem<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: ttlMs ? Date.now() + ttlMs : undefined
          }
          localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem))
        } catch {
          // Give up if still fails
        }
      }
    }
  }

  /**
   * Get an item from cache
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null

      const cacheItem: CacheItem<T> = JSON.parse(item)
      
      // Check if expired
      if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
        this.remove(key)
        return null
      }

      return cacheItem.data
    } catch {
      return null
    }
  }

  /**
   * Remove an item from cache
   */
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }

  /**
   * Clear all expired items
   */
  clearExpired(): void {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const cacheItem = JSON.parse(item)
            if (cacheItem.expiresAt && now > cacheItem.expiresAt) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Remove corrupted items
          localStorage.removeItem(key)
        }
      }
    })
  }

  /**
   * Clear all cache items
   */
  clearAll(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Invalidate cache items matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Object.keys(localStorage)
    const regex = new RegExp(pattern)
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const cacheKey = key.substring(this.prefix.length)
        if (regex.test(cacheKey)) {
          localStorage.removeItem(key)
        }
      }
    })
  }
}

export const localStorageCache = new LocalStorageCache()