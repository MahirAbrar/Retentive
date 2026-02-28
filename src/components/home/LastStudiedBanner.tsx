import { Link } from 'react-router-dom'
import { Button, Card, CardContent } from '../ui'

interface LastStudiedBannerProps {
  lastStudiedText: string
}

export function LastStudiedBanner({ lastStudiedText }: LastStudiedBannerProps) {
  return (
    <Card variant="bordered" style={{ marginBottom: '2rem' }}>
      <CardContent>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="body-small text-secondary">Last Studied</p>
            <p className="h3" style={{ color: 'var(--color-warning)' }}>
              {lastStudiedText}
            </p>
          </div>
          <Link to="/topics">
            <Button variant="primary" size="small">
              Study Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
