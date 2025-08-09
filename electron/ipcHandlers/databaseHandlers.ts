import { ipcMain, BrowserWindow } from 'electron'
import { offlineDataService } from '../database/offlineDataService'
import { syncEngine } from '../database/syncEngine'
import { localDatabase } from '../database/localDatabase'

export function setupDatabaseHandlers() {
  // Initialize database on app start
  localDatabase.initialize()

  // ========== TOPICS ==========
  ipcMain.handle('db:topics:getAll', async (_event, userId: string) => {
    return offlineDataService.getTopics(userId)
  })

  ipcMain.handle('db:topics:get', async (_event, id: string, userId: string) => {
    return offlineDataService.getTopic(id, userId)
  })

  ipcMain.handle('db:topics:create', async (_event, topic: any) => {
    return offlineDataService.createTopic(topic)
  })

  ipcMain.handle('db:topics:update', async (_event, id: string, updates: any, userId: string) => {
    return offlineDataService.updateTopic(id, updates, userId)
  })

  ipcMain.handle('db:topics:delete', async (_event, id: string, userId: string) => {
    return offlineDataService.deleteTopic(id, userId)
  })

  // ========== LEARNING ITEMS ==========
  ipcMain.handle('db:items:getAll', async (_event, userId: string, topicId?: string) => {
    return offlineDataService.getLearningItems(userId, topicId)
  })

  ipcMain.handle('db:items:get', async (_event, id: string, userId: string) => {
    return offlineDataService.getLearningItem(id, userId)
  })

  ipcMain.handle('db:items:create', async (_event, item: any) => {
    return offlineDataService.createLearningItem(item)
  })

  ipcMain.handle('db:items:update', async (_event, id: string, updates: any, userId: string) => {
    return offlineDataService.updateLearningItem(id, updates, userId)
  })

  ipcMain.handle('db:items:delete', async (_event, id: string, userId: string) => {
    return offlineDataService.deleteLearningItem(id, userId)
  })

  // ========== REVIEW SESSIONS ==========
  ipcMain.handle('db:reviews:create', async (_event, session: any) => {
    return offlineDataService.createReviewSession(session)
  })

  ipcMain.handle('db:reviews:getRecent', async (_event, userId: string, limit?: number) => {
    return offlineDataService.getReviewSessions(userId, limit)
  })

  // ========== GAMIFICATION ==========
  ipcMain.handle('db:gamification:getStats', async (_event, userId: string) => {
    return offlineDataService.getGamificationStats(userId)
  })

  ipcMain.handle('db:gamification:updateStats', async (_event, userId: string, updates: any) => {
    return offlineDataService.updateGamificationStats(userId, updates)
  })

  ipcMain.handle('db:gamification:getAchievements', async (_event, userId: string) => {
    return offlineDataService.getAchievements(userId)
  })

  ipcMain.handle('db:gamification:unlockAchievement', async (_event, userId: string, achievementId: string, points: number) => {
    return offlineDataService.unlockAchievement(userId, achievementId, points)
  })

  // ========== DAILY STATS ==========
  ipcMain.handle('db:daily:getStats', async (_event, userId: string, date: string) => {
    return offlineDataService.getDailyStats(userId, date)
  })

  ipcMain.handle('db:daily:updateStats', async (_event, userId: string, date: string, updates: any) => {
    return offlineDataService.updateDailyStats(userId, date, updates)
  })

  // ========== USER ==========
  ipcMain.handle('db:user:get', async (_event, userId: string) => {
    return offlineDataService.getUser(userId)
  })

  ipcMain.handle('db:user:upsert', async (_event, user: any) => {
    return offlineDataService.upsertUser(user)
  })

  // ========== SYNC ==========
  ipcMain.handle('db:sync:all', async (_event, userId: string) => {
    return syncEngine.syncAll(userId)
  })

  ipcMain.handle('db:sync:status', async (_event, userId: string) => {
    const stats = offlineDataService.getOfflineStats(userId)
    const queue = offlineDataService.getSyncQueue()
    
    return {
      pendingOperations: queue.length,
      offlineStats: stats,
      lastSync: offlineDataService.getUser(userId)?.last_sync_at
    }
  })

  // ========== OFFLINE STATS ==========
  ipcMain.handle('db:offline:stats', async (_event, userId: string) => {
    return offlineDataService.getOfflineStats(userId)
  })

  // Sync status listener
  syncEngine.addListener((status) => {
    // Broadcast sync status to all windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(window => {
      window.webContents.send('sync:status', status)
    })
  })
}