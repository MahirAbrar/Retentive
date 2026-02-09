import { Card, CardContent, Skeleton } from '../ui'

interface QuickStatsProps {
  loading: boolean
  overdue: number
  dueToday: number
  upcoming: number
  mastered: number
}

const statItems = [
  { key: 'overdue', label: 'Overdue', color: 'var(--color-error)' },
  { key: 'dueToday', label: 'Due Today', color: 'var(--color-warning)' },
  { key: 'upcoming', label: 'Upcoming', color: 'var(--color-info)' },
  { key: 'mastered', label: 'Mastered', color: 'var(--color-success)' },
] as const

export function QuickStats({ loading, overdue, dueToday, upcoming, mastered }: QuickStatsProps) {
  if (loading) {
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <Skeleton width="60px" height="2.5rem" style={{ margin: '0 auto 0.5rem' }} />
                <Skeleton width="80px" height="1rem" style={{ margin: '0 auto' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  const values = { overdue, dueToday, upcoming, mastered }

  return (
    <>
      {statItems.map(({ key, label, color }) => (
        <Card key={key}>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <p className="h2" style={{ color }}>{values[key]}</p>
              <p className="body-small text-secondary">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
