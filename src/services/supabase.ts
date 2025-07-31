import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
    storage: {
      getItem: (key: string) => {
        return localStorage.getItem(key)
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value)
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key)
      }
    }
  }
})