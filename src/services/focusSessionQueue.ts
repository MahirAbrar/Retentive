/**
 * Offline queue for pending focus session completions
 *
 * When internet goes away during session end, we queue the completion
 * and sync it when connection returns.
 */

const QUEUE_KEY = 'focus-session-pending-completions'

export interface PendingSessionCompletion {
  sessionId: string
  userId: string
  finalStats: {
    totalWorkMinutes: number
    totalBreakMinutes: number
    adherencePercentage: number
    isIncomplete?: boolean
    pointsEarned?: number
    pointsPenalty?: number
  }
  queuedAt: number
}

class FocusSessionQueue {
  private static instance: FocusSessionQueue
  private isProcessing = false

  static getInstance(): FocusSessionQueue {
    if (!FocusSessionQueue.instance) {
      FocusSessionQueue.instance = new FocusSessionQueue()
    }
    return FocusSessionQueue.instance
  }

  /**
   * Add a session completion to the queue
   */
  enqueue(completion: Omit<PendingSessionCompletion, 'queuedAt'>): void {
    const queue = this.getQueue()

    // Avoid duplicates
    const exists = queue.some(item => item.sessionId === completion.sessionId)
    if (exists) {
      return
    }

    queue.push({
      ...completion,
      queuedAt: Date.now()
    })

    this.saveQueue(queue)
    console.log('[FocusSessionQueue] Queued session completion:', completion.sessionId)
  }

  /**
   * Get all pending completions
   */
  getQueue(): PendingSessionCompletion[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: PendingSessionCompletion[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }

  /**
   * Remove a session from the queue
   */
  dequeue(sessionId: string): void {
    const queue = this.getQueue()
    const filtered = queue.filter(item => item.sessionId !== sessionId)
    this.saveQueue(filtered)
  }

  /**
   * Check if there are pending completions
   */
  hasPending(): boolean {
    return this.getQueue().length > 0
  }

  /**
   * Get count of pending completions
   */
  getPendingCount(): number {
    return this.getQueue().length
  }

  /**
   * Process all pending completions
   * Returns number of successfully processed items
   */
  async processQueue(
    endSessionFn: (
      sessionId: string,
      userId: string,
      finalStats: PendingSessionCompletion['finalStats']
    ) => Promise<void>
  ): Promise<number> {
    if (this.isProcessing) {
      console.log('[FocusSessionQueue] Already processing queue')
      return 0
    }

    if (!navigator.onLine) {
      console.log('[FocusSessionQueue] Offline, skipping queue processing')
      return 0
    }

    const queue = this.getQueue()
    if (queue.length === 0) {
      return 0
    }

    this.isProcessing = true
    let processed = 0

    console.log(`[FocusSessionQueue] Processing ${queue.length} pending completions`)

    for (const item of queue) {
      try {
        await endSessionFn(item.sessionId, item.userId, item.finalStats)
        this.dequeue(item.sessionId)
        processed++
        console.log('[FocusSessionQueue] Successfully processed:', item.sessionId)
      } catch (error) {
        // If it fails again, leave it in the queue
        console.error('[FocusSessionQueue] Failed to process:', item.sessionId, error)

        // If session is too old (>24 hours), remove it to prevent infinite retries
        const ageHours = (Date.now() - item.queuedAt) / (1000 * 60 * 60)
        if (ageHours > 24) {
          console.log('[FocusSessionQueue] Removing stale session (>24h):', item.sessionId)
          this.dequeue(item.sessionId)
        }
      }
    }

    this.isProcessing = false
    return processed
  }

  /**
   * Clear the entire queue (use with caution)
   */
  clear(): void {
    localStorage.removeItem(QUEUE_KEY)
  }
}

export const focusSessionQueue = FocusSessionQueue.getInstance()
