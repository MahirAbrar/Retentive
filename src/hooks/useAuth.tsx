import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/authFixed'
import type { User } from '@/types/database'
import { Loading } from '@/components/ui'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check for existing session
    authService.getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth state changes
    const subscription = authService.onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { user, error } = await authService.signIn({ email, password })
    if (user) {
      setUser(user)
      navigate('/')
    }
    return { error }
  }, [navigate])

  const signUp = useCallback(async (email: string, password: string) => {
    const { user, error } = await authService.signUp({ email, password })
    if (user) {
      setUser(user)
    }
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
    navigate('/login')
  }, [navigate])

  const resetPassword = useCallback(async (email: string) => {
    return authService.resetPassword(email)
  }, [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword
  }), [user, loading, signIn, signUp, signOut, resetPassword])

  if (loading) {
    return <Loading fullScreen text="Loading..." />
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser() {
  const { user } = useAuth()
  return user
}