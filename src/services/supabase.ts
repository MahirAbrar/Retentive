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

// Export a lazy-initializing proxy that auto-initializes on first access
// This maintains backward compatibility with existing code
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // If not initialized, start initialization and return a pending wrapper
    if (!supabaseInstance) {
      // Trigger initialization (returns promise but we don't await)
      if (!initializationPromise) {
        initializeSupabase().catch(err => {
          console.error('Failed to initialize Supabase client:', err)
        })
      }

      // Return a function/object that will work with common operations
      // For methods like onAuthStateChange, return a dummy function that queues the call
      if (typeof prop === 'string' && prop === 'auth') {
        return new Proxy({}, {
          get(_authTarget, authProp) {
            if (authProp === 'onAuthStateChange') {
              // Return a function that will set up the listener once ready
              return (callback: any) => {
                initializeSupabase().then((client) => {
                  client.auth.onAuthStateChange(callback)
                }).catch(err => {
                  console.error('Failed to set up auth state change listener:', err)
                })
                // Return a dummy subscription
                return { data: { subscription: { unsubscribe: () => {} } } }
              }
            }
            if (authProp === 'getSession') {
              return async () => {
                const client = await initializeSupabase()
                return client.auth.getSession()
              }
            }
            // For other auth methods, wait for initialization
            return async (...args: any[]) => {
              const client = await initializeSupabase()
              return (client.auth as any)[authProp](...args)
            }
          }
        })
      }

      // For other properties, wait for initialization
      return (supabaseInstance as any)?.[prop]
    }
    return (supabaseInstance as any)[prop]
  }
})
