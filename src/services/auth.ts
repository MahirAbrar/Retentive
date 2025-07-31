import { supabase } from './supabase'
import type { User } from '@/types/database'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  error: Error | null
}

export class AuthService {
  private static instance: AuthService
  
  private constructor() {}
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async signUp({ email, password }: AuthCredentials): Promise<AuthResponse> {
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
  }

  async signIn({ email, password }: AuthCredentials): Promise<AuthResponse> {
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
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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
        redirectTo: `${window.location.origin}/reset-password`,
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

  private mapSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || supabaseUser.created_at,
    }
  }
}

export const authService = AuthService.getInstance()