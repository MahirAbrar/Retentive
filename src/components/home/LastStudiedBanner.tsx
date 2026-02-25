import { Link } from 'react-router-dom'
import { Button, Card, CardContent } from '../ui'

interface LastStudiedBannerProps {
  lastStudiedText: string
  overdueCount?: number
}

export function LastStudiedBanner({ lastStudiedText, overdueCount }: LastStudiedBannerProps) {
  const hasOverdue = overdueCount != null && overdueCount > 0
  const bannerColor = hasOverdue ? 'var(--color-error)' : 'var(--color-warning)'

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
            {hasOverdue ? (
              <>
                <p className="body-small text-secondary">Overdue Reviews</p>
                <p className="h3" style={{ color: bannerColor }}>
                  {overdueCount} item{overdueCount !== 1 ? 's' : ''} overdue
                </p>
              </>
            ) : (
              <>
                <p className="body-small text-secondary">Last Studied</p>
                <p className="h3" style={{ color: bannerColor }}>
                  {lastStudiedText}
                </p>
              </>
            )}
          </div>
          <Link to="/topics">
            <Button variant="primary" size="small">
              {hasOverdue ? 'Review Now' : 'Study Now'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
