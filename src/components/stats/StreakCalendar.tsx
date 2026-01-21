import { useMemo } from 'react'

interface StreakCalendarProps {
  title: string
  activeDates: Set<string> // Set of date strings in 'YYYY-MM-DD' format
  colorActive?: string
  colorInactive?: string
  weeksToShow?: number
}

export function StreakCalendar({
  title,
  activeDates,
  colorActive = 'var(--color-success)',
  colorInactive = 'var(--color-gray-100)',
  weeksToShow = 12
}: StreakCalendarProps) {
  const calendarData = useMemo(() => {
    const today = new Date()
    const data: { date: Date; dateStr: string; isActive: boolean }[][] = []

    // Start from weeksToShow weeks ago, aligned to Sunday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (weeksToShow * 7) + (7 - today.getDay()))

    // Build weeks array
    for (let week = 0; week < weeksToShow; week++) {
      const weekData: { date: Date; dateStr: string; isActive: boolean }[] = []
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + (week * 7) + day)

        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

        weekData.push({
          date: currentDate,
          dateStr,
          isActive: activeDates.has(dateStr) && currentDate <= today
        })
      }
      data.push(weekData)
    }

    return data
  }, [activeDates, weeksToShow])

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0
    const today = new Date()
    const checkDate = new Date(today)

    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`

      if (activeDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }, [activeDates])

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <h4 className="body" style={{ fontWeight: '600' }}>{title}</h4>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          backgroundColor: currentStreak > 0 ? colorActive + '20' : 'var(--color-gray-50)',
          borderRadius: 'var(--radius-full)',
        }}>
          <span style={{ fontSize: '1rem' }}>🔥</span>
          <span className="body-small" style={{ fontWeight: '600', color: currentStreak > 0 ? colorActive : 'var(--color-text-secondary)' }}>
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {/* Day labels */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginRight: '0.25rem'
        }}>
          {dayLabels.map((label, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                fontSize: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)'
              }}
            >
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display: 'flex',
          gap: '2px',
          overflow: 'auto'
        }}>
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {week.map((day, dayIndex) => {
                const isToday = day.dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
                const isFuture = day.date > new Date()

                return (
                  <div
                    key={dayIndex}
                    title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${day.isActive ? ' ✓' : ''}`}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      backgroundColor: isFuture
                        ? 'transparent'
                        : day.isActive
                          ? colorActive
                          : colorInactive,
                      border: isToday ? `2px solid var(--color-primary)` : 'none',
                      boxSizing: 'border-box',
                      cursor: 'default'
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        justifyContent: 'flex-end'
      }}>
        <span className="caption text-secondary">Less</span>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          backgroundColor: colorInactive
        }} />
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          backgroundColor: colorActive
        }} />
        <span className="caption text-secondary">More</span>
      </div>
    </div>
  )
}
