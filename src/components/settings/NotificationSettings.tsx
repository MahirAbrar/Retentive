import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Button } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'
import { notificationService } from '../../services/notificationService'
import { useToast } from '../ui/Toast'

interface NotificationSettings {
  dailyReminder: {
    enabled: boolean
    time: string
  }
  streakAlerts: boolean
  milestones: boolean
}

export function NotificationSettings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminder: {
      enabled: true,
      time: '19:00'
    },
    streakAlerts: true,
    milestones: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load settings from secure storage
    loadSettings()
  }, [])

  useEffect(() => {
    // Set up navigation listener for notification clicks
    if (user) {
      notificationService.setupNavigationListener((path) => {
        // Use React Router to navigate
        window.location.href = path
      })
    }

    return () => {
      notificationService.removeNavigationListener()
    }
  }, [user])

  const loadSettings = async () => {
    if (!window.electronAPI) return

    try {
      const saved = await window.electronAPI.secureStorage.get('notificationSettings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Save settings to secure storage
      await window.electronAPI.secureStorage.set(
        'notificationSettings',
        JSON.stringify(settings)
      )

      // Apply settings
      const success = await notificationService.applySettings(user.id, settings)
      
      if (success) {
        addToast('success', 'Notification settings saved')
      } else {
        addToast('error', 'Failed to save notification settings')
      }
    } catch (error) {
      addToast('error', 'Error saving notification settings')
      console.error('Error saving notification settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    const success = await notificationService.sendTestNotification()
    if (success) {
      addToast('success', 'Test notification sent!')
    } else {
      addToast('error', 'Failed to send test notification')
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="h4">Notification Settings</h3>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Daily Study Reminder */}
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={settings.dailyReminder.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  dailyReminder: {
                    ...settings.dailyReminder,
                    enabled: e.target.checked
                  }
                })}
                style={{ cursor: 'pointer' }}
              />
              <span className="body">Enable daily study reminders</span>
            </label>
            
            {settings.dailyReminder.enabled && (
              <div style={{ marginLeft: '1.5rem' }}>
                <label className="body-small text-secondary">
                  Reminder time:
                  <input
                    type="time"
                    value={settings.dailyReminder.time}
                    onChange={(e) => setSettings({
                      ...settings,
                      dailyReminder: {
                        ...settings.dailyReminder,
                        time: e.target.value
                      }
                    })}
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-gray-300)'
                    }}
                  />
                </label>
                <p className="body-small text-secondary" style={{ marginTop: '0.25rem' }}>
                  You'll receive a notification if you have items due for review
                </p>
              </div>
            )}
          </div>

          {/* Streak Alerts */}
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={settings.streakAlerts}
                onChange={(e) => setSettings({
                  ...settings,
                  streakAlerts: e.target.checked
                })}
                style={{ cursor: 'pointer' }}
              />
              <span className="body">Streak maintenance alerts</span>
            </label>
            <p className="body-small text-secondary" style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              Get notified 4 hours before your daily streak ends
            </p>
          </div>

          {/* Milestone Celebrations */}
          <div>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={settings.milestones}
                onChange={(e) => setSettings({
                  ...settings,
                  milestones: e.target.checked
                })}
                style={{ cursor: 'pointer' }}
              />
              <span className="body">Milestone celebrations</span>
            </label>
            <p className="body-small text-secondary" style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              Celebrate achievements like mastering topics and maintaining streaks
            </p>
          </div>

          <div style={{ 
            borderTop: '1px solid var(--color-gray-200)', 
            paddingTop: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <Button 
              variant="primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={handleTestNotification}
            >
              Test Notification
            </Button>
            
            {settings.dailyReminder.enabled && (
              <>
                <Button 
                  variant="ghost" 
                  onClick={async () => {
                    if (!user) return
                    
                    const success = await window.electronAPI.notifications.testDaily(user.id)
                    if (success) {
                      addToast('info', 'Daily reminder test triggered - check if you have due items')
                    } else {
                      addToast('error', 'Failed to test daily reminder - check console')
                    }
                  }}
                >
                  Test Daily Now
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={async () => {
                    // Set the time to 1 minute from now for testing
                    const now = new Date()
                    now.setMinutes(now.getMinutes() + 1)
                    const testTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
                    
                    await window.electronAPI.notifications.schedule('daily', { 
                      userId: user?.id, 
                      time: testTime 
                    })
                    
                    addToast('info', `Daily reminder scheduled for ${testTime} (in 1 minute)`)
                  }}
                >
                  Schedule (1 min)
                </Button>
              </>
            )}
            
            <Button 
              variant="ghost" 
              onClick={async () => {
                if (!user) return
                
                // Schedule a test notification for 10 seconds from now
                const testDueAt = new Date(Date.now() + 10000).toISOString()
                const success = await window.electronAPI.notifications.schedule('item-due', {
                  userId: user.id,
                  itemId: 'test-item-' + Date.now(),
                  itemContent: 'This is a test notification item',
                  topicName: 'Test Topic',
                  topicId: 'test-topic',
                  dueAt: testDueAt
                })
                
                if (success) {
                  addToast('success', 'Test due notification scheduled for 10 seconds from now')
                } else {
                  addToast('error', 'Failed to schedule test notification')
                }
              }}
            >
              Test Due (10s)
            </Button>
            
            <p className="body-small text-secondary">
              Notifications require the app to be running
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}