import { supabase } from './supabase'
import { supabaseService } from './supabaseService'
import { secureStorage } from './secureStorage'
import { offlineService } from './offlineService'
import { gamificationService as gamificationServiceOffline } from './gamificationServiceOffline'
import { gamificationService } from './gamificationService'
import { localStorageCache } from './localStorageCache'
import type { User } from '../types/database'
import type { Session } from '@supabase/supabase-js'
import { handleError } from '../utils/errors'
import { withRetry } from '../utils/supabase'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  error: Error | null
}

export interface SessionState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

export class AuthService {
  private static instance: AuthService
  private sessionState: SessionState = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  }
  private sessionCallbacks: Set<(state: SessionState) => void> = new Set()
  
  private constructor() {
    this.initializeAuth()
  }
  
  /**
   * Get singleton instance of AuthService
   * @returns {AuthService} The auth service instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  private async initializeAuth() {
    // Set up auth state listener
    supabaseService.onAuthStateChange(async (event, session) => {
      await this.handleAuthStateChange(event, session)
    })

    // Initialize session
    await this.loadSession()
  }

  private async handleAuthStateChange(event: string, session: Session | null) {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        if (session?.user) {
          const user = this.mapSupabaseUser(session.user)
          this.updateSessionState({
            user,
            session,
            isLoading: false,
            isAuthenticated: true,
          })
          
          // Cache user data for offline access
          if (user.id) {
            localStorageCache.set('current_user', user, 7 * 24 * 60 * 60 * 1000) // 7 days
            localStorageCache.set('current_session', { userId: user.id, email: user.email }, 7 * 24 * 60 * 60 * 1000)
            
            offlineService.setUserId(user.id)
            gamificationServiceOffline.setUserId(user.id)
            
            // Initialize gamification stats for the user
            await gamificationService.getUserStats(user.id)
            
            // If in Electron, save user data locally
            if (window.electronAPI) {
              await window.electronAPI.database.user.upsert({
                id: user.id,
                email: user.email,
                display_name: user.email // Use email as display name since User type doesn't have display_name
              })
            }
          }
        }
        break
      
      case 'SIGNED_OUT':
        this.updateSessionState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        })
        // Clear cached session data
        localStorageCache.remove('current_user')
        localStorageCache.remove('current_session')
        break
    }
  }

  private updateSessionState(state: SessionState) {
    this.sessionState = state
    
    // Notify all callbacks
    this.sessionCallbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        handleError(error, 'Session callback')
      }
    })
  }

  private async loadSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session?.user) {
        const user = this.mapSupabaseUser(session.user)
        this.updateSessionState({
          user,
          session,
          isLoading: false,
          isAuthenticated: true,
        })
        // Cache for offline
        if (user.id) {
          localStorageCache.set('current_user', user, 7 * 24 * 60 * 60 * 1000)
          localStorageCache.set('current_session', { userId: user.id, email: user.email }, 7 * 24 * 60 * 60 * 1000)
        }
      } else {
        this.updateSessionState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    } catch (error) {
      // Try to load from cache if offline
      const cachedUser = localStorageCache.get<User>('current_user')
      if (cachedUser) {
        this.updateSessionState({
          user: cachedUser,
          session: null, // Session not available offline
          isLoading: false,
          isAuthenticated: true,
        })
        // Update offline service with cached user ID
        if (cachedUser.id) {
          offlineService.setUserId(cachedUser.id)
          gamificationServiceOffline.setUserId(cachedUser.id)
        }
      } else {
        handleError(error, 'Load session')
        this.updateSessionState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }
  }

  /**
   * Register new user with email and password
   * @param credentials - Email and password for new account
   * @returns User object or error
   */
  async signUp({ email, password }: AuthCredentials): Promise<AuthResponse> {
    return withRetry(async () => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        return {
          user: data.user ? this.mapSupabaseUser(data.user) : null,
          error: null,
        }
      } catch (error) {
        return {
          user: null,
          error: error instanceof Error ? error : new Error('Unknown error occurred'),
        }
      }
    })
  }

  /**
   * Sign in user with email and password
   * @param credentials - Email and password
   * @returns User object or error
   */
  async signIn({ email, password }: AuthCredentials): Promise<AuthResponse> {
    return withRetry(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        return {
          user: data.user ? this.mapSupabaseUser(data.user) : null,
          error: null,
        }
      } catch (error) {
        return {
          user: null,
          error: error instanceof Error ? error : new Error('Unknown error occurred'),
        }
      }
    })
  }

  /**
   * Sign out current user and clear session
   * @returns Error if failed, null if successful
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear secure storage on logout
      if (window.electronAPI?.secureStorage) {
        await secureStorage.clear()
      }
      
      // Clear cached session data
      localStorageCache.remove('current_user')
      localStorageCache.remove('current_session')
      
      // Clear session state
      this.updateSessionState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      })
      
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      }
    }
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      }
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user ? this.mapSupabaseUser(user) : null
    } catch {
      return null
    }
  }

  async getSession() {
    return supabase.auth.getSession()
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? this.mapSupabaseUser(session.user) : null
      callback(user)
    })

    return subscription
  }

  onSessionStateChange(callback: (state: SessionState) => void): () => void {
    this.sessionCallbacks.add(callback)
    
    // Call immediately with current state
    callback(this.sessionState)
    
    // Return unsubscribe function
    return () => {
      this.sessionCallbacks.delete(callback)
    }
  }

  getSessionState(): SessionState {
    return { ...this.sessionState }
  }

  async refreshSession(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to refresh session'),
      }
    }
  }

  async verifySession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      return !error && !!session
    } catch {
      return false
    }
  }

  private mapSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || supabaseUser.created_at,
      user_metadata: supabaseUser.user_metadata || {}
    }
  }
}

export const authService = AuthService.getInstance()