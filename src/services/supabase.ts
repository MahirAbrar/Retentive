import { createClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce', // Enable PKCE for desktop security
    persistSession: true,
    detectSessionInUrl: true, // Enable to handle password reset links
    autoRefreshToken: true,
    storage: {
      // Use secure storage adapter that works in both Electron and web
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