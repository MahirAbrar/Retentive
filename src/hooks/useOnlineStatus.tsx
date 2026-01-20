import { useState, useEffect } from 'react'
import { offlineService } from '../services/offlineService'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{
    pendingOperations: number
    lastSync: string | null
  }>({
    pendingOperations: 0,
    lastSync: null
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection once on mount to ensure accurate initial state
    const checkConnection = async () => {
      const online = await offlineService.checkOnlineStatus()
      setIsOnline(online)
    }
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const sync = async () => {
    // In PWA mode, data is always synced via Supabase
    // This is a no-op but kept for API compatibility
    setIsSyncing(true)
    try {
      const result = await offlineService.syncAll()
      setSyncStatus({
        pendingOperations: 0,
        lastSync: new Date().toISOString()
      })
      return result
    } catch (error) {
      console.error('Sync failed:', error)
      return { success: false, synced: 0, failed: 0 }
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isOnline,
    isSyncing,
    syncStatus,
    sync
  }
}
