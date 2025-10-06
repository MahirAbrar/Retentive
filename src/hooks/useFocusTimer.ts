import { useState, useEffect, useCallback, useRef } from 'react'
import {
  focusTimerService,
  calculateAdherence,
  calculateRecommendedBreak,
  getAdherenceColor,
  type FocusSession,
  type FocusSegment,
} from '../services/focusTimerService'

type TimerStatus = 'idle' | 'working' | 'break'

interface TimerState {
  status: TimerStatus
  sessionSeconds: number  // Total session time (work + break)
  workSeconds: number
  breakSeconds: number
  goalMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  session: FocusSession | null
  currentSegment: FocusSegment | null
  showGoalReachedModal: boolean
  showBreakCompleteModal: boolean
  recommendedBreakMinutes: number
}

export function useFocusTimer(userId: string) {
  const [state, setState] = useState<TimerState>({
    status: 'idle',
    sessionSeconds: 0,
    workSeconds: 0,
    breakSeconds: 0,
    goalMinutes: 60,
    adherencePercentage: 100,
    adherenceColor: getAdherenceColor(100),
    session: null,
    currentSegment: null,
    showGoalReachedModal: false,
    showBreakCompleteModal: false,
    recommendedBreakMinutes: 0,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const segmentStartTimeRef = useRef<number>(0)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const syncRetryCount = useRef<number>(0)
  const maxSyncRetries = 3

  // ================================================
  // TIMER TICK - Updates every second
  // ================================================
  useEffect(() => {
    if (state.status === 'idle') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const newState = { ...prev }

        // Always increment session time when not idle
        if (prev.status !== 'idle') {
          newState.sessionSeconds = prev.sessionSeconds + 1
        }

        // Update appropriate timer based on status
        if (prev.status === 'working') {
          newState.workSeconds = prev.workSeconds + 1
        } else if (prev.status === 'break') {
          newState.breakSeconds = prev.breakSeconds + 1
        }

        // Recalculate adherence
        const workMinutes = newState.workSeconds / 60
        const breakMinutes = newState.breakSeconds / 60
        newState.adherencePercentage = calculateAdherence(workMinutes, breakMinutes)
        newState.adherenceColor = getAdherenceColor(newState.adherencePercentage)

        // Check if goal reached (only while working)
        if (
          prev.status === 'working' &&
          newState.workSeconds >= prev.goalMinutes * 60 &&
          !prev.showGoalReachedModal
        ) {
          newState.showGoalReachedModal = true
          newState.recommendedBreakMinutes = calculateRecommendedBreak(
            prev.goalMinutes
          )
        }

        return newState
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state.status, state.goalMinutes, state.showGoalReachedModal])

  // ================================================
  // LOAD ACTIVE SESSION ON MOUNT
  // ================================================
  useEffect(() => {
    if (!userId) return

    const loadActiveSession = async () => {
      try {
        const session = await focusTimerService.getActiveSession(userId)
        if (session) {
          // Get active segment to determine current status
          const activeSegment = await focusTimerService.getActiveSegment(session.id, userId)

          // Calculate elapsed times from timestamps
          const sessionStarted = new Date(session.started_at)
          const totalElapsed = Math.floor((Date.now() - sessionStarted.getTime()) / 1000)

          // Get all segments for accurate calculation
          const segments = await focusTimerService.getSessionSegments(session.id, userId)

          // Calculate completed segment times
          let completedWorkSeconds = 0
          let completedBreakSeconds = 0

          segments.forEach(segment => {
            if (segment.ended_at && segment.duration_minutes) {
              if (segment.segment_type === 'work') {
                completedWorkSeconds += segment.duration_minutes * 60
              } else {
                completedBreakSeconds += segment.duration_minutes * 60
              }
            }
          })

          // Add time from active segment if exists
          let currentStatus: 'idle' | 'working' | 'break' = 'idle'
          let workSeconds = completedWorkSeconds
          let breakSeconds = completedBreakSeconds
          let validActiveSegment = activeSegment

          if (activeSegment && !activeSegment.ended_at) {
            const segmentAge = Date.now() - new Date(activeSegment.started_at).getTime()
            const maxSegmentAge = 2 * 60 * 60 * 1000 // 2 hours

            // Check if segment is stale (app was closed for too long)
            if (segmentAge > maxSegmentAge) {
              console.log('Found stale segment, ending it with reasonable duration')

              // End the stale segment with a reasonable duration
              const reasonableDuration = activeSegment.segment_type === 'break'
                ? Math.min(Math.floor(segmentAge / 60000), 30) // Cap breaks at 30 minutes
                : Math.min(Math.floor(segmentAge / 60000), 120) // Cap work at 2 hours

              try {
                await focusTimerService.endSegment(
                  activeSegment.id,
                  userId,
                  reasonableDuration
                )

                if (activeSegment.segment_type === 'work') {
                  workSeconds += reasonableDuration * 60
                } else {
                  breakSeconds += reasonableDuration * 60
                }
              } catch (error) {
                console.error('Error ending stale segment:', error)
              }

              // Don't auto-resume from stale segments
              validActiveSegment = null
              currentStatus = 'idle'
            } else {
              // Segment is fresh, continue normally
              const segmentElapsed = Math.floor(segmentAge / 1000)

              if (activeSegment.segment_type === 'work') {
                workSeconds += segmentElapsed
                currentStatus = 'working'
              } else {
                breakSeconds += segmentElapsed
                currentStatus = 'break'
              }

              // Store segment start time for proper tracking
              segmentStartTimeRef.current = new Date(activeSegment.started_at).getTime()
            }
          }

          // Calculate adherence
          const workMinutes = workSeconds / 60
          const breakMinutes = breakSeconds / 60
          const adherence = calculateAdherence(workMinutes, breakMinutes)

          // Restore session state with calculated values
          setState((prev) => ({
            ...prev,
            session,
            currentSegment: validActiveSegment, // Use validated segment (null if stale)
            goalMinutes: session.goal_minutes,
            sessionSeconds: totalElapsed,
            workSeconds,
            breakSeconds,
            adherencePercentage: adherence,
            adherenceColor: getAdherenceColor(adherence),
            status: currentStatus, // Auto-resume only if segment is valid
          }))
        }
      } catch (error) {
        console.error('Error loading active session:', error)
      }
    }

    loadActiveSession()
  }, [userId])

  // ================================================
  // LISTEN FOR SESSION EVENTS FROM OTHER INSTANCES
  // ================================================
  useEffect(() => {
    const handleSessionEnded = (e: Event) => {
      const event = e as CustomEvent
      // Only reset if it's our session that ended
      if (state.session?.id === event.detail.sessionId) {
        console.log('Session ended in another tab/component, syncing...')
        resetSession()
      }
    }

    const handleSessionBreak = (e: Event) => {
      const event = e as CustomEvent
      if (state.session?.id === event.detail.sessionId && state.status !== 'break') {
        console.log('Session switched to break in another tab/component')
        setState(prev => ({ ...prev, status: 'break' }))
      }
    }

    const handleSessionWork = (e: Event) => {
      const event = e as CustomEvent
      if (state.session?.id === event.detail.sessionId && state.status !== 'working') {
        console.log('Session switched to work in another tab/component')
        setState(prev => ({ ...prev, status: 'working' }))
      }
    }

    window.addEventListener('focus-session-ended', handleSessionEnded)
    window.addEventListener('focus-session-break', handleSessionBreak)
    window.addEventListener('focus-session-work', handleSessionWork)

    return () => {
      window.removeEventListener('focus-session-ended', handleSessionEnded)
      window.removeEventListener('focus-session-break', handleSessionBreak)
      window.removeEventListener('focus-session-work', handleSessionWork)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session?.id, state.status])

  // ================================================
  // PERIODIC SESSION VALIDATION (Fallback)
  // ================================================
  useEffect(() => {
    // Skip if no session or idle
    if (!state.session || state.status === 'idle' || !userId) return

    const validateSession = async () => {
      try {
        // Check if session is still active in database
        const activeSession = await focusTimerService.getActiveSession(userId)

        // If no active session or different session ID, reset
        if (!activeSession || activeSession.id !== state.session?.id || !activeSession.is_active) {
          console.log('Session no longer active in database, syncing state...')
          resetSession()
        }
      } catch (error) {
        // Ignore errors during validation (likely offline)
        console.debug('Session validation skipped:', error)
      }
    }

    // Check every 5 seconds
    const interval = setInterval(validateSession, 5000)

    // Also validate immediately
    validateSession()

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session?.id, state.status, userId])

  // ================================================
  // HANDLE APP CLOSE - End active segments
  // ================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // End active segment if exists
      if (state.currentSegment && state.status !== 'idle') {
        const durationMinutes = Math.floor(
          (Date.now() - segmentStartTimeRef.current) / 60000
        )

        // Try quick end segment method
        focusTimerService.quickEndSegment(
          state.currentSegment.id,
          userId,
          durationMinutes
        )

        // For Electron, we might need to delay close slightly
        if (window.electronAPI) {
          e.preventDefault()
          e.returnValue = ''

          // End segment then allow close
          focusTimerService.quickEndSegment(
            state.currentSegment.id,
            userId,
            durationMinutes
          ).finally(() => {
            window.close()
          })
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Also handle visibility change (mobile browsers, tab switches)
    const handleVisibilityChange = () => {
      if (document.hidden && state.currentSegment && state.status !== 'idle') {
        // Only sync if online
        if (!navigator.onLine) {
          console.log('Tab hidden but offline - skipping sync')
          return
        }

        // Update segment duration so far (don't end it)
        if (state.session) {
          focusTimerService.syncSession(
            state.session.id,
            userId,
            {
              totalWorkMinutes: Math.floor(state.workSeconds / 60),
              totalBreakMinutes: Math.floor(state.breakSeconds / 60),
              adherencePercentage: state.adherencePercentage,
              currentSegmentType: state.status === 'working' ? 'work' : 'break',
              currentSegmentId: state.currentSegment.id,
            }
          ).catch((error: unknown) => {
            // Only log network errors once
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (!errorMessage.includes('ERR_INTERNET_DISCONNECTED')) {
              console.error('Error syncing on visibility change:', error)
            }
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.currentSegment, state.status, state.session, state.workSeconds, state.breakSeconds, state.adherencePercentage, userId])

  // ================================================
  // PERIODIC DATABASE SYNC - Every 30 seconds
  // ================================================
  useEffect(() => {
    // Only sync if we have an active session and it's running
    if (!state.session || state.status === 'idle') {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      syncRetryCount.current = 0 // Reset retry count when idle
      return
    }

    // Sync function with online check and retry logic
    const syncToDatabase = async () => {
      if (!state.session || state.status === 'idle') return

      // Check if online before attempting sync
      if (!navigator.onLine) {
        console.log('Offline - skipping focus timer sync')
        return
      }

      // Skip if we've exceeded retry limit
      if (syncRetryCount.current >= maxSyncRetries) {
        console.log('Max sync retries reached, waiting for next interval')
        return
      }

      try {
        await focusTimerService.syncSession(
          state.session.id,
          userId,
          {
            totalWorkMinutes: Math.floor(state.workSeconds / 60),
            totalBreakMinutes: Math.floor(state.breakSeconds / 60),
            adherencePercentage: state.adherencePercentage,
            currentSegmentType: state.status === 'working' ? 'work' : state.status === 'break' ? 'break' : null,
            currentSegmentId: state.currentSegment?.id || null,
          }
        )
        // Reset retry count on success
        syncRetryCount.current = 0
      } catch (error: unknown) {
        // Only log and count retries for network errors
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('Failed to fetch')) {
          syncRetryCount.current++
          console.log(`Focus timer sync failed (attempt ${syncRetryCount.current}/${maxSyncRetries}):`, errorMessage)
        } else {
          // For other errors, log but don't spam
          console.error('Error syncing session to database:', error)
        }
      }
    }

    // Sync immediately on status change (if online)
    if (navigator.onLine) {
      syncToDatabase()
    }

    // Set up periodic sync every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      // Reset retry count on each interval
      syncRetryCount.current = 0
      syncToDatabase()
    }, 30000)

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Connection restored - syncing focus timer')
      syncRetryCount.current = 0
      syncToDatabase()
    }

    const handleOffline = () => {
      console.log('Connection lost - pausing focus timer sync')
      syncRetryCount.current = maxSyncRetries // Prevent retries while offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (syncIntervalRef.current) {
        // Final sync before cleanup (if online)
        if (navigator.onLine) {
          syncToDatabase()
        }
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [
    state.session,
    state.status,
    state.workSeconds,
    state.breakSeconds,
    state.adherencePercentage,
    state.currentSegment,
    userId,
  ])

  // ================================================
  // START WORKING
  // ================================================
  const startWorking = useCallback(
    async (goalMinutes?: number) => {
      try {
        const goal = goalMinutes || state.goalMinutes

        // Create session if none exists
        let session = state.session
        if (!session) {
          session = await focusTimerService.createSession(userId, goal)
        }

        // Create work segment
        const segment = await focusTimerService.createSegment(
          session.id,
          userId,
          'work'
        )

        segmentStartTimeRef.current = Date.now()

        setState((prev) => ({
          ...prev,
          status: 'working',
          session,
          currentSegment: segment,
          goalMinutes: goal,
          showGoalReachedModal: false,
        }))

        // Broadcast session work event
        window.dispatchEvent(new CustomEvent('focus-session-work', {
          detail: {
            sessionId: session.id,
            userId
          }
        }))
      } catch (error) {
        console.error('Error starting work session:', error)
      }
    },
    [userId, state.session, state.goalMinutes]
  )

  // ================================================
  // START BREAK
  // ================================================
  const startBreak = useCallback(
    async (recommendedMinutes?: number) => {
      try {
        // End current work segment if exists
        if (state.currentSegment && state.status === 'working') {
          const durationMinutes = Math.floor(
            (Date.now() - segmentStartTimeRef.current) / 60000
          )
          await focusTimerService.endSegment(
            state.currentSegment.id,
            userId,
            durationMinutes
          )
        }

        // Create break segment
        if (!state.session) {
          console.error('Cannot start break: no active session')
          return
        }
        const segment = await focusTimerService.createSegment(
          state.session.id,
          userId,
          'break'
        )

        segmentStartTimeRef.current = Date.now()

        setState((prev) => ({
          ...prev,
          status: 'break',
          currentSegment: segment,
          showGoalReachedModal: false,
          recommendedBreakMinutes: recommendedMinutes || prev.recommendedBreakMinutes,
        }))

        // Broadcast session break event
        window.dispatchEvent(new CustomEvent('focus-session-break', {
          detail: {
            sessionId: state.session.id,
            userId
          }
        }))

        // Set timer for break completion
        if (recommendedMinutes) {
          setTimeout(() => {
            setState((prev) => ({
              ...prev,
              showBreakCompleteModal: true,
            }))
          }, recommendedMinutes * 60 * 1000)
        }
      } catch (error) {
        console.error('Error starting break:', error)
      }
    },
    [userId, state.session, state.currentSegment, state.status]
  )

  // ================================================
  // STOP SESSION
  // ================================================
  const stopSession = useCallback(async () => {
    try {
      // End current segment
      if (state.currentSegment) {
        const durationMinutes = Math.floor(
          (Date.now() - segmentStartTimeRef.current) / 60000
        )
        await focusTimerService.endSegment(
          state.currentSegment.id,
          userId,
          durationMinutes
        )
      }

      // End session
      if (state.session) {
        const workMinutes = Math.floor(state.workSeconds / 60)
        const breakMinutes = Math.floor(state.breakSeconds / 60)

        await focusTimerService.endSession(state.session.id, userId, {
          totalWorkMinutes: workMinutes,
          totalBreakMinutes: breakMinutes,
          adherencePercentage: state.adherencePercentage,
        })

        // Broadcast session ended event for other timer instances
        window.dispatchEvent(new CustomEvent('focus-session-ended', {
          detail: {
            sessionId: state.session.id,
            userId
          }
        }))
      }

      // Return final stats for summary modal
      return {
        sessionMinutes: Math.floor(state.sessionSeconds / 60),
        workMinutes: Math.floor(state.workSeconds / 60),
        breakMinutes: Math.floor(state.breakSeconds / 60),
        adherencePercentage: state.adherencePercentage,
        adherenceColor: state.adherenceColor,
      }
    } catch (error) {
      console.error('Error stopping session:', error)
      return null
    }
  }, [
    userId,
    state.session,
    state.currentSegment,
    state.sessionSeconds,
    state.workSeconds,
    state.breakSeconds,
    state.adherencePercentage,
    state.adherenceColor,
  ])

  // ================================================
  // RESET SESSION
  // ================================================
  const resetSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    setState({
      status: 'idle',
      sessionSeconds: 0,
      workSeconds: 0,
      breakSeconds: 0,
      goalMinutes: 60,
      adherencePercentage: 100,
      adherenceColor: getAdherenceColor(100),
      session: null,
      currentSegment: null,
      showGoalReachedModal: false,
      showBreakCompleteModal: false,
      recommendedBreakMinutes: 0,
    })
  }, [])

  // ================================================
  // UPDATE GOAL MINUTES
  // ================================================
  const setGoalMinutes = useCallback((minutes: number) => {
    if (minutes > 0 && minutes <= 480) { // Max 8 hours
      setState((prev) => ({ ...prev, goalMinutes: minutes }))
    }
  }, [])

  // ================================================
  // MODAL CONTROLS
  // ================================================
  const closeGoalReachedModal = useCallback(() => {
    setState((prev) => ({ ...prev, showGoalReachedModal: false }))
  }, [])

  const closeBreakCompleteModal = useCallback(() => {
    setState((prev) => ({ ...prev, showBreakCompleteModal: false }))
  }, [])

  // ================================================
  // FORMATTED TIME GETTERS
  // ================================================
  const getFormattedTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return {
      hours,
      minutes,
      seconds: secs,
      display: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0'
      )}:${String(secs).padStart(2, '0')}`,
    }
  }, [])

  const sessionTime = getFormattedTime(state.sessionSeconds)
  const workTime = getFormattedTime(state.workSeconds)
  const breakTime = getFormattedTime(state.breakSeconds)
  const goalProgress = (state.workSeconds / (state.goalMinutes * 60)) * 100

  return {
    // State
    status: state.status,
    sessionTime,
    workTime,
    breakTime,
    goalMinutes: state.goalMinutes,
    goalProgress: Math.min(goalProgress, 100),
    adherencePercentage: state.adherencePercentage,
    adherenceColor: state.adherenceColor,
    showGoalReachedModal: state.showGoalReachedModal,
    showBreakCompleteModal: state.showBreakCompleteModal,
    recommendedBreakMinutes: state.recommendedBreakMinutes,
    session: state.session,

    // Actions
    startWorking,
    startBreak,
    stopSession,
    resetSession,
    setGoalMinutes,
    closeGoalReachedModal,
    closeBreakCompleteModal,
  }
}