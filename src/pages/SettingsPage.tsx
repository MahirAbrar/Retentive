import { logger } from '../utils/logger'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent, Input, useToast, Modal } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { DataManagement } from '../components/settings/DataManagement'
import { NotificationSettings } from '../components/settings/NotificationSettings'
import { SubscriptionStatus } from '../components/settings/SubscriptionStatus'
import { useTheme } from '../contexts/ThemeContext'
import { gamificationService } from '../services/gamificationService'
import { cacheService } from '../services/cacheService'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      // Get display name from user metadata or fallback to email prefix
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
    }
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      // Update user metadata if display name changed
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      })

      if (error) throw error

      // Force a refresh of the auth state to update the UI
      if (data.user) {
        await supabase.auth.refreshSession()
      }

      addToast('success', 'Profile updated successfully')
    } catch (_error) {
      setErrors({ profile: 'Failed to update profile' })
      addToast('error', 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    const newErrors: Record<string, string> = {}
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      addToast('success', 'Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (_error) {
      setErrors({ password: 'Failed to change password' })
      addToast('error', 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeleteAccount = async () => {
    // First confirmation
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.')) {
      return
    }

    // Show the delete confirmation modal
    setShowDeleteConfirm(true)
  }

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      addToast('error', 'Please type DELETE to confirm')
      return
    }

    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
    setLoading(true)

    try {
      // Call the database function to delete the user account
      // This function handles all the deletion logic server-side
      const { error: deleteError } = await supabase.rpc('delete_user_account')
      
      if (deleteError) {
        logger.error('Delete account error:', deleteError)
        throw deleteError
      }
      
      addToast('success', 'Account deleted successfully')
      
      // Sign out and redirect
      await signOut()
      navigate('/login')
    } catch (error) {
      logger.error('Failed to delete account:', error)
      addToast('error', 'Failed to delete account. Some data may remain.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetData = async () => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete ALL your data? This includes topics, learning items, achievements, stats, and everything else. This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete EVERYTHING including archived items, achievements, levels, and streaks. Are you absolutely sure?')) {
      return
    }

    setLoading(true)

    try {
      // Delete all review sessions first
      const { error: sessionsError } = await supabase
        .from('review_sessions')
        .delete()
        .eq('user_id', user.id)

      if (sessionsError) {
        logger.warn('Failed to delete review sessions:', sessionsError)
      }

      // Delete all learning items (including archived)
      const { error: itemsError } = await supabase
        .from('learning_items')
        .delete()
        .eq('user_id', user.id)

      if (itemsError) throw itemsError

      // Delete all topics (including archived)
      const { error: topicsError } = await supabase
        .from('topics')
        .delete()
        .eq('user_id', user.id)

      if (topicsError) throw topicsError

      // Delete all daily stats
      const { error: dailyStatsError } = await supabase
        .from('daily_stats')
        .delete()
        .eq('user_id', user.id)

      if (dailyStatsError) {
        logger.warn('Failed to delete daily stats:', dailyStatsError)
      }

      // Delete all achievements - the table is named 'achievements'
      const { error: achievementsError } = await supabase
        .from('achievements')
        .delete()
        .eq('user_id', user.id)

      if (achievementsError) {
        logger.warn('Failed to delete achievements:', achievementsError)
      }

      // Delete and recreate gamification stats for complete reset
      const { error: deleteStatsError } = await supabase
        .from('user_gamification_stats')
        .delete()
        .eq('user_id', user.id)

      if (deleteStatsError) {
        logger.warn('Failed to delete gamification stats:', deleteStatsError)
      }

      // Recreate gamification stats with default values
      const { error: createStatsError } = await supabase
        .from('user_gamification_stats')
        .insert({
          user_id: user.id,
          total_points: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          total_reviews: 0,
          total_items_mastered: 0,
          perfect_days: 0,
          last_activity_date: null,
          achievements_unlocked: []
        })

      if (createStatsError) {
        logger.warn('Failed to recreate gamification stats:', createStatsError)
      }

      // Reset user settings to defaults (keep subscription info)
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          daily_reminder_enabled: false,
          daily_reminder_time: '09:00',
          notification_sound_enabled: true,
          auto_play_audio: false,
          show_keyboard_shortcuts: true,
          theme: 'light',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (settingsError) {
        logger.warn('Failed to reset user settings:', settingsError)
      }

      // Clear all caches - this is critical for gamification stats
      cacheService.clear()
      
      // Clear gamification cache specifically
      gamificationService.clearUserStats(user.id)
      
      // Force refresh the gamification stats from database
      await gamificationService.refreshUserStats(user.id)
      
      // Clear any local storage caches
      if (window.localStorage) {
        // Clear specific cache keys related to user data
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('cache_') || key.includes('topics_') || key.includes('items_') || key.includes('gamification'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }

      addToast('success', 'All data has been completely reset. You have a fresh start!')
      
      // Force a complete reload to ensure all components get fresh data
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    } catch (error) {
      logger.error('Error resetting data:', error)
      addToast('error', 'Failed to reset all data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">Settings</h1>
        <p className="body text-secondary">
          Manage your account and preferences
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Profile Settings */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Profile</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
              
              <Input
                label="Email"
                type="email"
                value={email}
                disabled
                placeholder="your@email.com"
              />
              
              {errors.profile && (
                <p className="body-small text-error">{errors.profile}</p>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Change Password</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={errors.currentPassword}
                placeholder="••••••••"
              />
              
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.newPassword}
                placeholder="••••••••"
              />
              
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />
              
              {errors.password && (
                <p className="body-small text-error">{errors.password}</p>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Learning Preferences</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--color-background-secondary)', 
                borderRadius: 'var(--radius-sm)',
                border: '2px solid var(--color-border)' 
              }}>
                <label className="body" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  🎨 Theme Settings
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    onClick={toggleTheme}
                    style={{
                      width: '60px',
                      height: '32px',
                      borderRadius: '16px',
                      border: '2px solid var(--color-primary)',
                      backgroundColor: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-gray-300)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: theme === 'dark' ? '30px' : '2px',
                        transition: 'left 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}
                    >
                      {theme === 'dark' ? '🌙' : '☀️'}
                    </div>
                  </button>
                  <span className="body" style={{ fontWeight: '500' }}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'} is currently active
                  </span>
                </div>
                <p className="body-small text-secondary" style={{ marginTop: '0.5rem' }}>
                  Click the toggle to switch between light and dark themes
                </p>
              </div>
              
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <SubscriptionStatus />

        {/* Notifications */}
        <NotificationSettings />

        {/* Data Management */}
        <DataManagement />

        {/* Danger Zone */}
        <Card variant="bordered" style={{ borderColor: 'var(--color-error)' }}>
          <CardHeader>
            <h3 className="h4" style={{ color: 'var(--color-error)' }}>Danger Zone</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p className="body" style={{ marginBottom: '1rem' }}>
                  <strong>Reset All Data:</strong> Delete ALL your data including topics, learning items, achievements, levels, streaks, and archived content.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResetData}
                  disabled={loading}
                  style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
                >
                  Reset All Data
                </Button>
              </div>
              
              <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '1rem' }}>
                <p className="body" style={{ marginBottom: '1rem' }}>
                  <strong>Account Actions:</strong> Sign out or permanently delete your account.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button
                    variant="ghost"
                    onClick={() => signOut()}
                    disabled={loading}
                  >
                    Sign Out
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteConfirmText('')
        }}
        title="Confirm Account Deletion"
      >
        <div style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>
            <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Please type <strong>DELETE</strong> to confirm:
          </p>
          <Input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE here"
            style={{ marginBottom: '1.5rem' }}
          />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteConfirmText('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE'}
              style={{ 
                backgroundColor: deleteConfirmText === 'DELETE' ? 'var(--color-error)' : undefined,
                borderColor: deleteConfirmText === 'DELETE' ? 'var(--color-error)' : undefined
              }}
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}