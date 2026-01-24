import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export environment error for startup validation (don't throw at module load time)
export const ENV_CONFIG_ERROR: string | null = (!supabaseUrl || !supabaseAnonKey)
  ? 'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting platform.'
  : null

// Create Supabase client instance (only if env vars are valid)
const supabaseInstance: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
  : null

/**
 * Get Supabase client instance
 * Now synchronous since we no longer need to wait for Electron IPC
 * @throws Error if environment variables are not configured
 */
export async function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseInstance) {
    throw new Error(ENV_CONFIG_ERROR || 'Supabase client not initialized')
  }
  return supabaseInstance
}

// Export the client directly for simpler usage
// Note: This can be null if env vars are missing - use StartupCheck to catch this
export const supabase = supabaseInstance as SupabaseClient
