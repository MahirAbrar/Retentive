export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural || singular + 's'}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return pluralize(minutes, 'minute')
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return pluralize(hours, 'hour')
  }
  
  return `${pluralize(hours, 'hour')} ${pluralize(remainingMinutes, 'minute')}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getItemStatusLabel(dueDate: string | null): string {
  if (!dueDate) return 'New'
  
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < -1) return 'Overdue'
  if (diffDays <= 0) return 'Due'
  if (diffDays === 1) return 'Due Tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`
  return 'Upcoming'
}

export function getItemStatusColor(dueDate: string | null): string {
  if (!dueDate) return '#3b82f6' // blue for new
  
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < -1) return '#ef4444' // red for overdue
  if (diffDays <= 0) return '#f59e0b' // amber for due
  if (diffDays <= 3) return '#eab308' // yellow for soon
  return '#10b981' // green for upcoming
}