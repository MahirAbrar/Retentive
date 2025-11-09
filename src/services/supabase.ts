import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

// Supabase client instance (initialized lazily)
let supabaseInstance: SupabaseClient | null = null
let initializationPromise: Promise<SupabaseClient> | null = null

/**
 * Initialize Supabase client with credentials from main process
 * Credentials are NOT bundled in the renderer - loaded via IPC
 */
async function initializeSupabase(): Promise<SupabaseClient> {
  // If already initialized, return existing instance
  if (supabaseInstance) {
    return supabaseInstance
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  initializationPromise = (async () => {
    let supabaseUrl: string
    let supabaseAnonKey: string

    // Get credentials from main process if in Electron
    if (window.electronAPI) {
      const config = await window.electronAPI.getSupabaseConfig()

      if (!config || !config.url || !config.anonKey) {
        throw new Error('Failed to get Supabase credentials from main process')
      }

      supabaseUrl = config.url
      supabaseAnonKey = config.anonKey
    } else {
      // Web fallback - REMOVED for security
      // This app is designed for Electron only
      // If you need web mode, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
      throw new Error('This application requires Electron. Web mode is not supported in production.')
    }

    // Create Supabase client
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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

    return supabaseInstance
  })()

  return initializationPromise
}

/**
 * Get Supabase client instance
 * Automatically initializes if not already done
 */
export async function getSupabase(): Promise<SupabaseClient> {
  return initializeSupabase()
}

// Export a property that will be initialized lazily
// This maintains backward compatibility with existing code
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!supabaseInstance) {
      throw new Error(
        'Supabase client not initialized. Use `await getSupabase()` or ensure the client is initialized before use.'
      )
    }
    return (supabaseInstance as any)[prop]
  }
})

// Initialize immediately if in Electron (don't block module loading)
if (typeof window !== 'undefined' && window.electronAPI) {
  initializeSupabase().catch(err => {
    console.error('Failed to initialize Supabase client:', err)
  })
}
