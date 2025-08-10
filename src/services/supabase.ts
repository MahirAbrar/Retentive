import { createClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

// Production credentials - these are safe to expose as they're public anon keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tnkvynxyoalhowrkxjio.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3Z5bnh5b2FsaG93cmt4amlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDAyNDQsImV4cCI6MjA2OTUxNjI0NH0.gO5--MQRp5SAINjmIAXKO3caQ_E2bwk_-ruSe030ups'

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