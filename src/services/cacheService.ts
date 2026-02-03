interface CacheEntry<T> {
  data: T
  timestamp: number
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.defaultTTL)
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if cache is expired
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Get cached data even if stale, with freshness metadata.
   * Useful for stale-while-revalidate patterns.
   */
  getWithMeta<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.cache.get(key)
    if (!entry) return { data: null, isStale: true }

    const isStale = Date.now() > entry.timestamp
    return { data: entry.data as T, isStale }
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const cacheService = new CacheService()