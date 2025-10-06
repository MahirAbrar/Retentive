import { logger } from '../utils/logger'
import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Button, Card, CardHeader, CardContent } from './ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    })

    // In production, you might want to send this to an error reporting service
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default error UI
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <Card variant="bordered" style={{ maxWidth: '600px', width: '100%' }}>
            <CardHeader>
              <h2 className="h3" style={{ color: 'var(--color-error)' }}>
                Oops! Something went wrong
              </h2>
            </CardHeader>
            <CardContent>
              <p className="body" style={{ marginBottom: '1rem' }}>
                We&rsquo;re sorry, but something unexpected happened. The error has been logged and we&rsquo;ll look into it.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <span className="body-small text-secondary">Error details (development only)</span>
                  </summary>
                  <pre style={{ 
                    backgroundColor: 'var(--color-gray-100)', 
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'auto',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'monospace'
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button onClick={this.handleReset} variant="primary">
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="ghost">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-based error boundary wrapper for easier use
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div style={{ 
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--color-error-bg)',
      border: '1px solid var(--color-error)',
      borderRadius: 'var(--radius-md)'
    }}>
      <h3 className="h4" style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
        Something went wrong
      </h3>
      <p className="body-small" style={{ marginBottom: '1rem' }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={resetError} size="small" variant="secondary">
        Try again
      </Button>
    </div>
  )
}

// Utility to wrap async functions with error handling
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error)
      } else {
        logger.error('Unhandled error:', error)
      }
      throw error
    }
  }) as T
}