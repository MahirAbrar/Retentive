import { Notification, app, BrowserWindow } from 'electron'
import schedule from 'node-schedule'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ScheduledJob {
  job: schedule.Job
  type: 'daily' | 'streak'
  userId: string
}

export class NotificationService {
  private jobs: Map<string, ScheduledJob> = new Map()
  private mainWindow: BrowserWindow | null = null
  private supabaseUrl: string
  private supabaseKey: string

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Send a native OS notification
   */
  sendNotification(title: string, body: string, onClick?: () => void) {
    if (!Notification.isSupported()) {
      console.warn('Notifications not supported on this system')
      return
    }

    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../build/icon.png'),
      silent: false,
      timeoutType: 'default'
    })

    if (onClick) {
      notification.on('click', () => {
        // Bring app to foreground if minimized
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore()
          }
          this.mainWindow.focus()
        }
        onClick()
      })
    }

    notification.show()
  }

  /**
   * Schedule daily study reminder
   * @param time Format: "HH:MM" e.g., "19:00" for 7 PM
   */
  scheduleDailyReminder(userId: string, time: string) {
    const jobKey = `daily-${userId}`
    
    // Cancel existing job if any
    this.cancelJob(jobKey)

    // Parse time
    const [hour, minute] = time.split(':').map(Number)
    
    // Create cron expression for daily at specified time
    const cronExpression = `${minute} ${hour} * * *`
    
    const job = schedule.scheduleJob(cronExpression, async () => {
      await this.checkAndSendStudyReminder(userId)
    })

    if (job) {
      this.jobs.set(jobKey, { job, type: 'daily', userId })
      console.log(`Scheduled daily reminder for user ${userId} at ${time}`)
    }
  }

  /**
   * Schedule streak check every hour
   */
  scheduleStreakCheck(userId: string) {
    const jobKey = `streak-${userId}`
    
    // Cancel existing job if any
    this.cancelJob(jobKey)

    // Run every hour at :00
    const job = schedule.scheduleJob('0 * * * *', async () => {
      await this.checkStreakStatus(userId)
    })

    if (job) {
      this.jobs.set(jobKey, { job, type: 'streak', userId })
      console.log(`Scheduled streak check for user ${userId}`)
    }
  }

  /**
   * Check if user has items due and send reminder
   */
  private async checkAndSendStudyReminder(userId: string) {
    try {
      // Query Supabase for due items
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/learning_items?user_id=eq.${userId}&next_review_at=lte.now()&review_count=gt.0`,
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      )

      if (!response.ok) return

      const dueItems = await response.json()
      
      if (dueItems.length > 0) {
        // Get topic names for the notification
        const topicIds = [...new Set(dueItems.map((item: any) => item.topic_id))]
        
        const topicsResponse = await fetch(
          `${this.supabaseUrl}/rest/v1/topics?id=in.(${topicIds.join(',')})`,
          {
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`
            }
          }
        )

        const topics = await topicsResponse.json()
        const topicNames = topics.map((t: any) => t.name).slice(0, 3).join(', ')
        const moreText = topics.length > 3 ? ` and ${topics.length - 3} more` : ''

        this.sendNotification(
          'Study Reminder',
          `Your review from topic${topics.length > 1 ? 's' : ''} ${topicNames}${moreText} is due now`,
          () => {
            // Navigate to topics page when clicked
            this.mainWindow?.webContents.send('navigate', '/topics')
          }
        )
      }
    } catch (error) {
      console.error('Error checking study reminders:', error)
    }
  }

  /**
   * Check if streak is about to end
   */
  private async checkStreakStatus(userId: string) {
    try {
      // Get today's review sessions
      const today = new Date()
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/review_sessions?user_id=eq.${userId}&reviewed_at=gte.${todayStart}`,
        {
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
          }
        }
      )

      if (!response.ok) return

      const todayReviews = await response.json()
      
      // If no reviews today and it's after 8 PM (within 4 hours of midnight)
      const now = new Date()
      const hoursUntilMidnight = 24 - now.getHours()
      
      if (todayReviews.length === 0 && hoursUntilMidnight <= 4) {
        this.sendNotification(
          'Streak Warning!',
          `Your daily streak will end in ${hoursUntilMidnight} hours, study now to maintain it!`,
          () => {
            // Navigate to home/dashboard when clicked
            this.mainWindow?.webContents.send('navigate', '/')
          }
        )
      }
    } catch (error) {
      console.error('Error checking streak status:', error)
    }
  }

  /**
   * Cancel a scheduled job
   */
  cancelJob(jobKey: string) {
    const scheduledJob = this.jobs.get(jobKey)
    if (scheduledJob) {
      scheduledJob.job.cancel()
      this.jobs.delete(jobKey)
      console.log(`Cancelled job: ${jobKey}`)
    }
  }

  /**
   * Cancel all jobs for a user
   */
  cancelUserJobs(userId: string) {
    for (const [key, scheduledJob] of this.jobs.entries()) {
      if (scheduledJob.userId === userId) {
        scheduledJob.job.cancel()
        this.jobs.delete(key)
      }
    }
  }

  /**
   * Cancel all jobs
   */
  cancelAllJobs() {
    for (const [key, scheduledJob] of this.jobs.entries()) {
      scheduledJob.job.cancel()
    }
    this.jobs.clear()
  }
}