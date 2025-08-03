interface QueuedOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data?: any
  timestamp: number
}

class OfflineQueue {
  private queue: QueuedOperation[] = []
  private readonly STORAGE_KEY = 'retentive_offline_queue'

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  addOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>) {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    this.queue.push(queuedOp)
    this.saveToStorage()
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue]
  }

  removeOperation(id: string) {
    this.queue = this.queue.filter(op => op.id !== id)
    this.saveToStorage()
  }

  clear() {
    this.queue = []
    this.saveToStorage()
  }

  hasPendingOperations(): boolean {
    return this.queue.length > 0
  }

  getPendingCount(): number {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueue()
export type { QueuedOperation }