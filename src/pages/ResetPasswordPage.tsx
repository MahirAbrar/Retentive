import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { authService } from '../services/authService'
import { supabase } from '../services/supabase'
import { validatePassword } from '../utils/validation'
import { logger } from '../utils/logger'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const search = window.location.search || ''
    const hash = window.location.hash || ''
    const afterHashQueryIdx = hash.indexOf('?')
    const hashQuery = afterHashQueryIdx >= 0 ? hash.slice(afterHashQueryIdx + 1) : ''
    const params = new URLSearchParams(search || hashQuery)
    const errorDescription = params.get('error_description')

    const authSub = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true)
      }
    })

    const init = async () => {
      try {
        if (errorDescription) {
          setInitError(errorDescription)
          return
        }

        const { data: { session: existing } } = await supabase.auth.getSession()
        if (existing) {
          if (!cancelled) setSessionReady(true)
          return
        }

        const code = params.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (error) {
            setInitError(error.message)
            return
          }
          setSessionReady(true)
          return
        }

        setTimeout(async () => {
          if (cancelled) return
          const { data: { session } } = await supabase.auth.getSession()
          if (cancelled) return
          if (session) setSessionReady(true)
          else setInitError('Reset link is invalid or has expired. Please request a new one.')
        }, 1500)
      } catch (err) {
        logger.error('Reset password init error:', err)
        if (!cancelled) setInitError(err instanceof Error ? err.message : 'Failed to verify reset link')
      }
    }

    void init()

    return () => {
      cancelled = true
      authSub.data.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const validation = validatePassword(password)
    if (!validation.valid) newErrors.password = validation.errors[0]
    if (password !== confirm) newErrors.confirm = 'Passwords do not match'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    const { error } = await authService.updatePassword(password)
    setLoading(false)

    if (error) {
      addToast('error', error.message || 'Failed to update password')
      return
    }

    addToast('success', 'Password updated. You are signed in.')
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Card variant="bordered" style={{ width: '100%', maxWidth: '440px' }}>
        <CardHeader style={{ paddingBottom: '1.5rem' }}>
          <h1 style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            margin: 0
          }}>
            Set a new password
          </h1>
        </CardHeader>
        <CardContent>
          {initError ? (
            <>
              <p className="body-small text-error" style={{ marginBottom: '1rem' }}>
                {initError}
              </p>
              <Button type="button" variant="primary" fullWidth onClick={() => navigate('/login')}>
                Back to sign in
              </Button>
            </>
          ) : !sessionReady ? (
            <p className="body text-secondary" style={{ textAlign: 'center' }}>
              Verifying reset link…
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <Input
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  placeholder="••••••••"
                  required
                  fullWidth
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                  placeholder="••••••••"
                  required
                  fullWidth
                />
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                >
                  Update password
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
