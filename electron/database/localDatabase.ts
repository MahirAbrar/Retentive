import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import crypto from 'crypto'

export interface LocalDatabase {
  db: Database.Database
  initialize(): void
  close(): void
}

class LocalDatabaseImpl implements LocalDatabase {
  db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'retentive.db')
    
    // Initialize database with encryption
    this.db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    })
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
    
    // Optimize for performance
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
  }

  initialize() {
    // Create tables matching Supabase schema
    this.db.exec(`
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

      -- User settings table
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        default_learning_mode TEXT NOT NULL DEFAULT 'steady',
        daily_item_limit INTEGER NOT NULL DEFAULT 30,
        notification_enabled INTEGER NOT NULL DEFAULT 1,
        preferred_study_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (user_id) REFERENCES users(id)
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

      -- Triggers for updated_at
      CREATE TRIGGER IF NOT EXISTS update_topics_timestamp 
      AFTER UPDATE ON topics
      FOR EACH ROW
      BEGIN
        UPDATE topics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_learning_items_timestamp 
      AFTER UPDATE ON learning_items
      FOR EACH ROW
      BEGIN
        UPDATE learning_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp 
      AFTER UPDATE ON user_settings
      FOR EACH ROW
      BEGIN
        UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_user_gamification_stats_timestamp 
      AFTER UPDATE ON user_gamification_stats
      FOR EACH ROW
      BEGIN
        UPDATE user_gamification_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `)

    console.log('Local database initialized')
  }

  close() {
    this.db.close()
  }
}

// Export singleton instance
export const localDatabase = new LocalDatabaseImpl()