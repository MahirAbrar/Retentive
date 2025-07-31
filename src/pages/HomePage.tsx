import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'

export function HomePage() {
  const { user } = useAuth()

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="h1" style={{ marginBottom: '1rem' }}>Retentive</h1>
        <p className="body-large text-secondary">
          Master anything with spaced repetition learning
        </p>
      </header>

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '3rem' }}>
        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2" style={{ color: 'var(--color-error)' }}>0</p>
                <p className="body-small text-secondary">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2" style={{ color: 'var(--color-warning)' }}>0</p>
                <p className="body-small text-secondary">Due Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2" style={{ color: 'var(--color-info)' }}>0</p>
                <p className="body-small text-secondary">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2" style={{ color: 'var(--color-success)' }}>0</p>
                <p className="body-small text-secondary">Mastered</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="h3">Get Started</h2>
          </CardHeader>
          <CardContent>
            <p className="body" style={{ marginBottom: '2rem' }}>
              Ready to start learning? Create your first topic and add items to study.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Link to="/study">
                    <Button variant="primary" size="large">
                      Start Studying
                    </Button>
                  </Link>
                  <Link to="/topics/new">
                    <Button variant="secondary" size="large">
                      Add New Topic
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="large">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Development Tools */}
        <Card>
          <CardHeader>
            <h3 className="h4">Development Tools</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/components">
                <Button variant="ghost">View Component Library</Button>
              </Link>
              <Button 
                variant="ghost"
                onClick={() => {
                  const newTheme = document.body.classList.contains('theme-dark') ? '' : 'theme-dark'
                  document.body.className = newTheme
                }}
              >
                Toggle Dark Mode (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p className="body-small text-secondary">
          Built with Swiss design principles • Clean, minimal, functional
        </p>
      </footer>
    </div>
  )
}