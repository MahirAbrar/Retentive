import React from 'react'
import { Link } from 'react-router-dom'
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
  { key: 'overdue', label: 'Overdue', color: 'var(--color-error)', linkTo: '/topics' },
  { key: 'dueToday', label: 'Due Today', color: 'var(--color-warning)', linkTo: '/topics' },
  { key: 'upcoming', label: 'Upcoming', color: 'var(--color-info)', linkTo: null },
  { key: 'mastered', label: 'Mastered', color: 'var(--color-success)', linkTo: null },
  { key: 'reviewedToday', label: 'Reviewed Today', color: 'var(--color-accent)', linkTo: null },
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
      {statItems.map(({ key, label, color, linkTo }) => {
        const isClickable = linkTo && values[key] > 0
        const card = (
          <Card key={key} style={isClickable ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : undefined}>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <p className="h2" style={{ color }}>{values[key]}</p>
                <p className="body-small text-secondary">{label}</p>
              </div>
            </CardContent>
          </Card>
        )

        if (isClickable) {
          return (
            <Link key={key} to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
              {card}
            </Link>
          )
        }

        return card
      })}
    </>
  )
})
