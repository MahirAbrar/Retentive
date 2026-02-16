import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { useTheme } from '../contexts/ThemeContext'
import { validateEmail, validatePassword } from '../utils/validation'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { user, signIn } = useAuth()
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()

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

            <a
              href={`https://${import.meta.env.VITE_MARKET_LINK}/reset-password`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textAlign: 'center',
                display: 'block',
                marginBottom: '1rem'
              }}
            >
              <span className="body-small text-info">Forgot password?</span>
            </a>

            <hr style={{
              border: 'none',
              borderTop: '1px solid var(--color-gray-200)',
              margin: '1.5rem 0'
            }} />

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