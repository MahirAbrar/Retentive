import { logger } from '../utils/logger'

interface NotificationSettings {
  dailyReminder: {
    enabled: boolean
    time: string // HH:MM format
  }
  streakAlerts: boolean
  milestones: boolean
}

export class NotificationService {
  /**
   * Schedule daily study reminder
   */
  async scheduleDailyReminder(_userId: string, time: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      window.electronAPI.notifications.schedule('Daily Reminder', `Time to review your items at ${time}`, 0)
      return true
    } catch (error) {
      logger.error('Error scheduling daily reminder:', error)
      return false
    }
  }

  /**
   * Schedule streak maintenance alerts
   */
  async scheduleStreakAlerts(_userId: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      window.electronAPI.notifications.schedule('Streak Alert', 'Keep your streak alive! Review some items today.', 0)
      return true
    } catch (error) {
      logger.error('Error scheduling streak alerts:', error)
      return false
    }
  }

  /**
   * Cancel specific notification type
   */
  async cancelNotification(_type: 'daily' | 'streak' | 'all', _userId: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      window.electronAPI.notifications.cancel()
      return true
    } catch (error) {
      logger.error('Error cancelling notification:', error)
      return false
    }
  }

  /**
   * Test notification system
   */
  async sendTestNotification(): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      window.electronAPI.notifications.test()
      return true
    } catch (error) {
      logger.error('Error sending test notification:', error)
      return false
    }
  }

  /**
   * Apply notification settings
   */
  async applySettings(userId: string, settings: NotificationSettings): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      // Cancel all existing notifications first
      await this.cancelNotification('all', userId)
      
      // Schedule based on settings
      if (settings.dailyReminder.enabled) {
        await this.scheduleDailyReminder(userId, settings.dailyReminder.time)
      }
      
      if (settings.streakAlerts) {
        await this.scheduleStreakAlerts(userId)
      }
      
      return true
    } catch (error) {
      logger.error('Error applying notification settings:', error)
      return false
    }
  }

  /**
   * Listen for navigation events from notifications
   */
  setupNavigationListener(callback: (path: string) => void) {
    if (!window.electronAPI) return
    
    window.electronAPI.receive('navigate', (path: string) => {
      callback(path)
    })
  }

  /**
   * Remove navigation listener
   */
  removeNavigationListener() {
    if (!window.electronAPI) return
    
    window.electronAPI.removeAllListeners('navigate')
  }
}

// Export singleton instance
export const notificationService = new NotificationService()