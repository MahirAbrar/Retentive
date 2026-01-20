import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { AchievementNotificationContainer } from '../components/gamification/AchievementNotification'

interface AchievementContextType {
  showAchievements: (achievementIds: string[]) => void
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined)

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<string[]>([])
  
  const showAchievements = useCallback((achievementIds: string[]) => {
    if (achievementIds.length > 0) {
      setAchievements(achievementIds)
    }
  }, [])
  
  const clearAchievements = useCallback(() => {
    setAchievements([])
  }, [])
  
  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    showAchievements
  }), [showAchievements])

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}
      <AchievementNotificationContainer
        achievements={achievements}
        onClear={clearAchievements}
      />
    </AchievementContext.Provider>
  )
}

export function useAchievements() {
  const context = useContext(AchievementContext)
  if (!context) {
    throw new Error('useAchievements must be used within AchievementProvider')
  }
  return context
}