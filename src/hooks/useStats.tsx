import { logger } from '../utils/logger'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './useAuthFixed'
import { getExtendedStats } from '../services/statsService'
import { cacheService } from '../services/cacheService'

interface StatsContextType {
  stats: any
  loading: boolean
  refresh: () => void
}

const StatsContext = createContext<StatsContextType | null>(null)

export function StatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    mastered: 0,
    totalItems: 0,
    totalTopics: 0,
    streakDays: 0,
    nextDueIn: null as string | null,
    newItemsCount: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const data = await getExtendedStats(user.id)
      setStats(data)
    } catch (error) {
      logger.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = () => {
    if (user) {
      cacheService.invalidate(`stats:${user.id}`)
      fetchStats()
    }
  }

  return (
    <StatsContext.Provider value={{ stats, loading, refresh }}>
      {children}
    </StatsContext.Provider>
  )
}

export function useStats() {
  const context = useContext(StatsContext)
  if (!context) {
    throw new Error('useStats must be used within StatsProvider')
  }
  return context
}