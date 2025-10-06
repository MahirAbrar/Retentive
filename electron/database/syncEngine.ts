import { offlineDataService } from './offlineDataService'
import { supabase } from '../../src/services/supabase'
import { conflictResolver } from './conflictResolver'

export interface SyncStatus {
  syncing: boolean
  lastSync: Date | null
  pendingOperations: number
  errors: string[]
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

class SyncEngine {
  private syncing = false
  private syncListeners: Set<(status: SyncStatus) => void> = new Set()
  private lastSync: Date | null = null

  addListener(callback: (status: SyncStatus) => void) {
    this.syncListeners.add(callback)
    return () => this.syncListeners.delete(callback)
  }

  private notifyListeners() {
    const status: SyncStatus = {
      syncing: this.syncing,
      lastSync: this.lastSync,
      pendingOperations: offlineDataService.getSyncQueue().length,
      errors: []
    }
    
    this.syncListeners.forEach(callback => callback(status))
  }

  async syncAll(userId: string): Promise<SyncResult> {
    if (this.syncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] }
    }

    this.syncing = true
    this.notifyListeners()

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    }

    try {
      // 1. Ensure user exists locally
      await this.syncUser(userId)

      // 2. Pull changes from server
      await this.pullChanges(userId)

      // 3. Push local changes
      const pushResult = await this.pushChanges(userId)
      result.synced = pushResult.synced
      result.failed = pushResult.failed
      result.errors = pushResult.errors

      // 4. Update last sync time
      if (pushResult.failed === 0) {
        offlineDataService.updateUserLastSync(userId)
        this.lastSync = new Date()
      }

      result.success = pushResult.failed === 0
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
    } finally {
      this.syncing = false
      this.notifyListeners()
    }

    return result
  }

  private async syncUser(_userId: string) {
    const { data: user, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error('Failed to get user data')
    }

    if (user.user.email) {
      offlineDataService.upsertUser({
        id: user.user.id,
        email: user.user.email,
        display_name: user.user.user_metadata?.display_name
      })
    }
  }

  private async pullChanges(userId: string) {
    const user = offlineDataService.getUser(userId)
    const lastSync = user?.last_sync_at ? new Date(user.last_sync_at) : new Date(0)

    // Pull topics
    const { data: topics } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', lastSync.toISOString())

    if (topics) {
      for (const topic of topics) {
        await this.syncTopic(topic, userId)
      }
    }

    // Pull learning items
    const { data: items } = await supabase
      .from('learning_items')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', lastSync.toISOString())

    if (items) {
      for (const item of items) {
        await this.syncLearningItem(item, userId)
      }
    }

    // Pull review sessions
    const { data: sessions } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', lastSync.toISOString())

    if (sessions) {
      for (const session of sessions) {
        await this.syncReviewSession(session)
      }
    }

    // Pull gamification stats
    const { data: stats } = await supabase
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (stats) {
      await this.syncGamificationStats(stats, userId)
    }

    // Pull achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)

    if (achievements) {
      for (const achievement of achievements) {
        await this.syncAchievement(achievement, userId)
      }
    }

    // Pull daily stats
    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', lastSync.toISOString())

    if (dailyStats) {
      for (const stat of dailyStats) {
        await this.syncDailyStats(stat, userId)
      }
    }
  }

  private async syncTopic(remoteTopic: any, userId: string) {
    const localTopic = offlineDataService.getTopic(remoteTopic.id, userId)
    
    if (!localTopic) {
      // Remote topic doesn't exist locally, create it
      offlineDataService.db.prepare(`
        INSERT INTO topics (id, user_id, name, learning_mode, priority, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteTopic.id,
        remoteTopic.user_id,
        remoteTopic.name,
        remoteTopic.learning_mode,
        remoteTopic.priority,
        remoteTopic.created_at,
        remoteTopic.updated_at
      )
    } else if (localTopic.sync_status === 'synced') {
      // Local topic is synced, update with remote changes
      offlineDataService.db.prepare(`
        UPDATE topics SET name = ?, learning_mode = ?, priority = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        remoteTopic.name,
        remoteTopic.learning_mode,
        remoteTopic.priority,
        remoteTopic.updated_at,
        remoteTopic.id,
        userId
      )
    } else {
      // Conflict: both local and remote have changes
      const resolved = conflictResolver.resolveTopic(localTopic, remoteTopic)
      offlineDataService.db.prepare(`
        UPDATE topics SET name = ?, learning_mode = ?, priority = ?, updated_at = ?, sync_status = 'pending'
        WHERE id = ? AND user_id = ?
      `).run(
        resolved.name,
        resolved.learning_mode,
        resolved.priority,
        resolved.updated_at,
        resolved.id,
        userId
      )
    }
  }

  private async syncLearningItem(remoteItem: any, userId: string) {
    const localItem = offlineDataService.getLearningItem(remoteItem.id, userId)
    
    if (!localItem) {
      // Remote item doesn't exist locally
      offlineDataService.db.prepare(`
        INSERT INTO learning_items (
          id, topic_id, user_id, content, priority, learning_mode,
          review_count, last_reviewed_at, next_review_at, ease_factor,
          interval_days, created_at, updated_at, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteItem.id,
        remoteItem.topic_id,
        remoteItem.user_id,
        remoteItem.content,
        remoteItem.priority,
        remoteItem.learning_mode,
        remoteItem.review_count,
        remoteItem.last_reviewed_at,
        remoteItem.next_review_at,
        remoteItem.ease_factor,
        remoteItem.interval_days,
        remoteItem.created_at,
        remoteItem.updated_at
      )
    } else if (localItem.sync_status === 'synced') {
      // Update with remote changes
      offlineDataService.db.prepare(`
        UPDATE learning_items SET 
          content = ?, review_count = ?, last_reviewed_at = ?,
          next_review_at = ?, ease_factor = ?, interval_days = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        remoteItem.content,
        remoteItem.review_count,
        remoteItem.last_reviewed_at,
        remoteItem.next_review_at,
        remoteItem.ease_factor,
        remoteItem.interval_days,
        remoteItem.updated_at,
        remoteItem.id,
        userId
      )
    } else {
      // Conflict resolution
      const resolved = conflictResolver.resolveLearningItem(localItem, remoteItem)
      offlineDataService.updateLearningItem(resolved.id, resolved, userId)
    }
  }

  private async syncReviewSession(remoteSession: any) {
    // Review sessions are append-only, no conflicts
    const exists = offlineDataService.db.prepare(
      'SELECT id FROM review_sessions WHERE id = ?'
    ).get(remoteSession.id)
    
    if (!exists) {
      offlineDataService.db.prepare(`
        INSERT INTO review_sessions (
          id, user_id, learning_item_id, difficulty, reviewed_at,
          next_review_at, interval_days, points_earned, timing_bonus,
          combo_count, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteSession.id,
        remoteSession.user_id,
        remoteSession.learning_item_id,
        remoteSession.difficulty,
        remoteSession.reviewed_at,
        remoteSession.next_review_at,
        remoteSession.interval_days,
        remoteSession.points_earned || 0,
        remoteSession.timing_bonus || 1.0,
        remoteSession.combo_count || 0
      )
    }
  }

  private async syncGamificationStats(remoteStats: any, userId: string) {
    const localStats = offlineDataService.getGamificationStats(userId)
    
    if (!localStats) {
      // Create local stats
      offlineDataService.db.prepare(`
        INSERT INTO user_gamification_stats (
          id, user_id, total_points, current_level, current_streak,
          longest_streak, last_review_date, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteStats.id,
        userId,
        remoteStats.total_points,
        remoteStats.current_level,
        remoteStats.current_streak,
        remoteStats.longest_streak,
        remoteStats.last_review_date
      )
    } else {
      // Merge stats - take higher values
      const resolved = conflictResolver.resolveGamificationStats(localStats, remoteStats)
      offlineDataService.updateGamificationStats(userId, resolved)
    }
  }

  private async syncAchievement(remoteAchievement: any, userId: string) {
    // Achievements are append-only
    const exists = offlineDataService.db.prepare(
      'SELECT id FROM achievements WHERE user_id = ? AND achievement_id = ?'
    ).get(userId, remoteAchievement.achievement_id)
    
    if (!exists) {
      offlineDataService.db.prepare(`
        INSERT INTO achievements (
          id, user_id, achievement_id, unlocked_at, points_awarded, sync_status
        )
        VALUES (?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteAchievement.id,
        userId,
        remoteAchievement.achievement_id,
        remoteAchievement.unlocked_at,
        remoteAchievement.points_awarded
      )
    }
  }

  private async syncDailyStats(remoteStat: any, userId: string) {
    const localStat = offlineDataService.getDailyStats(userId, remoteStat.date)
    
    if (!localStat) {
      offlineDataService.db.prepare(`
        INSERT INTO daily_stats (
          id, user_id, date, points_earned, reviews_completed,
          perfect_timing_count, items_mastered, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
      `).run(
        remoteStat.id,
        userId,
        remoteStat.date,
        remoteStat.points_earned,
        remoteStat.reviews_completed,
        remoteStat.perfect_timing_count,
        remoteStat.items_mastered
      )
    } else {
      // Merge daily stats - sum the values
      const resolved = conflictResolver.resolveDailyStats(localStat, remoteStat)
      offlineDataService.db.prepare(`
        UPDATE daily_stats SET 
          points_earned = ?, reviews_completed = ?,
          perfect_timing_count = ?, items_mastered = ?
        WHERE user_id = ? AND date = ?
      `).run(
        resolved.points_earned,
        resolved.reviews_completed,
        resolved.perfect_timing_count,
        resolved.items_mastered,
        userId,
        remoteStat.date
      )
    }
  }

  private async pushChanges(_userId: string): Promise<{ synced: number, failed: number, errors: string[] }> {
    const queue = offlineDataService.getSyncQueue()
    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const operation of queue) {
      try {
        const data = JSON.parse(operation.data)
        
        switch (operation.table_name) {
          case 'topics':
            await this.pushTopic(operation, data)
            break
          case 'learning_items':
            await this.pushLearningItem(operation, data)
            break
          case 'review_sessions':
            await this.pushReviewSession(operation, data)
            break
          case 'user_gamification_stats':
            await this.pushGamificationStats(operation, data)
            break
          case 'achievements':
            await this.pushAchievement(operation, data)
            break
          case 'daily_stats':
            await this.pushDailyStats(operation, data)
            break
        }

        // Remove from queue on success
        offlineDataService.removeSyncQueueItem(operation.id)
        synced++
      } catch (error) {
        failed++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to sync ${operation.table_name}: ${errorMsg}`)
        
        // Increment retry count
        offlineDataService.incrementSyncQueueRetry(operation.id, errorMsg)
      }
    }

    return { synced, failed, errors }
  }

  private async pushTopic(operation: any, data: any) {
    switch (operation.operation_type) {
      case 'create':
        await supabase.from('topics').insert(data)
        break
      case 'update':
        await supabase.from('topics').update(data).eq('id', operation.record_id)
        break
      case 'delete':
        await supabase.from('topics').delete().eq('id', operation.record_id)
        break
    }
  }

  private async pushLearningItem(operation: any, data: any) {
    switch (operation.operation_type) {
      case 'create':
        await supabase.from('learning_items').insert(data)
        break
      case 'update':
        await supabase.from('learning_items').update(data).eq('id', operation.record_id)
        break
      case 'delete':
        await supabase.from('learning_items').delete().eq('id', operation.record_id)
        break
    }
  }

  private async pushReviewSession(operation: any, data: any) {
    if (operation.operation_type === 'create') {
      await supabase.from('review_sessions').insert(data)
    }
  }

  private async pushGamificationStats(operation: any, data: any) {
    switch (operation.operation_type) {
      case 'create':
        await supabase.from('user_gamification_stats').insert(data)
        break
      case 'update':
        await supabase.from('user_gamification_stats')
          .update(data)
          .eq('user_id', data.user_id)
        break
    }
  }

  private async pushAchievement(operation: any, data: any) {
    if (operation.operation_type === 'create') {
      await supabase.from('achievements').insert(data)
    }
  }

  private async pushDailyStats(operation: any, data: any) {
    switch (operation.operation_type) {
      case 'create':
        await supabase.from('daily_stats').insert(data)
        break
      case 'update':
        await supabase.from('daily_stats')
          .update(data)
          .eq('user_id', data.user_id)
          .eq('date', data.date)
        break
    }
  }
}

export const syncEngine = new SyncEngine()