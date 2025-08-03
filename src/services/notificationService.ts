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
  async scheduleDailyReminder(userId: string, time: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      return await window.electronAPI.notifications.schedule('daily', { userId, time })
    } catch (error) {
      console.error('Error scheduling daily reminder:', error)
      return false
    }
  }

  /**
   * Schedule streak maintenance alerts
   */
  async scheduleStreakAlerts(userId: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      return await window.electronAPI.notifications.schedule('streak', { userId })
    } catch (error) {
      console.error('Error scheduling streak alerts:', error)
      return false
    }
  }

  /**
   * Cancel specific notification type
   */
  async cancelNotification(type: 'daily' | 'streak' | 'all', userId: string): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      return await window.electronAPI.notifications.cancel(type, userId)
    } catch (error) {
      console.error('Error cancelling notification:', error)
      return false
    }
  }

  /**
   * Test notification system
   */
  async sendTestNotification(): Promise<boolean> {
    if (!window.electronAPI) return false
    
    try {
      return await window.electronAPI.notifications.test()
    } catch (error) {
      console.error('Error sending test notification:', error)
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
      console.error('Error applying notification settings:', error)
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