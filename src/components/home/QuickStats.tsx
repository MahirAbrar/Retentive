import React from 'react'
import { Card, CardContent, Skeleton } from '../ui'

interface QuickStatsProps {
  loading: boolean
  overdue: number
  dueToday: number
  upcoming: number
  mastered: number
  reviewedToday: number
}

const statItems = [
  { key: 'overdue', label: 'Overdue', color: 'var(--color-error)' },
  { key: 'dueToday', label: 'Due Today', color: 'var(--color-warning)' },
  { key: 'upcoming', label: 'Upcoming', color: 'var(--color-info)' },
  { key: 'mastered', label: 'Mastered', color: 'var(--color-success)' },
  { key: 'reviewedToday', label: 'Reviewed Today', color: 'var(--color-accent)' },
] as const

export const QuickStats = React.memo(function QuickStats({ loading, overdue, dueToday, upcoming, mastered, reviewedToday }: QuickStatsProps) {
  if (loading) {
    return (
      <>
        {Array.from({ length: statItems.length }, (_, i) => (
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

  const values = { overdue, dueToday, upcoming, mastered, reviewedToday }

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
})
