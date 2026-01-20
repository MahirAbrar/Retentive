import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from './ui'

/**
 * Global listener for focus goal reached events.
 * Shows toast notification when user is on a different page,
 * and always sends a system notification.
 */
export function FocusGoalNotifier() {
  const { addToast } = useToast()
  const location = useLocation()

  useEffect(() => {
    const handleGoalReached = (e: Event) => {
      const event = e as CustomEvent<{
        goalMinutes: number
        workMinutes: number
        breakMinutes: number
      }>

      const { goalMinutes } = event.detail

      // Send browser notification (requires permission)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Goal Reached!', {
          body: `You've completed your ${goalMinutes} minute focus session. Great work!`,
          icon: '/icons/icon-192x192.png'
        })
      }

      // Show toast if user is NOT on the home page (where modal shows)
      if (location.pathname !== '/') {
        addToast(
          'success',
          `Goal reached! You've completed your ${goalMinutes} minute session.`,
          8000 // Show for 8 seconds
        )
      }
    }

    window.addEventListener('focus-goal-reached', handleGoalReached)

    return () => {
      window.removeEventListener('focus-goal-reached', handleGoalReached)
    }
  }, [addToast, location.pathname])

  return null
}
