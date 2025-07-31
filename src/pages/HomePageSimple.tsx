import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent } from '../components/ui'

export function HomePageSimple() {
  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="h1" style={{ marginBottom: '1rem' }}>Retentive</h1>
        <p className="body-large text-secondary">
          Master anything with spaced repetition learning
        </p>
      </header>

      <Card variant="elevated">
        <CardHeader>
          <h2 className="h3">Get Started</h2>
        </CardHeader>
        <CardContent>
          <p className="body" style={{ marginBottom: '2rem' }}>
            Ready to start learning? Create your first topic and add items to study.
          </p>
          <Link to="/login">
            <Button variant="primary" size="large">
              Get Started
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}