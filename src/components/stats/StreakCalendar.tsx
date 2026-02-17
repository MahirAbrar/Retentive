import { useMemo, useState } from 'react'

interface StreakCalendarProps {
  title: string
  activeDates: Set<string> // Set of date strings in 'YYYY-MM-DD' format
  colorActive?: string
  colorInactive?: string
}

export function StreakCalendar({
  title,
  activeDates,
  colorActive = 'var(--color-success)',
  colorInactive = 'var(--color-gray-100)',
}: StreakCalendarProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const calendarData = useMemo(() => {
    const today = new Date()
    const data: { date: Date; dateStr: string; isActive: boolean }[][] = []

    // Show full year: Jan 1 to Dec 31 of selected year
    const yearStart = new Date(selectedYear, 0, 1)
    // Align to the Sunday on or before Jan 1
    const startDate = new Date(yearStart)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const yearEnd = new Date(selectedYear, 11, 31)
    // Align to the Saturday on or after Dec 31
    const endDate = new Date(yearEnd)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    // Build weeks array
    const current = new Date(startDate)
    while (current <= endDate) {
      const weekData: { date: Date; dateStr: string; isActive: boolean }[] = []
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(current)
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

        weekData.push({
          date: currentDate,
          dateStr,
          isActive: activeDates.has(dateStr) && currentDate <= today
        })
        current.setDate(current.getDate() + 1)
      }
      data.push(weekData)
    }

    return data
  }, [activeDates, selectedYear])

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

      {/* Year Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <button
          onClick={() => setSelectedYear(y => y - 1)}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.75rem',
          }}
        >
          &larr;
        </button>
        <span className="body-small" style={{ fontWeight: '600', minWidth: '3rem', textAlign: 'center' }}>
          {selectedYear}
        </span>
        <button
          onClick={() => setSelectedYear(y => y + 1)}
          disabled={selectedYear >= currentYear}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: selectedYear >= currentYear ? 'not-allowed' : 'pointer',
            padding: '0.25rem 0.5rem',
            color: 'var(--color-text-primary)',
            fontSize: '0.75rem',
            opacity: selectedYear >= currentYear ? 0.3 : 1,
          }}
        >
          &rarr;
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Day labels */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          marginRight: '2px',
          flexShrink: 0,
        }}>
          {dayLabels.map((label, i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '10px',
                fontSize: '8px',
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
          gap: '1px',
          flex: 1,
        }}>
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
              {week.map((day, dayIndex) => {
                const isToday = day.dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
                const isFuture = day.date > new Date()

                return (
                  <div
                    key={dayIndex}
                    title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${day.isActive ? ' ✓' : ''}`}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '1px',
                      backgroundColor: isFuture
                        ? 'transparent'
                        : day.isActive
                          ? colorActive
                          : colorInactive,
                      border: isToday ? `1px solid var(--color-primary)` : 'none',
                      boxSizing: 'border-box',
                      cursor: 'default',
                      maxHeight: '10px',
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
