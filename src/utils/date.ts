export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (Math.abs(diffMins) < 60) {
    if (diffMins === 0) return 'now'
    if (diffMins > 0) return `in ${diffMins} minutes`
    return `${Math.abs(diffMins)} minutes ago`
  }

  if (Math.abs(diffHours) < 24) {
    if (diffHours > 0) return `in ${diffHours} hours`
    return `${Math.abs(diffHours)} hours ago`
  }

  if (Math.abs(diffDays) < 30) {
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays === -1) return 'yesterday'
    if (diffDays > 0) return `in ${diffDays} days`
    return `${Math.abs(diffDays)} days ago`
  }

  return formatDate(d)
}

export function getDaysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function getHoursFromNow(hours: number): Date {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date
}

export function isOverdue(date: string | Date | null): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return d < new Date()
}

export function isDueToday(date: string | Date | null): boolean {
  if (!date) return true // Never reviewed items are due
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return d <= today
}

export function getStudyStreak(dates: (string | Date)[]): number {
  if (dates.length === 0) return 0
  
  const sortedDates = dates
    .map(d => typeof d === 'string' ? new Date(d) : d)
    .sort((a, b) => b.getTime() - a.getTime())
  
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  
  for (const date of sortedDates) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    
    const diffDays = Math.round((currentDate.getTime() - d.getTime()) / 86400000)
    
    if (diffDays === 0 || diffDays === 1) {
      streak++
      currentDate = d
    } else {
      break
    }
  }
  
  return streak
}