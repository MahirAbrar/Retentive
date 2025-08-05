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

    // Check actual connectivity with Supabase
    const checkConnection = async () => {
      const online = await offlineService.checkOnlineStatus()
      setIsOnline(online)
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    // Subscribe to sync status changes
    offlineService.onSyncStatusChange((status) => {
      setIsSyncing(status.syncing)
      setSyncStatus({
        pendingOperations: status.pendingOperations,
        lastSync: status.lastSync
      })
    })

    // Get initial sync status
    const getStatus = async () => {
      const status = await offlineService.getSyncStatus()
      setSyncStatus({
        pendingOperations: status.pendingOperations,
        lastSync: status.lastSync
      })
    }
    
    getStatus()
  }, [])

  const sync = async () => {
    setIsSyncing(true)
    try {
      const result = await offlineService.syncAll()
      return result
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