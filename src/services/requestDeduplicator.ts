/**
 * Request deduplicator to prevent multiple identical API calls
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map()
  
  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   */
  async execute<T>(
    key: string, 
    requestFn: () => Promise<T>,
    ttl: number = 5000 // Cache pending requests for 5 seconds
  ): Promise<T> {
    // Check if we have a pending request
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }
    
    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after TTL
        setTimeout(() => {
          this.pendingRequests.delete(key)
        }, ttl)
      })
    
    this.pendingRequests.set(key, promise)
    return promise
  }
  
  /**
   * Generate a cache key that normalizes timestamps to prevent duplicates
   */
  normalizeTimestamp(date: Date, granularity: 'minute' | 'hour' | 'day' = 'minute'): string {
    const normalized = new Date(date)
    
    // Zero out smaller units based on granularity
    if (granularity === 'day') {
      normalized.setHours(0, 0, 0, 0)
    } else if (granularity === 'hour') {
      normalized.setMinutes(0, 0, 0)
    } else {
      normalized.setSeconds(0, 0)
    }
    
    return normalized.toISOString()
  }
}

export const requestDeduplicator = new RequestDeduplicator()