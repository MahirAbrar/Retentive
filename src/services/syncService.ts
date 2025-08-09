import { supabase } from './supabase'
import { offlineQueue } from './offlineQueue'
import { localStorageCache } from './localStorageCache'
import type { QueuedOperation } from './offlineQueue'

class SyncService {
  private static instance: SyncService
  private isSyncing = false
  private syncCallbacks = new Set<(syncing: boolean) => void>()
  
  private constructor() {
    this.setupListeners()
  }
  
  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  private setupListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing...')
      this.syncPendingOperations()
    })
    
    window.addEventListener('offline', () => {
      console.log('Connection lost, operations will be queued')
    })
    
    // Check and sync on page load/focus
    window.addEventListener('focus', () => {
      if (navigator.onLine && offlineQueue.hasPendingOperations()) {
        this.syncPendingOperations()
      }
    })
  }

  async syncPendingOperations(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: 0, failed: 0 }
    }

    this.isSyncing = true
    this.notifySyncStatus(true)
    
    const operations = offlineQueue.getQueue()
    let success = 0
    let failed = 0
    
    for (const operation of operations) {
      try {
        await this.processOperation(operation)
        offlineQueue.removeOperation(operation.id)
        success++
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error)
        failed++
        
        // If operation is too old (> 7 days), remove it
        if (Date.now() - operation.timestamp > 7 * 24 * 60 * 60 * 1000) {
          offlineQueue.removeOperation(operation.id)
        }
      }
    }
    
    // Clear expired cache items
    localStorageCache.clearExpired()
    
    this.isSyncing = false
    this.notifySyncStatus(false)
    
    return { success, failed }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    const { type, table, data } = operation
    
    switch (type) {
      case 'create':
        if (table === 'topics') {
          const { error } = await supabase
            .from('topics')
            .insert(data)
          if (error) throw error
        } else if (table === 'learning_items') {
          const { error } = await supabase
            .from('learning_items')
            .insert(data)
          if (error) throw error
        } else if (table === 'review_sessions') {
          const { error } = await supabase
            .from('review_sessions')
            .insert(data)
          if (error) throw error
        }
        break
        
      case 'update': {
        const { id, ...updateData } = data
        
        if (table === 'topics') {
          const { error } = await supabase
            .from('topics')
            .update(updateData)
            .eq('id', id)
          if (error) throw error
        } else if (table === 'learning_items') {
          const { error } = await supabase
            .from('learning_items')
            .update(updateData)
            .eq('id', id)
          if (error) throw error
        }
        break
      }
        
      case 'delete':
        if (table === 'topics') {
          const { error } = await supabase
            .from('topics')
            .delete()
            .eq('id', data.id)
          if (error) throw error
        } else if (table === 'learning_items') {
          const { error } = await supabase
            .from('learning_items')
            .delete()
            .eq('id', data.id)
          if (error) throw error
        }
        break
    }
  }

  onSyncStatusChange(callback: (syncing: boolean) => void): () => void {
    this.syncCallbacks.add(callback)
    return () => {
      this.syncCallbacks.delete(callback)
    }
  }

  private notifySyncStatus(syncing: boolean) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(syncing)
      } catch (error) {
        console.error('Sync callback error:', error)
      }
    })
  }

  getIsSyncing(): boolean {
    return this.isSyncing
  }

  getPendingOperationsCount(): number {
    return offlineQueue.getPendingCount()
  }
}

export const syncService = SyncService.getInstance()