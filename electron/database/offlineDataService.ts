import { localDatabase } from './localDatabase'
import { v4 as uuidv4 } from 'uuid'
import type { Database } from 'better-sqlite3'

export interface OfflineOperation {
  type: 'create' | 'update' | 'delete'
  table: string
  data: any
  id: string
}

export class OfflineDataService {
  private db: Database

  constructor() {
    this.db = localDatabase.db
  }

  // ========== TOPICS ==========
  getTopics(userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM topics 
      WHERE user_id = ? AND deleted_at IS NULL 
      ORDER BY created_at DESC
    `)
    return stmt.all(userId)
  }

  getTopic(id: string, userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM topics 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    return stmt.get(id, userId)
  }

  createTopic(topic: any) {
    const id = topic.id || uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO topics (id, user_id, name, learning_mode, priority, sync_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `)
    
    stmt.run(id, topic.user_id, topic.name, topic.learning_mode, topic.priority)
    
    // Add to sync queue
    this.addToSyncQueue('create', 'topics', id, topic)
    
    return this.getTopic(id, topic.user_id)
  }

  updateTopic(id: string, updates: any, userId: string) {
    const stmt = this.db.prepare(`
      UPDATE topics 
      SET name = ?, learning_mode = ?, priority = ?, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(updates.name, updates.learning_mode, updates.priority, id, userId)
    
    // Add to sync queue
    this.addToSyncQueue('update', 'topics', id, updates)
    
    return this.getTopic(id, userId)
  }

  deleteTopic(id: string, userId: string) {
    const stmt = this.db.prepare(`
      UPDATE topics 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(id, userId)
    
    // Also soft delete all items in the topic
    const deleteItemsStmt = this.db.prepare(`
      UPDATE learning_items 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE topic_id = ? AND user_id = ?
    `)
    deleteItemsStmt.run(id, userId)
    
    // Add to sync queue
    this.addToSyncQueue('delete', 'topics', id, { id })
  }

  // ========== LEARNING ITEMS ==========
  getLearningItems(userId: string, topicId?: string) {
    let query = `
      SELECT li.*, t.name as topic_name, t.priority as topic_priority 
      FROM learning_items li
      JOIN topics t ON li.topic_id = t.id
      WHERE li.user_id = ? AND li.deleted_at IS NULL
    `
    const params: any[] = [userId]
    
    if (topicId) {
      query += ' AND li.topic_id = ?'
      params.push(topicId)
    }
    
    query += ' ORDER BY li.next_review_at ASC, li.priority DESC'
    
    const stmt = this.db.prepare(query)
    return stmt.all(...params)
  }

  getLearningItem(id: string, userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM learning_items 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    return stmt.get(id, userId)
  }

  createLearningItem(item: any) {
    const id = item.id || uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO learning_items (
        id, topic_id, user_id, content, priority, learning_mode,
        review_count, ease_factor, interval_days, sync_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)
    
    stmt.run(
      id, item.topic_id, item.user_id, item.content, 
      item.priority, item.learning_mode, 0, 2.5, 0
    )
    
    // Add to sync queue
    this.addToSyncQueue('create', 'learning_items', id, item)
    
    return this.getLearningItem(id, item.user_id)
  }

  updateLearningItem(id: string, updates: any, userId: string) {
    const updateFields = []
    const values = []
    
    if (updates.content !== undefined) {
      updateFields.push('content = ?')
      values.push(updates.content)
    }
    if (updates.review_count !== undefined) {
      updateFields.push('review_count = ?')
      values.push(updates.review_count)
    }
    if (updates.last_reviewed_at !== undefined) {
      updateFields.push('last_reviewed_at = ?')
      values.push(updates.last_reviewed_at)
    }
    if (updates.next_review_at !== undefined) {
      updateFields.push('next_review_at = ?')
      values.push(updates.next_review_at)
    }
    if (updates.ease_factor !== undefined) {
      updateFields.push('ease_factor = ?')
      values.push(updates.ease_factor)
    }
    if (updates.interval_days !== undefined) {
      updateFields.push('interval_days = ?')
      values.push(updates.interval_days)
    }
    
    updateFields.push('sync_status = ?')
    values.push('pending')
    
    values.push(id, userId)
    
    const stmt = this.db.prepare(`
      UPDATE learning_items 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(...values)
    
    // Add to sync queue
    this.addToSyncQueue('update', 'learning_items', id, updates)
    
    return this.getLearningItem(id, userId)
  }

  deleteLearningItem(id: string, userId: string) {
    const stmt = this.db.prepare(`
      UPDATE learning_items 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(id, userId)
    
    // Add to sync queue
    this.addToSyncQueue('delete', 'learning_items', id, { id })
  }

  // ========== REVIEW SESSIONS ==========
  createReviewSession(session: any) {
    const id = session.id || uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO review_sessions (
        id, user_id, learning_item_id, difficulty, reviewed_at,
        next_review_at, interval_days, points_earned, timing_bonus,
        combo_count, sync_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)
    
    stmt.run(
      id, session.user_id, session.learning_item_id, session.difficulty,
      session.reviewed_at, session.next_review_at, session.interval_days,
      session.points_earned || 0, session.timing_bonus || 1.0,
      session.combo_count || 0
    )
    
    // Add to sync queue
    this.addToSyncQueue('create', 'review_sessions', id, session)
    
    return { id, ...session }
  }

  getReviewSessions(userId: string, limit?: number) {
    let query = `
      SELECT * FROM review_sessions 
      WHERE user_id = ? 
      ORDER BY reviewed_at DESC
    `
    if (limit) {
      query += ` LIMIT ${limit}`
    }
    
    const stmt = this.db.prepare(query)
    return stmt.all(userId)
  }

  // ========== GAMIFICATION ==========
  getGamificationStats(userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM user_gamification_stats WHERE user_id = ?
    `)
    return stmt.get(userId)
  }

  updateGamificationStats(userId: string, updates: any) {
    // Check if stats exist
    const existing = this.getGamificationStats(userId)
    
    if (existing) {
      const updateFields = []
      const values = []
      
      if (updates.total_points !== undefined) {
        updateFields.push('total_points = ?')
        values.push(updates.total_points)
      }
      if (updates.current_level !== undefined) {
        updateFields.push('current_level = ?')
        values.push(updates.current_level)
      }
      if (updates.current_streak !== undefined) {
        updateFields.push('current_streak = ?')
        values.push(updates.current_streak)
      }
      if (updates.longest_streak !== undefined) {
        updateFields.push('longest_streak = ?')
        values.push(updates.longest_streak)
      }
      if (updates.last_review_date !== undefined) {
        updateFields.push('last_review_date = ?')
        values.push(updates.last_review_date)
      }
      
      updateFields.push('sync_status = ?')
      values.push('pending')
      
      values.push(userId)
      
      const stmt = this.db.prepare(`
        UPDATE user_gamification_stats 
        SET ${updateFields.join(', ')}
        WHERE user_id = ?
      `)
      
      stmt.run(...values)
      
      // Add to sync queue
      this.addToSyncQueue('update', 'user_gamification_stats', existing.id, updates)
    } else {
      // Create new stats
      const id = uuidv4()
      const stmt = this.db.prepare(`
        INSERT INTO user_gamification_stats (
          id, user_id, total_points, current_level, current_streak,
          longest_streak, last_review_date, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      
      stmt.run(
        id, userId, updates.total_points || 0, updates.current_level || 1,
        updates.current_streak || 0, updates.longest_streak || 0,
        updates.last_review_date, 'pending'
      )
      
      // Add to sync queue
      this.addToSyncQueue('create', 'user_gamification_stats', id, { ...updates, user_id: userId })
    }
    
    return this.getGamificationStats(userId)
  }

  // ========== ACHIEVEMENTS ==========
  getAchievements(userId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC
    `)
    return stmt.all(userId)
  }

  unlockAchievement(userId: string, achievementId: string, pointsAwarded: number) {
    const id = uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO achievements (id, user_id, achievement_id, points_awarded, sync_status)
      VALUES (?, ?, ?, ?, 'pending')
    `)
    
    try {
      stmt.run(id, userId, achievementId, pointsAwarded)
      
      // Add to sync queue
      this.addToSyncQueue('create', 'achievements', id, {
        user_id: userId,
        achievement_id: achievementId,
        points_awarded: pointsAwarded
      })
      
      return true
    } catch (_error) {
      // Achievement already unlocked
      return false
    }
  }

  // ========== DAILY STATS ==========
  getDailyStats(userId: string, date: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM daily_stats WHERE user_id = ? AND date = ?
    `)
    return stmt.get(userId, date)
  }

  updateDailyStats(userId: string, date: string, updates: any) {
    const existing = this.getDailyStats(userId, date)
    
    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE daily_stats 
        SET points_earned = points_earned + ?,
            reviews_completed = reviews_completed + ?,
            perfect_timing_count = perfect_timing_count + ?,
            items_mastered = items_mastered + ?,
            sync_status = 'pending'
        WHERE user_id = ? AND date = ?
      `)
      
      stmt.run(
        updates.points_earned || 0,
        updates.reviews_completed || 0,
        updates.perfect_timing_count || 0,
        updates.items_mastered || 0,
        userId, date
      )
      
      // Add to sync queue
      this.addToSyncQueue('update', 'daily_stats', existing.id, updates)
    } else {
      const id = uuidv4()
      const stmt = this.db.prepare(`
        INSERT INTO daily_stats (
          id, user_id, date, points_earned, reviews_completed,
          perfect_timing_count, items_mastered, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      
      stmt.run(
        id, userId, date,
        updates.points_earned || 0,
        updates.reviews_completed || 0,
        updates.perfect_timing_count || 0,
        updates.items_mastered || 0
      )
      
      // Add to sync queue
      this.addToSyncQueue('create', 'daily_stats', id, { ...updates, user_id: userId, date })
    }
  }

  // ========== SYNC QUEUE ==========
  private addToSyncQueue(operation: string, table: string, recordId: string, data: any) {
    const id = uuidv4()
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (id, operation_type, table_name, record_id, data)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, operation, table, recordId, JSON.stringify(data))
  }

  getSyncQueue() {
    const stmt = this.db.prepare(`
      SELECT * FROM sync_queue ORDER BY created_at ASC
    `)
    return stmt.all()
  }

  removeSyncQueueItem(id: string) {
    const stmt = this.db.prepare('DELETE FROM sync_queue WHERE id = ?')
    stmt.run(id)
  }

  incrementSyncQueueRetry(id: string, error: string) {
    const stmt = this.db.prepare(`
      UPDATE sync_queue 
      SET retry_count = retry_count + 1, last_error = ?
      WHERE id = ?
    `)
    stmt.run(error, id)
  }

  // ========== USER MANAGEMENT ==========
  getUser(userId: string) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(userId)
  }

  upsertUser(user: any) {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, display_name)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    stmt.run(user.id, user.email, user.display_name || user.user_metadata?.display_name)
  }

  updateUserLastSync(userId: string) {
    const stmt = this.db.prepare(`
      UPDATE users SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?
    `)
    stmt.run(userId)
  }

  // ========== BULK OPERATIONS ==========
  markAllAsSynced(table: string, ids: string[]) {
    if (ids.length === 0) return
    
    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      UPDATE ${table} SET sync_status = 'synced' WHERE id IN (${placeholders})
    `)
    stmt.run(...ids)
  }

  // ========== STATS ==========
  getOfflineStats(userId: string) {
    const pendingSync = this.db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue
    `).get() as { count: number }
    
    const topics = this.db.prepare(`
      SELECT COUNT(*) as count FROM topics WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as { count: number }
    
    const items = this.db.prepare(`
      SELECT COUNT(*) as count FROM learning_items WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as { count: number }
    
    return {
      pendingSync: pendingSync.count,
      totalTopics: topics.count,
      totalItems: items.count
    }
  }
}

export const offlineDataService = new OfflineDataService()