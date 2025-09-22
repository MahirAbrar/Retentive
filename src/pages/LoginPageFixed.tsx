import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { validateEmail, validatePassword } from '../utils/validation'

export function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { user, signIn, signUp } = useAuth()
  const { addToast } = useToast()

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

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) {
        // Provide user-friendly error messages
        let userMessage = error.message
        
        if (error.message.includes('Database error saving new user')) {
          userMessage = 'Account created successfully! Please try logging in with your new credentials.'
          // Try to sign them in automatically
          setTimeout(async () => {
            const { error: signInError } = await signIn(email, password)
            if (!signInError) {
              addToast('success', 'Welcome! Your 14-day free trial has started.')
            }
          }, 1000)
        } else if (error.message.includes('User already registered')) {
          userMessage = 'This email is already registered. Please sign in instead.'
        } else if (error.message.includes('Invalid email')) {
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
        if (isSignUp) {
          // Calculate trial end date (14 days from now)
          const trialEndDate = new Date()
          trialEndDate.setDate(trialEndDate.getDate() + 14)
          const formattedDate = trialEndDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })
          
          addToast('success', `Welcome! Your 14-day free trial has started and will end on ${formattedDate}. Enjoy full access to all features!`)
        } else {
          addToast('success', 'Welcome back!')
        }
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
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
              required
            />

            {isSignUp && (
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
                required
              />
            )}

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
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            {!isSignUp && (
              <Link to="/reset-password" style={{ textAlign: 'center' }}>
                <span className="body-small text-info">Forgot password?</span>
              </Link>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />

            <p className="body-small text-center text-secondary">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setErrors({})
                  setPassword('')
                  setConfirmPassword('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-info)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}