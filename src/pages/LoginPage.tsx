import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { validateEmail, validatePassword } from '../utils/validation'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { user, signIn, signInWithGoogle, resetPassword } = useAuth()
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(resetEmail)) {
      addToast('error', 'Please enter a valid email address')
      return
    }
    setResetLoading(true)
    const { error } = await resetPassword(resetEmail)
    setResetLoading(false)
    if (error) {
      addToast('error', error.message || 'Failed to send reset email')
    } else {
      setResetSent(true)
      addToast('success', 'Check your email for a reset link')
    }
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.errors[0]
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Provide user-friendly error messages
        let userMessage = error.message

        if (error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('Password should be at least')) {
          userMessage = 'Password must be at least 6 characters long.'
        } else if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Incorrect email or password. Please try again.'
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and confirm your account first.'
        }

        setErrors({ general: userMessage })
        addToast('error', userMessage)
      } else {
        addToast('success', 'Welcome back!')
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
      padding: '2rem',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .login-container { padding: 1rem !important; }
          .login-card { max-width: 100% !important; margin: 0 1rem; }
          .login-card-content { padding: 1.5rem !important; }
        }
      `}</style>

      <Card variant="bordered" className="login-card" style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative'
      }}>
        <CardHeader style={{
          position: 'relative',
          paddingBottom: '1.5rem'
        }}>
          {/* Dark Mode Toggle - Inside Card Header */}
          <button
            onClick={toggleTheme}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              color: 'var(--color-text-primary)',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)'
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface)'
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Brand Wordmark */}
          <div style={{
            textAlign: 'center',
            marginBottom: '0.5rem'
          }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.01em'
            }}>
              Retentive
            </p>
          </div>

          {/* Main Heading */}
          <h1 style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            margin: 0,
            marginTop: '0.5rem'
          }}>
            Welcome Back
          </h1>
        </CardHeader>
        <CardContent className="login-card-content">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
                required
                fullWidth
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
                required
                fullWidth
              />
            </div>

            {errors.general && (
              <p className="body-small text-error" style={{ marginBottom: '1.25rem' }}>
                {errors.general}
              </p>
            )}

            <div style={{ marginTop: '1.75rem', marginBottom: '1rem' }}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                disabled={loading}
                style={{
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                Sign In
              </Button>
            </div>

            {!showReset ? (
              <button
                type="button"
                onClick={() => {
                  setShowReset(true)
                  setResetEmail(email)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'block',
                  width: '100%',
                  marginBottom: '1rem',
                  padding: 0
                }}
              >
                <span className="body-small text-info">Forgot password?</span>
              </button>
            ) : resetSent ? (
              <div style={{
                textAlign: 'center',
                marginBottom: '1rem',
                padding: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                background: 'var(--color-surface)'
              }}>
                <p className="body-small text-secondary" style={{ margin: 0 }}>
                  If an account exists for <strong>{resetEmail}</strong>, a reset link has been sent. Check your inbox.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <Input
                  label="Reset password — enter your email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleResetSubmit(e as unknown as React.FormEvent)
                    }
                  }}
                  placeholder="you@example.com"
                  fullWidth
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={resetLoading}
                    disabled={resetLoading}
                    onClick={handleResetSubmit}
                  >
                    Send reset link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={resetLoading}
                    onClick={() => setShowReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              margin: '1.5rem 0'
            }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />
              <span className="body-small text-secondary">or</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />
            </div>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={loading}
              onClick={async () => {
                setLoading(true)
                const { error } = await signInWithGoogle()
                if (error) {
                  addToast('error', 'Failed to sign in with Google')
                  setLoading(false)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <p className="body-small text-center text-secondary">
              Don&apos;t have an account?
              {' '}
              <a
                href={`https://${import.meta.env.VITE_MARKET_LINK}/auth/register`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-info)',
                  textDecoration: 'underline',
                }}
              >
                Sign Up
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}