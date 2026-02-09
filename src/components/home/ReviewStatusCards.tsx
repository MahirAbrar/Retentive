import { Link } from 'react-router-dom'
import { Button, Card, CardContent, Skeleton } from '../ui'

interface ReviewStatusCardsProps {
  loading: boolean
  nextDueIn: string | null
  newItemsCount: number
}

const flexBetween: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

export function ReviewStatusCards({ loading, nextDueIn, newItemsCount }: ReviewStatusCardsProps) {
  if (loading) {
    return (
      <>
        <Card variant="bordered">
          <CardContent>
            <div style={flexBetween}>
              <div>
                <Skeleton width="120px" height="1rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="150px" height="1.75rem" />
              </div>
              <Skeleton width="80px" height="2rem" />
            </div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent>
            <div style={flexBetween}>
              <div>
                <Skeleton width="120px" height="1rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="50px" height="1.75rem" />
              </div>
              <Skeleton width="100px" height="2rem" />
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <Card variant="bordered">
        <CardContent>
          <div style={flexBetween}>
            <div>
              <p className="body-small text-secondary">Next Review Due In</p>
              <p
                className="h3"
                style={{
                  color: nextDueIn === 'Now' ? 'var(--color-error)' : 'var(--color-primary)',
                }}
              >
                {nextDueIn || 'No items scheduled'}
              </p>
            </div>
            {nextDueIn === 'Now' && (
              <Link to="/topics">
                <Button variant="primary" size="small">
                  Review Now
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardContent>
          <div style={flexBetween}>
            <div>
              <p className="body-small text-secondary">New Items to Learn</p>
              <p className="h3" style={{ color: 'var(--color-info)' }}>
                {newItemsCount}
              </p>
            </div>
            {newItemsCount > 0 && (
              <Link to="/topics">
                <Button variant="secondary" size="small">
                  Start Learning
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
