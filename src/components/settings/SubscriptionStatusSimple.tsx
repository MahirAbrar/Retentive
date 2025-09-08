import { Card, CardHeader, CardContent, Button } from '../ui'
import { useNavigate } from 'react-router-dom'

export function SubscriptionStatusSimple() {
  const navigate = useNavigate()
  
  return (
    <Card>
      <CardHeader>
        <h3 className="h4">Subscription</h3>
      </CardHeader>
      <CardContent>
        <div style={{ padding: '1rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Current Plan:</strong> Free
          </p>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
            You're on the free plan. Start your 14-day trial to unlock all features!
          </p>
          <Button 
            className="btn btn-primary"
            onClick={() => navigate('/paywall')}
          >
            Start Free Trial
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}