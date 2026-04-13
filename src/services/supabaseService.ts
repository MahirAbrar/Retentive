import { logger } from '../utils/logger'
import { supabase } from './supabase'
import type { Session, Subscription } from '@supabase/supabase-js'

export interface ConnectionStatus {
  isOnline: boolean
  lastConnected: Date | null
  retryCount: number
}

export type ConnectionStatusCallback = (status: ConnectionStatus) => void
export type AuthStateCallback = (event: 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | 'MFA_CHALLENGE_VERIFIED', session: Session | null) => void

export class SupabaseService {
  private static instance: SupabaseService
  private authSubscription: Subscription | null = null
  private connectionStatus: ConnectionStatus = {
    isOnline: true,
    lastConnected: new Date(),
    retryCount: 0,
  }
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set()
  private authStateCallbacks: Set<AuthStateCallback> = new Set()
  private pingInterval: NodeJS.Timeout | null = null
  private refreshTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.initialize()
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService()
    }
    return SupabaseService.instance
  }

  private async initialize() {
    // Set up auth state change listener
    this.setupAuthStateListener()
    
    // Set up connection monitoring
    this.startConnectionMonitoring()
    
    // Set up auto-refresh
    this.setupAutoRefresh()
    
    // Monitor browser online/offline events
    this.setupBrowserConnectionListeners()
  }

  private setupAuthStateListener() {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Notify all auth state callbacks
      this.authStateCallbacks.forEach(callback => {
        try {
          callback(event, session)
        } catch (error) {
          logger.error('Error in auth state callback:', error)
        }
      })

      // Handle specific auth events
      switch (event) {
        case 'SIGNED_IN':
          this.handleSignIn(session)
          break
        case 'SIGNED_OUT':
          this.handleSignOut()
          break
        case 'TOKEN_REFRESHED':
          this.handleTokenRefresh(session)
          break
        case 'USER_UPDATED':
          this.handleUserUpdate(session)
          break
      }
    })
    
    this.authSubscription = subscription
  }

  private handleSignIn(session: Session | null) {
    if (session) {
      // Reset connection status on successful sign in
      this.updateConnectionStatus(true)
      
      // Set up auto-refresh timer
      this.setupAutoRefresh()
    }
  }

  private handleSignOut() {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private handleTokenRefresh(session: Session | null) {
    if (session) {
      // Schedule next refresh
      this.scheduleTokenRefresh(session)
    }
  }

  private handleUserUpdate(_session: Session | null) {
    // Handle user profile updates if needed
  }

  private setupAutoRefresh() {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.scheduleTokenRefresh(session)
      }
    })
  }

  private scheduleTokenRefresh(session: Session) {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Calculate when to refresh (5 minutes before expiry)
    const expiresAt = session.expires_at
    if (!expiresAt) return

    const expiresIn = (expiresAt * 1000) - Date.now()
    const refreshIn = Math.max(expiresIn - (5 * 60 * 1000), 0) // 5 minutes before expiry

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          const { error } = await supabase.auth.refreshSession()
          if (error) {
            logger.error('Failed to refresh token:', error)
          }
        } catch (error) {
          logger.error('Error refreshing token:', error)
        }
      }, refreshIn)
    }
  }

  private startConnectionMonitoring() {
    // Removed periodic polling - browser online/offline events are sufficient and more energy efficient
    // The setupBrowserConnectionListeners() handles connection state changes instantly
    // If needed in the future, can add visibility-aware polling here
  }

  private setupBrowserConnectionListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateConnectionStatus(true)
      this.attemptReconnection()
    })

    window.addEventListener('offline', () => {
      this.updateConnectionStatus(false)
    })
  }

  private updateConnectionStatus(isOnline: boolean) {
    const wasOnline = this.connectionStatus.isOnline
    
    this.connectionStatus = {
      isOnline,
      lastConnected: isOnline ? new Date() : this.connectionStatus.lastConnected,
      retryCount: isOnline ? 0 : this.connectionStatus.retryCount,
    }

    // Notify callbacks if status changed
    if (wasOnline !== isOnline) {
      this.connectionStatusCallbacks.forEach(callback => {
        try {
          callback(this.connectionStatus)
        } catch (error) {
          logger.error('Error in connection status callback:', error)
        }
      })
    }
  }

  private async handleConnectionError(_error: any) {
    this.connectionStatus.retryCount++
    
    // Implement exponential backoff
    const backoffDelay = Math.min(1000 * Math.pow(2, this.connectionStatus.retryCount), 30000)
    
    setTimeout(() => {
      this.attemptReconnection()
    }, backoffDelay)
  }

  private async attemptReconnection() {
    if (!this.connectionStatus.isOnline) {
      return
    }

    try {
      // Try to refresh the session
      const { error } = await supabase.auth.refreshSession()
      if (!error) {
        this.updateConnectionStatus(true)
      }
    } catch (error) {
      logger.error('Reconnection attempt failed:', error)
    }
  }

  // Public methods

  public getClient() {
    return supabase
  }

  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  public onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.connectionStatusCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks.delete(callback)
    }
  }

  public onAuthStateChange(callback: AuthStateCallback): () => void {
    this.authStateCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.authStateCallbacks.delete(callback)
    }
  }

  public async waitForConnection(timeout: number = 5000): Promise<boolean> {
    if (this.connectionStatus.isOnline) {
      return true
    }

    return new Promise((resolve) => {
      const unsubscribe = this.onConnectionStatusChange((status) => {
        if (status.isOnline) {
          unsubscribe()
          resolve(true)
        }
      })

      setTimeout(() => {
        unsubscribe()
        resolve(false)
      }, timeout)
    })
  }

  public dispose() {
    // Clean up subscriptions
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
    }

    // Clear intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Clear callbacks
    this.connectionStatusCallbacks.clear()
    this.authStateCallbacks.clear()
  }
}

export const supabaseService = SupabaseService.getInstance()