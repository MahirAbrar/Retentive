/**
 * Format time duration with appropriate units (seconds, minutes, hours, days)
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    const remainingHours = hours % 24
    if (remainingHours > 0 && days < 7) {
      return `${days}d ${remainingHours}h`
    }
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    if (remainingMinutes > 0 && hours < 12) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    if (remainingSeconds > 0 && minutes < 10) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  return `${seconds} second${seconds !== 1 ? 's' : ''}`
}

/**
 * Format a date for display with time if within 7 days
 */
export function formatReviewDate(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // For times today or tomorrow, show relative time
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`
  }
  
  if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`
  }
  
  // For times within a week, show day name and time
  if (diffDays > 1 && diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    return `${dayName} at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`
  }
  
  // For times beyond a week, show date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Get the optimal review window for a given learning mode
 */
export function getOptimalReviewWindow(learningMode: string): { early: string, late: string, perfect: string } {
  // Based on GAMIFICATION_CONFIG review windows
  switch (learningMode) {
    case 'ultracram':
      return {
        early: '10% before due',
        perfect: 'Within 2 hours of due time',
        late: 'Up to 12 hours late'
      }
    case 'cram':
      return {
        early: '20% before due',
        perfect: 'Within 6 hours of due time',
        late: 'Up to 24 hours late'
      }
    case 'extended':
      return {
        early: '1 day before due',
        perfect: 'Within 2 days of due time',
        late: 'Up to 7 days late'
      }
    case 'steady':
    default:
      return {
        early: '12 hours before due',
        perfect: 'Within 1 day of due time',
        late: 'Up to 3 days late'
      }
  }
}