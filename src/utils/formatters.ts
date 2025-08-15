// Shared formatting utilities for consistent display across the app

export const formatNextReview = (dateString: string | null): string => {
  if (!dateString) return 'Not scheduled'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  // Past due
  if (diffMinutes < 0) {
    const absDiffMinutes = Math.abs(diffMinutes)
    const absDiffHours = Math.floor(absDiffMinutes / 60)
    const absDiffDays = Math.floor(absDiffHours / 24)
    
    if (absDiffHours < 1) return `${absDiffMinutes} minutes overdue`
    if (absDiffHours < 24) return `${absDiffHours} hours overdue`
    if (absDiffDays === 1) return 'Yesterday'
    return `${absDiffDays} days overdue`
  }
  
  // Future
  if (diffMinutes < 60) return `${diffMinutes} minutes`
  if (diffHours < 24) return `${diffHours} hours`
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`
  if (diffDays < 365) return `In ${Math.floor(diffDays / 30)} months`
  return date.toLocaleDateString()
}

export const formatDifficulty = (difficulty: string): string => {
  const colors = {
    again: 'var(--color-error)',
    hard: 'var(--color-warning)',
    good: 'var(--color-success)',
    easy: 'var(--color-info)'
  }
  return colors[difficulty as keyof typeof colors] || 'var(--color-gray-600)'
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'
  if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`
  return date.toLocaleDateString()
}