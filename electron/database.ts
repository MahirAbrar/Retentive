// Consolidated database module for easier bundling
import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

// Initialize database
const dbPath = path.join(app.getPath('userData'), 'retentive.db')
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
})

// Enable foreign keys and optimize
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

// Initialize schema
export function initializeDatabase() {
  db.exec(`
    -- Users table (simplified, auth handled by Supabase)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_sync_at TEXT
    );

    -- Topics table
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      learning_mode TEXT NOT NULL CHECK (learning_mode IN ('ultracram', 'cram', 'extended', 'steady', 'test')),
      priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Learning items table
    CREATE TABLE IF NOT EXISTS learning_items (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 5,
      learning_mode TEXT NOT NULL,
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TEXT,
      next_review_at TEXT,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      deleted_at TEXT,
      FOREIGN KEY (topic_id) REFERENCES topics(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Review sessions table
    CREATE TABLE IF NOT EXISTS review_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      learning_item_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      reviewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      next_review_at TEXT NOT NULL,
      interval_days REAL NOT NULL,
      points_earned INTEGER DEFAULT 0,
      timing_bonus REAL DEFAULT 1.0,
      combo_count INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (learning_item_id) REFERENCES learning_items(id)
    );

    -- User gamification stats
    CREATE TABLE IF NOT EXISTS user_gamification_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      total_points INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_review_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Achievements table
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      points_awarded INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Daily stats table
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      points_earned INTEGER DEFAULT 0,
      reviews_completed INTEGER DEFAULT 0,
      perfect_timing_count INTEGER DEFAULT 0,
      items_mastered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'synced',
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Sync queue table
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
    CREATE INDEX IF NOT EXISTS idx_learning_items_user_id ON learning_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_learning_items_topic_id ON learning_items(topic_id);
    CREATE INDEX IF NOT EXISTS idx_learning_items_next_review ON learning_items(user_id, next_review_at);
    CREATE INDEX IF NOT EXISTS idx_review_sessions_user_id ON review_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_sessions_item_id ON review_sessions(learning_item_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
  `)

  console.log('Local database initialized')
}

// Setup all database handlers
export function setupDatabaseHandlers() {
  // Initialize database on app start
  initializeDatabase()

  // ========== TOPICS ==========
  ipcMain.handle('db:topics:getAll', async (_event, userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM topics 
      WHERE user_id = ? AND deleted_at IS NULL 
      ORDER BY created_at DESC
    `)
    return stmt.all(userId)
  })

  ipcMain.handle('db:topics:get', async (_event, id: string, userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM topics 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    return stmt.get(id, userId)
  })

  ipcMain.handle('db:topics:create', async (_event, topic: any) => {
    const id = topic.id || uuidv4()
    const stmt = db.prepare(`
      INSERT INTO topics (id, user_id, name, learning_mode, priority, sync_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `)
    
    stmt.run(id, topic.user_id, topic.name, topic.learning_mode, topic.priority)
    
    // Return the created topic
    const getStmt = db.prepare(`
      SELECT * FROM topics WHERE id = ? AND user_id = ?
    `)
    return getStmt.get(id, topic.user_id)
  })

  ipcMain.handle('db:topics:update', async (_event, id: string, updates: any, userId: string) => {
    const stmt = db.prepare(`
      UPDATE topics 
      SET name = ?, learning_mode = ?, priority = ?, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(updates.name, updates.learning_mode, updates.priority, id, userId)
    
    // Return updated topic
    const getStmt = db.prepare(`
      SELECT * FROM topics WHERE id = ? AND user_id = ?
    `)
    return getStmt.get(id, userId)
  })

  ipcMain.handle('db:topics:delete', async (_event, id: string, userId: string) => {
    const stmt = db.prepare(`
      UPDATE topics 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(id, userId)
    
    // Also soft delete all items in the topic
    const deleteItemsStmt = db.prepare(`
      UPDATE learning_items 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE topic_id = ? AND user_id = ?
    `)
    deleteItemsStmt.run(id, userId)
  })

  // ========== LEARNING ITEMS ==========
  ipcMain.handle('db:items:getAll', async (_event, userId: string, topicId?: string) => {
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
    
    const stmt = db.prepare(query)
    return stmt.all(...params)
  })

  ipcMain.handle('db:items:get', async (_event, id: string, userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM learning_items 
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `)
    return stmt.get(id, userId)
  })

  ipcMain.handle('db:items:create', async (_event, item: any) => {
    const id = item.id || uuidv4()
    const stmt = db.prepare(`
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
    
    // Return created item
    const getStmt = db.prepare(`
      SELECT * FROM learning_items WHERE id = ? AND user_id = ?
    `)
    return getStmt.get(id, item.user_id)
  })

  ipcMain.handle('db:items:update', async (_event, id: string, updates: any, userId: string) => {
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
    
    const stmt = db.prepare(`
      UPDATE learning_items 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(...values)
    
    // Return updated item
    const getStmt = db.prepare(`
      SELECT * FROM learning_items WHERE id = ? AND user_id = ?
    `)
    return getStmt.get(id, userId)
  })

  ipcMain.handle('db:items:delete', async (_event, id: string, userId: string) => {
    const stmt = db.prepare(`
      UPDATE learning_items 
      SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
      WHERE id = ? AND user_id = ?
    `)
    
    stmt.run(id, userId)
  })

  // ========== REVIEW SESSIONS ==========
  ipcMain.handle('db:reviews:create', async (_event, session: any) => {
    const id = session.id || uuidv4()
    const stmt = db.prepare(`
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
    
    return { id, ...session }
  })

  ipcMain.handle('db:reviews:getRecent', async (_event, userId: string, limit?: number) => {
    let query = `
      SELECT * FROM review_sessions 
      WHERE user_id = ? 
      ORDER BY reviewed_at DESC
    `
    if (limit) {
      query += ` LIMIT ${limit}`
    }
    
    const stmt = db.prepare(query)
    return stmt.all(userId)
  })

  // ========== GAMIFICATION ==========
  ipcMain.handle('db:gamification:getStats', async (_event, userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM user_gamification_stats WHERE user_id = ?
    `)
    return stmt.get(userId)
  })

  ipcMain.handle('db:gamification:updateStats', async (_event, userId: string, updates: any) => {
    // Check if stats exist
    const getStmt = db.prepare(`
      SELECT * FROM user_gamification_stats WHERE user_id = ?
    `)
    const existing = getStmt.get(userId)
    
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
      
      const stmt = db.prepare(`
        UPDATE user_gamification_stats 
        SET ${updateFields.join(', ')}
        WHERE user_id = ?
      `)
      
      stmt.run(...values)
    } else {
      // Create new stats
      const id = uuidv4()
      const stmt = db.prepare(`
        INSERT INTO user_gamification_stats (
          id, user_id, total_points, current_level, current_streak,
          longest_streak, last_review_date, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      
      stmt.run(
        id, userId, updates.total_points || 0, updates.current_level || 1,
        updates.current_streak || 0, updates.longest_streak || 0,
        updates.last_review_date
      )
    }
    
    return getStmt.get(userId)
  })

  // ========== ACHIEVEMENTS ==========
  ipcMain.handle('db:gamification:getAchievements', async (_event, userId: string) => {
    const stmt = db.prepare(`
      SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC
    `)
    return stmt.all(userId)
  })

  ipcMain.handle('db:gamification:unlockAchievement', async (_event, userId: string, achievementId: string, pointsAwarded: number) => {
    const id = uuidv4()
    const stmt = db.prepare(`
      INSERT INTO achievements (id, user_id, achievement_id, points_awarded, sync_status)
      VALUES (?, ?, ?, ?, 'pending')
    `)
    
    try {
      stmt.run(id, userId, achievementId, pointsAwarded)
      return true
    } catch (error) {
      // Achievement already unlocked
      return false
    }
  })

  // ========== DAILY STATS ==========
  ipcMain.handle('db:daily:getStats', async (_event, userId: string, date: string) => {
    const stmt = db.prepare(`
      SELECT * FROM daily_stats WHERE user_id = ? AND date = ?
    `)
    return stmt.get(userId, date)
  })

  ipcMain.handle('db:daily:updateStats', async (_event, userId: string, date: string, updates: any) => {
    const getStmt = db.prepare(`
      SELECT * FROM daily_stats WHERE user_id = ? AND date = ?
    `)
    const existing = getStmt.get(userId, date)
    
    if (existing) {
      const stmt = db.prepare(`
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
    } else {
      const id = uuidv4()
      const stmt = db.prepare(`
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
    }
  })

  // ========== USER ==========
  ipcMain.handle('db:user:get', async (_event, userId: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(userId)
  })

  ipcMain.handle('db:user:upsert', async (_event, user: any) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, display_name)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    stmt.run(user.id, user.email, user.display_name || user.user_metadata?.display_name)
  })

  // ========== SYNC ==========
  ipcMain.handle('db:sync:all', async (_event, userId: string) => {
    // Simplified sync - just return success for now
    return { success: true, synced: 0, failed: 0, errors: [] }
  })

  ipcMain.handle('db:sync:status', async (_event, userId: string) => {
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue
    `)
    const pending = pendingStmt.get() as { count: number }
    
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?')
    const user = userStmt.get(userId) as any
    
    return {
      pendingOperations: pending.count,
      offlineStats: {
        pendingSync: pending.count,
        totalTopics: 0,
        totalItems: 0
      },
      lastSync: user?.last_sync_at
    }
  })

  // ========== OFFLINE STATS ==========
  ipcMain.handle('db:offline:stats', async (_event, userId: string) => {
    const pendingSync = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue
    `).get() as { count: number }
    
    const topics = db.prepare(`
      SELECT COUNT(*) as count FROM topics WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as { count: number }
    
    const items = db.prepare(`
      SELECT COUNT(*) as count FROM learning_items WHERE user_id = ? AND deleted_at IS NULL
    `).get(userId) as { count: number }
    
    return {
      pendingSync: pendingSync.count,
      totalTopics: topics.count,
      totalItems: items.count
    }
  })
}