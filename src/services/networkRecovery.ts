import { supabase } from './supabase'
import { logger } from '../utils/logger'

class NetworkRecoveryService {
  private static instance: NetworkRecoveryService
  private isRecovering = false
  private retryQueue: Array<() => Promise<void>> = []
  private lastOnlineStatus = navigator.onLine
  private refreshTimer: NodeJS.Timeout | null = null
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null
  private visibilityHandler: (() => void) | null = null
  private focusHandler: (() => void) | null = null

  private constructor() {
    this.setupListeners()
  }

  public static getInstance(): NetworkRecoveryService {
    if (!NetworkRecoveryService.instance) {
      NetworkRecoveryService.instance = new NetworkRecoveryService()
    }
    return NetworkRecoveryService.instance
  }

  private setupListeners() {
    // Create bound handlers so we can remove them later
    this.onlineHandler = () => this.handleNetworkReconnect()
    this.offlineHandler = () => this.handleNetworkDisconnect()
    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.handleVisibilityRestore()
      }
    }
    this.focusHandler = () => this.handleWindowFocus()

    // Listen for network status changes
    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)

    // Listen for visibility changes (computer waking from sleep)
    document.addEventListener('visibilitychange', this.visibilityHandler)

    // Listen for focus events (window becoming active)
    window.addEventListener('focus', this.focusHandler)
  }

  /**
   * Cleanup method to remove all event listeners and clear timers
   * Call this when the app is unmounting to prevent memory leaks
   */
  public cleanup() {
    // Remove event listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler)
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler)
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler)
    }

    // Clear timers
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    // Clear retry queue
    this.retryQueue = []

    logger.debug('Network recovery service cleaned up')
  }

  private async handleNetworkReconnect() {
    logger.info('Network reconnected')
    this.lastOnlineStatus = true

    if (!this.isRecovering) {
      await this.recoverConnection()
    }
  }

  private handleNetworkDisconnect() {
    logger.info('Network disconnected')
    this.lastOnlineStatus = false

    // Cancel any pending refresh
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private async handleVisibilityRestore() {
    // When tab/window becomes visible after being hidden
    if (navigator.onLine && !this.lastOnlineStatus) {
      logger.info('Visibility restored with network available')
      await this.recoverConnection()
    }
  }

  private async handleWindowFocus() {
    // When window regains focus, check if we need to refresh
    if (navigator.onLine) {
      // Debounce to avoid multiple refreshes
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
      }

      this.refreshTimer = setTimeout(async () => {
        await this.checkAndRefreshSession()
      }, 1000)
    }
  }

  private async recoverConnection() {
    if (this.isRecovering) return

    this.isRecovering = true

    try {
      logger.info('Starting connection recovery')

      // First, try to refresh the auth session
      await this.refreshAuthSession()

      // Process any queued operations
      await this.processRetryQueue()

      logger.info('Connection recovery completed')
    } catch (error) {
      logger.error('Connection recovery failed:', error)
    } finally {
      this.isRecovering = false
    }
  }

  private async refreshAuthSession() {
    try {
      // Attempt to refresh the session with exponential backoff
      let retries = 0
      const maxRetries = 3

      while (retries < maxRetries) {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession()

          if (!error && session) {
            logger.info('Auth session refreshed successfully')
            return
          }

          if (error && !error.message.includes('ERR_')) {
            // Non-network error, don't retry
            throw error
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('ERR_')) {
            throw error
          }
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retries) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        retries++
      }

      logger.warn('Failed to refresh session after retries')
    } catch (error) {
      logger.error('Session refresh error:', error)
    }
  }

  private async checkAndRefreshSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Check if token is expiring soon (within 5 minutes)
        const expiresAt = session.expires_at
        if (expiresAt) {
          const expiresIn = (expiresAt * 1000) - Date.now()

          if (expiresIn < 5 * 60 * 1000) {
            logger.info('Token expiring soon, refreshing')
            await this.refreshAuthSession()
          }
        }
      }
    } catch {
      // Silently fail session checks
    }
  }

  private async processRetryQueue() {
    const queue = [...this.retryQueue]
    this.retryQueue = []

    for (const operation of queue) {
      try {
        await operation()
      } catch (error) {
        logger.error('Retry queue operation failed:', error)
      }
    }
  }

  public queueForRetry(operation: () => Promise<void>) {
    this.retryQueue.push(operation)
  }
}

export const networkRecovery = NetworkRecoveryService.getInstance()