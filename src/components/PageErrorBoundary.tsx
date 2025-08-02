import React from 'react'
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent } from './ui'
import { ErrorBoundary } from './ErrorBoundary'

// Error boundary for individual pages/routes
export function PageErrorBoundary() {
  const error = useRouteError()
  
  let errorMessage: string
  let statusCode: number | undefined
  
  if (isRouteErrorResponse(error)) {
    // Router errors (404, etc)
    errorMessage = error.statusText || error.data
    statusCode = error.status
  } else if (error instanceof Error) {
    // JavaScript errors
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else {
    errorMessage = 'An unexpected error occurred'
  }

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Card variant="bordered" style={{ maxWidth: '500px', width: '100%' }}>
        <CardHeader>
          <h2 className="h3" style={{ textAlign: 'center' }}>
            {statusCode === 404 ? 'Page Not Found' : 'Error'}
          </h2>
        </CardHeader>
        <CardContent>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.2 }}>
              {statusCode === 404 ? '404' : '⚠️'}
            </div>
            
            <p className="body" style={{ marginBottom: '2rem' }}>
              {statusCode === 404 
                ? "The page you're looking for doesn't exist."
                : errorMessage}
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/">
                <Button variant="primary">
                  Go Home
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Async error boundary for components that load data
interface AsyncErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, retry: () => void) => React.ReactNode
}

export function AsyncErrorBoundary({ children, fallback }: AsyncErrorBoundaryProps) {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = () => setError(null)

  if (error) {
    if (fallback) {
      return <>{fallback(error, resetError)}</>
    }

    return (
      <div style={{ 
        padding: '2rem',
        backgroundColor: 'var(--color-error-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-error)'
      }}>
        <h4 className="h5" style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>
          Failed to load data
        </h4>
        <p className="body-small" style={{ marginBottom: '1rem' }}>
          {error.message}
        </p>
        <Button onClick={resetError} size="small" variant="secondary">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="body text-secondary">Something went wrong</p>
          <Button onClick={() => window.location.reload()} size="small" variant="ghost">
            Reload Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// HOC to wrap components with error boundary
export function withPageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <AsyncErrorBoundary>
        <Component {...props} />
      </AsyncErrorBoundary>
    )
  }
}