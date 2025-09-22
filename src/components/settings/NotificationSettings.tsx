import { logger } from '../../utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent, Button } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'
import { notificationService } from '../../services/notificationService'
import { useToast } from '../ui/Toast'
import { CheckCircle } from 'lucide-react'

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
  const isElectron = !!window.electronAPI
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminder: {
      enabled: true,
      time: '19:00'
    },
    streakAlerts: true,
    milestones: true
  })
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return

    try {
      const saved = await window.electronAPI.secureStorage.get('notificationSettings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      logger.error('Error loading notification settings:', error)
    }
  }, [isElectron])

  // Move hooks before conditional return
  useEffect(() => {
    // Load settings from secure storage if in Electron
    if (isElectron) {
      loadSettings()
    }
  }, [isElectron, loadSettings])

  useEffect(() => {
    // Set up navigation listener for notification clicks
    if (user && isElectron) {
      notificationService.setupNavigationListener((path) => {
        // Use React Router to navigate
        window.location.href = path
      })
    }

    return () => {
      notificationService.removeNavigationListener()
    }
  }, [user, isElectron])

  // If not in Electron, show a message
  if (!isElectron) {
    return (
      <Card>
        <CardHeader>
          <h3 className="h4">Notification Settings</h3>
        </CardHeader>
        <CardContent>
          <div style={{ 
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-md)'
          }}>
            <p className="body" style={{ marginBottom: '1rem' }}>
              <strong>Desktop App Required</strong>
            </p>
            <p className="body-small text-secondary" style={{ marginBottom: '1.5rem' }}>
              Notifications are only available in the desktop app. Download it to receive:
            </p>
            <ul style={{ 
              listStyle: 'none',
              padding: 0,
              marginBottom: '1.5rem',
              textAlign: 'left',
              display: 'inline-block'
            }}>
              <li className="body-small" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                Daily study reminders
              </li>
              <li className="body-small" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                Due item notifications
              </li>
              <li className="body-small" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                Streak maintenance alerts
              </li>
              <li className="body-small" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                Achievement celebrations
              </li>
            </ul>
            <div>
              <a
                href="https://github.com/mahirtantod/retentive-app/releases"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Download Desktop App
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSave = async () => {
    if (!user || !isElectron) return

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
      logger.error('Error saving notification settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    if (!isElectron) return
    
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
              <Button 
                variant="ghost" 
                onClick={async () => {
                  if (!user || !isElectron) return
                  
                  await window.electronAPI.notifications.testDaily(user.id)
                  addToast('info', 'Daily reminder test triggered - check if you have due items')
                }}
              >
                Test Daily Now
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              onClick={async () => {
                if (!user || !isElectron) return
                
                // Schedule a test notification for 10 seconds from now
                window.electronAPI.notifications.schedule(
                  'Test Due Item',
                  'This is a test notification item from Test Topic',
                  10000
                )
                
                // Always assume success for void function
                addToast('success', 'Test due notification scheduled for 10 seconds from now')
              }}
            >
              Test Due (10s)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}