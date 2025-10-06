import { Notification, BrowserWindow } from 'electron'
import schedule from 'node-schedule'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ScheduledJob {
  job: schedule.Job
  type: 'daily' | 'streak' | 'item-due'
  userId: string
  itemId?: string
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
    console.log('Attempting to send notification:', { title, body })
    
    if (!Notification.isSupported()) {
      console.warn('Notifications not supported on this system')
      return
    }

    const notification = new Notification({
      title,
      body,
      // Icon is optional - remove it if it doesn't exist
      silent: false,
      timeoutType: 'default'
    })

    notification.on('show', () => {
      console.log('Notification shown successfully')
    })

    notification.on('error', (error) => {
      console.error('Notification error:', error)
    })

    if (onClick) {
      notification.on('click', () => {
        console.log('Notification clicked')
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
    
    console.log(`Scheduling daily reminder: ${cronExpression} (${time})`)
    
    const job = schedule.scheduleJob(cronExpression, async () => {
      console.log('Daily reminder triggered!')
      await this.checkAndSendStudyReminder(userId)
    })

    if (job) {
      this.jobs.set(jobKey, { job, type: 'daily', userId })
      console.log(`✅ Scheduled daily reminder for user ${userId} at ${time}`)
      
      // Show next scheduled time
      const nextInvocation = job.nextInvocation()
      console.log(`Next reminder will be at: ${nextInvocation}`)
    } else {
      console.error('❌ Failed to schedule daily reminder')
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
   * Schedule notification for when an item becomes due
   * @param userId User ID
   * @param itemId Learning item ID
   * @param itemContent Content of the item for the notification
   * @param topicName Name of the topic
   * @param topicId Topic ID for navigation
   * @param dueAt When the item is due
   */
  scheduleItemDueNotification(
    userId: string, 
    itemId: string, 
    itemContent: string, 
    topicName: string,
    topicId: string,
    dueAt: string
  ) {
    const jobKey = `item-${itemId}`
    
    // Cancel existing notification for this item if any
    this.cancelJob(jobKey)

    const dueDate = new Date(dueAt)
    const now = new Date()
    
    // Don't schedule if already past due
    if (dueDate <= now) {
      console.log(`Item ${itemId} is already due, not scheduling notification`)
      return
    }

    console.log(`Scheduling due notification for item ${itemId} at ${dueAt}`)
    
    const job = schedule.scheduleJob(dueDate, () => {
      console.log(`Due notification triggered for item ${itemId}`)
      
      // Truncate content if too long
      const truncatedContent = itemContent.length > 50 
        ? itemContent.substring(0, 50) + '...' 
        : itemContent
      
      this.sendNotification(
        `Review Due: ${topicName}`,
        `Time to review: "${truncatedContent}"`,
        () => {
          // Navigate to the specific topic when clicked
          if (this.mainWindow) {
            this.mainWindow.webContents.send('navigate', `/topics?id=${topicId}`)
          }
        }
      )
      
      // Clean up the job after it runs
      this.jobs.delete(jobKey)
    })

    if (job) {
      this.jobs.set(jobKey, { job, type: 'item-due', userId, itemId })
      console.log(`✅ Scheduled due notification for item ${itemId} at ${dueAt}`)
      
      // Log next invocation for debugging
      const nextInvocation = job.nextInvocation()
      console.log(`Item will be due at: ${nextInvocation}`)
    } else {
      console.error(`❌ Failed to schedule due notification for item ${itemId}`)
    }
  }

  /**
   * Cancel notification for a specific item
   */
  cancelItemNotification(itemId: string) {
    const jobKey = `item-${itemId}`
    this.cancelJob(jobKey)
  }

  /**
   * Check if user has items due and send reminder
   * Made public for testing purposes
   */
  public async checkAndSendStudyReminder(userId: string) {
    console.log(`Checking study reminder for user: ${userId}`)
    try {
      // Query Supabase for due items
      const url = `${this.supabaseUrl}/rest/v1/learning_items?user_id=eq.${userId}&next_review_at=lte.now()&review_count=gt.0`
      console.log('Fetching due items from:', url)
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch due items:', response.status, response.statusText)
        return
      }

      const dueItems = await response.json()
      console.log(`Found ${dueItems.length} due items`)
      
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
          `You have ${dueItems.length} item${dueItems.length > 1 ? 's' : ''} due for review in: ${topicNames}${moreText}`,
          () => {
            // Navigate to topics page when clicked
            this.mainWindow?.webContents.send('navigate', '/topics')
          }
        )
      } else {
        console.log('No due items found - sending status notification for testing')
        // For testing, send a notification even when no items are due
        this.sendNotification(
          'Study Status',
          'Great job! You have no items due for review right now. 🎉'
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
    for (const [_key, scheduledJob] of this.jobs.entries()) {
      scheduledJob.job.cancel()
    }
    this.jobs.clear()
  }
}