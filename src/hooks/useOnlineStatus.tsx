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
    // Subscribe to sync status changes (only if running in Electron)
    if (window.electronAPI?.database) {
      offlineService.onSyncStatusChange((status) => {
        setIsSyncing(status.syncing)
        setSyncStatus({
          pendingOperations: status.pendingOperations,
          lastSync: status.lastSync
        })
      })
    }

    // Get initial sync status (only if running in Electron)
    const getStatus = async () => {
      try {
        // Check if we're running in Electron
        if (window.electronAPI?.database) {
          const status = await offlineService.getSyncStatus()
          setSyncStatus({
            pendingOperations: status.pendingOperations,
            lastSync: status.lastSync
          })
        }
      } catch {
        // Silently ignore errors in browser mode
        console.debug('Sync status not available in browser mode')
      }
    }
    
    getStatus()
  }, [])

  const sync = async () => {
    // Only sync if running in Electron
    if (!window.electronAPI?.database) {
      console.debug('Sync not available in browser mode')
      return { success: true, synced: 0, failed: 0 }
    }
    
    setIsSyncing(true)
    try {
      const result = await offlineService.syncAll()
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