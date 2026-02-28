import { Card, CardHeader, CardContent, Skeleton } from '../ui'

interface StudyProgressProps {
  loading: boolean
  totalTopics: number
  totalItems: number
  streakDays: number
  lastStudiedText: string
  showLastStudied: boolean
}

const flexBetween: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

export function StudyProgress({
  loading,
  totalTopics,
  totalItems,
  streakDays,
  lastStudiedText,
  showLastStudied,
}: StudyProgressProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {loading ? (
        <>
          <Card variant="bordered">
            <CardHeader>
              <Skeleton width="120px" height="1.5rem" />
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={flexBetween}>
                    <Skeleton width="100px" height="1rem" />
                    <Skeleton width="40px" height="1.5rem" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardHeader>
              <Skeleton width="150px" height="1.5rem" />
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      ...flexBetween,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Skeleton width="60px" height="1.5rem" />
                      <Skeleton width="80px" height="0.875rem" />
                    </div>
                    <Skeleton width="30px" height="0.875rem" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card variant="bordered">
          <CardHeader>
            <h3 className="h4">Study Progress</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={flexBetween}>
                <span className="body">Total Topics</span>
                <span className="h4">{totalTopics}</span>
              </div>
              <div style={flexBetween}>
                <span className="body">Total Items</span>
                <span className="h4">{totalItems}</span>
              </div>
              <div style={flexBetween}>
                <span className="body">Study Streak</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="h4"
                    style={{
                      color:
                        streakDays >= 30
                          ? 'var(--color-success)'
                          : streakDays >= 7
                            ? 'var(--color-warning)'
                            : 'inherit',
                    }}
                  >
                    {streakDays}
                  </span>
                  <span className="body-small text-secondary">days</span>
                  {streakDays >= 30 && <span title="30+ day streak!">🔥</span>}
                  {streakDays >= 7 && streakDays < 30 && (
                    <span title="7+ day streak!">⭐</span>
                  )}
                </div>
              </div>
              {showLastStudied && (
                <div style={flexBetween}>
                  <span className="body">Last Studied</span>
                  <span className="h4" style={{ color: 'var(--color-text-secondary)' }}>
                    {lastStudiedText}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
