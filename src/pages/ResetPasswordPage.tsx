import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { authService } from '../services/authFixed'
import { validateEmail, validatePassword } from '../utils/validation'
import { supabase } from '../services/supabase'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  
  const { addToast } = useToast()

  useEffect(() => {
    // Check if user arrived here from a password reset link
    const checkRecoveryMode = async () => {
      await supabase.auth.getSession()
      
      // Check URL parameters for recovery indicators
      const type = searchParams.get('type')
      const hasHashParams = window.location.hash.includes('access_token')
      
      // Also check for type in hash params
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashType = hashParams.get('type')
      
      if (type === 'recovery' || hashType === 'recovery' || hasHashParams) {
        setIsRecoveryMode(true)
      }
    }
    
    checkRecoveryMode()

    // Listen for auth state changes (handles password recovery events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [searchParams])

  const validateEmailForm = () => {
    const newErrors: Record<string, string> = {}

    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {}

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.errors[0]
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmailForm()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await authService.resetPassword(email)

      if (error) {
        setErrors({ general: error.message })
        addToast('error', error.message)
      } else {
        setEmailSent(true)
        addToast('success', 'Password reset email sent! Check your inbox.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await authService.updatePassword(password)

      if (error) {
        setErrors({ general: error.message })
        addToast('error', error.message)
      } else {
        addToast('success', 'Password updated successfully! You can now sign in.')
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Card variant="bordered" style={{ width: '100%', maxWidth: '400px' }}>
        <CardHeader>
          <h1 className="h3" style={{ textAlign: 'center' }}>
            {isRecoveryMode ? 'Set New Password' : 'Reset Password'}
          </h1>
        </CardHeader>
        <CardContent>
          {isRecoveryMode ? (
            // Password update form (user clicked email link)
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="body text-secondary" style={{ marginBottom: '1rem' }}>
                Enter your new password below
              </p>

              <Input
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
                required
              />

              {errors.general && (
                <p className="body-small text-error">{errors.general}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                Update Password
              </Button>

              <Link to="/login" style={{ textAlign: 'center' }}>
                <span className="body-small text-info">Back to Sign In</span>
              </Link>
            </form>
          ) : emailSent ? (
            // Success message after email sent
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: '1rem',
                filter: 'grayscale(100%)'
              }}>
                ✉️
              </div>
              <h3 className="h4" style={{ marginBottom: '1rem' }}>Check Your Email</h3>
              <p className="body text-secondary" style={{ marginBottom: '2rem' }}>
                We&rsquo;ve sent a password reset link to:
                <br />
                <strong>{email}</strong>
              </p>
              <p className="body-small text-secondary" style={{ marginBottom: '2rem' }}>
                The link will expire in 1 hour. If you don&rsquo;t see the email, check your spam folder.
              </p>
              <Link to="/login">
                <Button variant="primary" fullWidth>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            // Email request form
            <form onSubmit={handleSendResetEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="body text-secondary" style={{ marginBottom: '1rem' }}>
                Enter your email address and we&rsquo;ll send you a link to reset your password
              </p>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
                required
              />

              {errors.general && (
                <p className="body-small text-error">{errors.general}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                Send Reset Email
              </Button>

              <Link to="/login" style={{ textAlign: 'center' }}>
                <span className="body-small text-info">Back to Sign In</span>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}