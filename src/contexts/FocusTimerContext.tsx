import { createContext, useContext } from 'react'
import { useFocusTimer } from '../hooks/useFocusTimer'
import { useAuth } from '../hooks/useAuth'

type FocusTimerContextType = ReturnType<typeof useFocusTimer> | null

const FocusTimerContext = createContext<FocusTimerContextType>(null)

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const timer = useFocusTimer(user?.id || '')

  return (
    <FocusTimerContext.Provider value={timer}>
      {children}
    </FocusTimerContext.Provider>
  )
}

export function useFocusTimerContext() {
  const context = useContext(FocusTimerContext)
  if (!context) {
    throw new Error('useFocusTimerContext must be used within a FocusTimerProvider')
  }
  return context
}
