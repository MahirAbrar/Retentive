import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Create Supabase client instance
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storage: {
      getItem: async (key: string) => {
        return await secureStorage.getItem(key)
      },
      setItem: async (key: string, value: string) => {
        await secureStorage.setItem(key, value)
      },
      removeItem: async (key: string) => {
        await secureStorage.removeItem(key)
      }
    }
  }
})

/**
 * Get Supabase client instance
 * Now synchronous since we no longer need to wait for Electron IPC
 */
export async function getSupabase(): Promise<SupabaseClient> {
  return supabaseInstance
}

// Export the client directly for simpler usage
export const supabase = supabaseInstance
