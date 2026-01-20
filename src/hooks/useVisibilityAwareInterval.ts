import { useEffect, useRef } from 'react'

/**
 * A hook that runs an interval, but automatically pauses when the page is hidden
 * This saves energy by not running timers when the app is in the background
 *
 * @param callback - Function to run on each interval
 * @param delay - Delay in milliseconds (null to pause)
 * @param runWhenHidden - If true, runs even when page is hidden (default: false)
 */
export function useVisibilityAwareInterval(
  callback: () => void,
  delay: number | null,
  runWhenHidden: boolean = false
) {
  const savedCallback = useRef(callback)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(!document.hidden)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    // Don't schedule if no delay is specified or if delay is null
    if (delay === null) {
      return
    }

    const startInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      intervalRef.current = setInterval(() => savedCallback.current(), delay)
    }

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      isVisibleRef.current = isVisible

      if (runWhenHidden) {
        // Always run regardless of visibility
        return
      }

      if (isVisible) {
        // Page became visible - start interval
        startInterval()
        // Run callback immediately when becoming visible
        savedCallback.current()
      } else {
        // Page became hidden - stop interval to save energy
        stopInterval()
      }
    }

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start interval if page is visible or if runWhenHidden is true
    if (isVisibleRef.current || runWhenHidden) {
      startInterval()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopInterval()
    }
  }, [delay, runWhenHidden])
}
