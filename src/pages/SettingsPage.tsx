import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent, Input, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { supabase } from '../services/supabase'
import { DataManagement } from '../components/settings/DataManagement'
import { NotificationSettings } from '../components/settings/NotificationSettings'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { addToast } = useToast()
  
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
    } catch (error) {
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
    } catch (error) {
      setErrors({ password: 'Failed to change password' })
      addToast('error', 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setLoading(true)

    try {
      // In a real app, we'd call a server function to delete user data
      // For now, we'll just sign out
      await signOut()
      addToast('info', 'Account deletion requested')
      navigate('/')
    } catch (error) {
      addToast('error', 'Failed to delete account')
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
              <div>
                <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Daily Review Reminder
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="checkbox"
                    id="dailyReminder"
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <label htmlFor="dailyReminder" className="body">
                    Send me a daily reminder to review items
                  </label>
                </div>
                <p className="body-small text-secondary" style={{ marginTop: '0.5rem', marginLeft: '2.25rem' }}>
                  Coming soon: Get notified when you have items due for review
                </p>
              </div>

              <div>
                <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Study Session Length
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    backgroundColor: 'var(--color-background)'
                  }}
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15" selected>15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
                <p className="body-small text-secondary" style={{ marginTop: '0.5rem' }}>
                  Coming soon: Set your preferred study session duration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="body">
                Once you delete your account, there is no going back. Please be certain.
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}