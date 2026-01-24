import React from 'react'
import { ENV_CONFIG_ERROR } from '../services/supabase'

interface StartupCheckProps {
  children: React.ReactNode
}

/**
 * Startup validation component that catches configuration errors
 * before the main app renders. This prevents blank pages when
 * environment variables are missing.
 */
export function StartupCheck({ children }: StartupCheckProps) {
  if (ENV_CONFIG_ERROR) {
    return <StartupErrorScreen error={ENV_CONFIG_ERROR} />
  }

  return <>{children}</>
}

interface StartupErrorScreenProps {
  error: string
}

function StartupErrorScreen({ error }: StartupErrorScreenProps) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>!</div>
        <h1 style={styles.title}>Configuration Error</h1>
        <p style={styles.message}>{error}</p>
        <div style={styles.help}>
          <p style={styles.helpTitle}>How to fix:</p>
          <ol style={styles.helpList}>
            <li>Go to your hosting platform (Vercel, Netlify, etc.)</li>
            <li>Add the required environment variables</li>
            <li>Redeploy the application</li>
          </ol>
        </div>
        <button
          style={styles.button}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#fffef9',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    textAlign: 'center' as const,
  },
  icon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 20px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 700,
  },
  title: {
    margin: '0 0 12px',
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  message: {
    margin: '0 0 24px',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
  },
  help: {
    textAlign: 'left' as const,
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '24px',
  },
  helpTitle: {
    margin: '0 0 8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1a1a1a',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}
