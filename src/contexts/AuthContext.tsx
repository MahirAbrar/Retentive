import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import type { User } from '../types/database'
import { Loading } from '../components/ui'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
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
    authService.getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    const subscription = authService.onAuthStateChange((newUser) => {
      setUser(prev => {
        if (prev?.id === newUser?.id && prev?.email === newUser?.email) {
          return prev // same user, keep stable reference
        }
        return newUser
      })
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

  const signInWithGoogle = useCallback(async () => {
    return authService.signInWithGoogle()
  }, [])

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

  const contextValue = useMemo(() => ({
    user, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword
  }), [user, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword])

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
