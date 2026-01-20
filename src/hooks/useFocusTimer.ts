import { useState, useEffect, useCallback, useRef } from 'react'
import {
  focusTimerService,
  calculateAdherence,
  calculateRecommendedBreak,
  getAdherenceColor,
  type FocusSession,
  type FocusSegment,
} from '../services/focusTimerService'
import { gamificationService } from '../services/gamificationService'
import { focusSessionQueue } from '../services/focusSessionQueue'
import { logger } from '../utils/logger'
import type { BreakActivity } from '../services/breakActivities'

type TimerStatus = 'idle' | 'working' | 'break'

interface TimerState {
  loading: boolean
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
  showMaxDurationModal: boolean
  showSessionRecoveryModal: boolean
  recommendedBreakMinutes: number
  breakActivityModal: { isOpen: boolean; categoryId: string | null }
  activeBreakActivity: BreakActivity | null
  breakActivityTimeRemaining: number
  isDiscarding: boolean // Flag to prevent race conditions during discard
}

export function useFocusTimer(userId: string) {
  const [state, setState] = useState<TimerState>({
    loading: true,
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
    showMaxDurationModal: false,
    showSessionRecoveryModal: false,
    recommendedBreakMinutes: 0,
    breakActivityModal: { isOpen: false, categoryId: null },
    activeBreakActivity: null,
    breakActivityTimeRemaining: 0,
    isDiscarding: false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const segmentStartTimeRef = useRef<number>(0)
  const syncLockRef = useRef<boolean>(false) // Prevent concurrent syncs
  const breakActivityIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const workPausedForBreakActivityRef = useRef<boolean>(false)
  const stateRef = useRef(state) // Ref to access current state without triggering re-renders
  stateRef.current = state

  // Focus timer limits
  const maxSessionDurationHours = 8 // Absolute maximum session duration (8 hours)
  const goalMultiplier = 1.5 // Auto-pause when reaching 1.5x the goal

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
        if (prev.status === 'working' && !prev.activeBreakActivity) {
          // Only count work time if not doing a break activity
          newState.workSeconds = prev.workSeconds + 1
        } else if (prev.status === 'break' || prev.activeBreakActivity) {
          // Count break time for regular breaks OR break activities
          newState.breakSeconds = prev.breakSeconds + 1
        }

        // Recalculate adherence
        const workMinutes = newState.workSeconds / 60
        const breakMinutes = newState.breakSeconds / 60
        newState.adherencePercentage = calculateAdherence(workMinutes, breakMinutes)
        newState.adherenceColor = getAdherenceColor(newState.adherencePercentage)

        // Check if 1.5x goal reached (auto-pause for safety)
        // Uses sessionSeconds (wall-clock time) not workSeconds
        if (
          prev.status === 'working' &&
          newState.sessionSeconds >= prev.goalMinutes * 60 * goalMultiplier &&
          !prev.showMaxDurationModal
        ) {
          newState.showMaxDurationModal = true
          newState.status = 'idle' // Auto-pause
          newState.recommendedBreakMinutes = calculateRecommendedBreak(prev.goalMinutes)
          logger.info('1.5x session duration reached, auto-pausing session')
        }

        // Check absolute maximum session duration (8 hours safety cap)
        if (newState.sessionSeconds >= maxSessionDurationHours * 3600) {
          newState.showMaxDurationModal = true
          newState.status = 'idle' // Force pause
          logger.warn('Absolute maximum session duration reached (8 hours), force pausing')
        }

        // Check if session goal reached (based on wall-clock time, not just work time)
        // Session ends when total time (work + break) reaches goal
        if (
          prev.status !== 'idle' &&
          prev.goalMinutes > 0 && // Guard against 0 or invalid goal minutes
          newState.sessionSeconds >= prev.goalMinutes * 60 &&
          !prev.showGoalReachedModal &&
          !prev.showMaxDurationModal // Don't show both modals
        ) {
          newState.showGoalReachedModal = true
          newState.recommendedBreakMinutes = calculateRecommendedBreak(
            prev.goalMinutes
          )

          // Dispatch global event for notifications (toast + system notification)
          window.dispatchEvent(new CustomEvent('focus-goal-reached', {
            detail: {
              goalMinutes: prev.goalMinutes,
              workMinutes: Math.floor(newState.workSeconds / 60),
              breakMinutes: Math.floor(newState.breakSeconds / 60),
            }
          }))
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
  // HANDLE MAX DURATION AUTO-PAUSE
  // ================================================
  useEffect(() => {
    // When max duration modal shows and we have an active segment, end it
    if (state.showMaxDurationModal && state.currentSegment && state.status === 'idle') {
      const endCurrentSegment = async () => {
        if (!state.currentSegment) return

        try {
          const durationMinutes = Math.floor(
            (Date.now() - segmentStartTimeRef.current) / 60000
          )

          await focusTimerService.endSegment(
            state.currentSegment.id,
            userId,
            durationMinutes
          )

          logger.info('Segment ended due to max duration reached')
        } catch (error) {
          logger.error('Error ending segment on max duration:', error)
        }
      }

      endCurrentSegment()
    }
  }, [state.showMaxDurationModal, state.currentSegment, state.status, userId])

  // ================================================
  // LOAD ACTIVE SESSION ON MOUNT
  // ================================================
  useEffect(() => {
    if (!userId) return

    const loadActiveSession = async () => {
      try {
        const session = await focusTimerService.getActiveSession(userId)

        // Check if this session was recently discarded (prevents race condition)
        if (session) {
          const discardedData = localStorage.getItem('focus-session-discarded')
          if (discardedData) {
            try {
              const { sessionId, timestamp } = JSON.parse(discardedData)
              const isRecent = Date.now() - timestamp < 10000 // Within 10 seconds
              if (sessionId === session.id && isRecent) {
                // Clear the discarded flag after checking
                localStorage.removeItem('focus-session-discarded')
                setState((prev) => ({
                  ...prev,
                  loading: false,
                  showSessionRecoveryModal: false,
                }))
                return
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

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
              logger.log('Found stale segment, ending it with reasonable duration')

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
                logger.error('Error ending stale segment:', error)
              }

              // Don't auto-resume from stale segments
              validActiveSegment = null
              currentStatus = 'idle'
            } else {
              // Segment is fresh, continue normally
              const segmentElapsed = Math.floor(segmentAge / 1000)

              // Cap segment elapsed to prevent integer overflow (max ~24 days in seconds)
              const MAX_SEGMENT_SECONDS = 2147483 // Just under PostgreSQL int max
              const cappedSegmentElapsed = Math.min(segmentElapsed, MAX_SEGMENT_SECONDS)

              if (activeSegment.segment_type === 'work') {
                workSeconds += cappedSegmentElapsed
                currentStatus = 'working'
              } else {
                breakSeconds += cappedSegmentElapsed
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

          // Determine if we should show recovery modal
          // Only show modal for truly stale sessions (segment was old and ended)
          const isStaleSession = validActiveSegment === null && currentStatus === 'idle'

          // Auto-end sessions that are stale AND have no meaningful work (not worth recovering)
          // Also auto-end if goal_minutes is 0 or invalid
          const hasNoMeaningfulWork = workSeconds < 60 // Less than 1 minute of work
          const hasInvalidGoal = !session.goal_minutes || session.goal_minutes <= 0
          const shouldAutoEnd = isStaleSession && (hasNoMeaningfulWork || hasInvalidGoal)

          if (shouldAutoEnd) {
            logger.log('Auto-ending stale session with no meaningful work or invalid goal')
            try {
              await focusTimerService.endSession(session.id, userId, {
                totalWorkMinutes: Math.floor(workSeconds / 60),
                totalBreakMinutes: Math.floor(breakSeconds / 60),
                adherencePercentage: adherence,
              })
            } catch (endError) {
              logger.error('Error auto-ending stale session:', endError)
            }
            // Reset state as if no session exists
            setState((prev) => ({
              ...prev,
              loading: false,
              showGoalReachedModal: false,
              showBreakCompleteModal: false,
              showMaxDurationModal: false,
              showSessionRecoveryModal: false,
            }))
            return
          }

          const shouldShowRecoveryModal = isStaleSession

          // Restore session state with calculated values
          setState((prev) => ({
            ...prev,
            loading: false,
            session,
            currentSegment: validActiveSegment, // Use validated segment (null if stale)
            goalMinutes: session.goal_minutes,
            sessionSeconds: totalElapsed,
            workSeconds,
            breakSeconds,
            adherencePercentage: adherence,
            adherenceColor: getAdherenceColor(adherence),
            status: shouldShowRecoveryModal ? 'idle' : currentStatus, // Use current status unless showing modal
            showSessionRecoveryModal: shouldShowRecoveryModal, // Only show modal for stale sessions
          }))
        } else {
          // No active session found, reset all state including modals
          setState((prev) => ({
            ...prev,
            loading: false,
            showGoalReachedModal: false,
            showBreakCompleteModal: false,
            showMaxDurationModal: false,
            showSessionRecoveryModal: false,
          }))
        }
      } catch (error) {
        logger.error('Error loading active session:', error)
        // Set loading to false even on error
        setState((prev) => ({ ...prev, loading: false }))
      }
    }

    loadActiveSession()
  }, [userId])

  // ================================================
  // SYNC PENDING COMPLETIONS ON RECONNECT
  // ================================================
  useEffect(() => {
    if (!userId) return

    const processPendingCompletions = async () => {
      if (!focusSessionQueue.hasPending()) return

      logger.log('Processing pending session completions...')
      const processed = await focusSessionQueue.processQueue(
        async (sessionId, queuedUserId, finalStats) => {
          // Only process if it's this user's session
          if (queuedUserId !== userId) return
          await focusTimerService.endSession(sessionId, queuedUserId, finalStats)
        }
      )

      if (processed > 0) {
        logger.log(`Synced ${processed} pending session completion(s)`)
      }
    }

    // Process on mount if online
    if (navigator.onLine) {
      processPendingCompletions()
    }

    // Process when coming back online
    const handleOnline = () => {
      logger.log('Back online, checking for pending completions')
      processPendingCompletions()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [userId])

  // ================================================
  // LISTEN FOR SESSION EVENTS FROM OTHER INSTANCES
  // ================================================
  useEffect(() => {
    const handleSessionEnded = (e: Event) => {
      const event = e as CustomEvent
      // Only reset if it's our session that ended
      if (state.session?.id === event.detail.sessionId) {
        logger.log('Session ended in another tab/component, syncing...')
        resetSession()
      }
    }

    const handleSessionBreak = (e: Event) => {
      const event = e as CustomEvent
      if (state.session?.id === event.detail.sessionId && state.status !== 'break') {
        logger.log('Session switched to break in another tab/component')
        setState(prev => ({ ...prev, status: 'break' }))
      }
    }

    const handleSessionWork = (e: Event) => {
      const event = e as CustomEvent
      if (state.session?.id === event.detail.sessionId && state.status !== 'working') {
        logger.log('Session switched to work in another tab/component')
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
  // Only runs when there's an active session to save energy
  // ================================================
  useEffect(() => {
    // Skip if no user OR no active session - saves energy when idle
    if (!userId || !state.session) return

    // Skip validation when page is hidden to save energy
    const isPageVisible = () => !document.hidden

    const validateSession = async () => {
      // Skip if page is hidden
      if (!isPageVisible()) return

      try {
        // Check if session is still active in database
        const activeSession = await focusTimerService.getActiveSession(userId)

        // CASE 1: Have a session, but it no longer exists or is inactive in database
        if (!activeSession || activeSession.id !== state.session?.id || !activeSession.is_active) {
          logger.log('Session no longer active in database, syncing state...')
          resetSession()
          return
        }

        // CASE 2: Both have session, sync status based on active segment
        const activeSegment = await focusTimerService.getActiveSegment(activeSession.id, userId)

        if (activeSegment && !activeSegment.ended_at) {
          // There's an active segment, sync status
          const expectedStatus = activeSegment.segment_type === 'work' ? 'working' : 'break'
          if (state.status !== expectedStatus) {
            logger.log(`Syncing status from database: ${state.status} → ${expectedStatus}`)
            setState(prev => ({
              ...prev,
              status: expectedStatus,
              currentSegment: activeSegment
            }))
          }
        } else if (state.status !== 'idle') {
          // No active segment, should be idle
          logger.log('No active segment in database, setting status to idle')
          setState(prev => ({
            ...prev,
            status: 'idle',
            currentSegment: null
          }))
        }
      } catch (error) {
        // Ignore errors during validation (likely offline)
        logger.debug('Session validation skipped:', error)
      }
    }

    // Check every 15 seconds (increased from 5s to save energy)
    const interval = setInterval(validateSession, 15000)

    // Handle visibility change - validate when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        validateSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also validate immediately
    validateSession()

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [state.currentSegment, state.status, userId])

  // ================================================
  // HANDLE VISIBILITY CHANGE - Sync when tab is hidden
  // ================================================
  useEffect(() => {
    // Only set up listener if we have an active session
    if (!state.session || state.status === 'idle') return

    const handleVisibilityChange = async () => {
      const currentState = stateRef.current
      if (!document.hidden || !currentState.currentSegment || currentState.status === 'idle') return
      if (!navigator.onLine || syncLockRef.current) return

      // Sync current progress when tab becomes hidden
      if (currentState.session) {
        syncLockRef.current = true
        try {
          await focusTimerService.syncSession(
            currentState.session.id,
            userId,
            {
              totalWorkMinutes: Math.floor(currentState.workSeconds / 60),
              totalBreakMinutes: Math.floor(currentState.breakSeconds / 60),
              adherencePercentage: currentState.adherencePercentage,
              currentSegmentType: currentState.status === 'working' ? 'work' : 'break',
              currentSegmentId: currentState.currentSegment.id,
            }
          )
        } catch {
          // Silently ignore sync errors on visibility change
        } finally {
          syncLockRef.current = false
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.session?.id, state.status, userId])

  // ================================================
  // DATABASE WRITES - Only on important state changes, not periodic
  // ================================================
  // Writes are expensive, so we only sync:
  // 1. When visibility changes (tab hidden) - safety backup
  // 2. When session ends (stopSession)
  // 3. When segments change (startWorking, startBreak)
  // The periodic sync has been removed to reduce unnecessary writes.

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
        logger.error('Error starting work session:', error)
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
          logger.error('Cannot start break: no active session')
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
        logger.error('Error starting break:', error)
      }
    },
    [userId, state.session, state.currentSegment, state.status]
  )

  // ================================================
  // STOP SESSION
  // ================================================
  const stopSession = useCallback(async () => {
    const workMinutes = Math.floor(state.workSeconds / 60)
    const breakMinutes = Math.floor(state.breakSeconds / 60)

    // Helper to check if error is network-related
    const isNetworkError = (error: unknown): boolean => {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        return msg.includes('fetch') ||
               msg.includes('network') ||
               msg.includes('offline') ||
               msg.includes('err_internet_disconnected') ||
               msg.includes('failed to fetch')
      }
      return !navigator.onLine
    }

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

      // Calculate and award points with penalty
      const pointsResult = await gamificationService.awardFocusSessionPoints(
        userId,
        workMinutes,
        state.adherencePercentage
      )

      // End session
      if (state.session) {
        const finalStats = {
          totalWorkMinutes: workMinutes,
          totalBreakMinutes: breakMinutes,
          adherencePercentage: state.adherencePercentage,
          isIncomplete: pointsResult.isIncomplete,
          pointsEarned: pointsResult.netPoints,
          pointsPenalty: pointsResult.penalty,
        }

        try {
          await focusTimerService.endSession(state.session.id, userId, finalStats)
        } catch (endError) {
          // If network error, queue for later
          if (isNetworkError(endError)) {
            logger.log('Network error ending session, queuing for later sync')
            focusSessionQueue.enqueue({
              sessionId: state.session.id,
              userId,
              finalStats,
            })
          } else {
            throw endError
          }
        }

        // Broadcast session ended event for other timer instances
        window.dispatchEvent(new CustomEvent('focus-session-ended', {
          detail: {
            sessionId: state.session.id,
            userId
          }
        }))
      }

      // Return final stats for summary modal (including points info)
      return {
        sessionMinutes: Math.floor(state.sessionSeconds / 60),
        workMinutes,
        breakMinutes,
        adherencePercentage: state.adherencePercentage,
        adherenceColor: state.adherenceColor,
        // Points breakdown
        basePoints: pointsResult.basePoints,
        pointsPenalty: pointsResult.penalty,
        netPoints: pointsResult.netPoints,
        penaltyRate: pointsResult.penaltyRate,
        isIncomplete: pointsResult.isIncomplete,
      }
    } catch (error) {
      // If network error during the entire flow, still return stats
      // so user sees the summary (data queued for sync)
      if (isNetworkError(error) && state.session) {
        logger.log('Network error during session stop, queuing completion')
        focusSessionQueue.enqueue({
          sessionId: state.session.id,
          userId,
          finalStats: {
            totalWorkMinutes: workMinutes,
            totalBreakMinutes: breakMinutes,
            adherencePercentage: state.adherencePercentage,
          },
        })

        // Return basic stats even if network failed
        return {
          sessionMinutes: Math.floor(state.sessionSeconds / 60),
          workMinutes,
          breakMinutes,
          adherencePercentage: state.adherencePercentage,
          adherenceColor: state.adherenceColor,
          basePoints: 0,
          pointsPenalty: 0,
          netPoints: 0,
          penaltyRate: 0,
          isIncomplete: false,
        }
      }

      logger.error('Error stopping session:', error)
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

    // Reset sync lock
    syncLockRef.current = false

    setState({
      loading: false,
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
      showMaxDurationModal: false,
      showSessionRecoveryModal: false,
      recommendedBreakMinutes: 0,
      breakActivityModal: { isOpen: false, categoryId: null },
      activeBreakActivity: null,
      breakActivityTimeRemaining: 0,
      isDiscarding: false,
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

  const closeMaxDurationModal = useCallback(() => {
    setState((prev) => ({ ...prev, showMaxDurationModal: false }))
  }, [])

  // ================================================
  // SESSION RECOVERY CONTROLS
  // ================================================
  const resumeSession = useCallback(() => {
    // Resume the session where it left off
    setState((prev) => ({
      ...prev,
      status: prev.currentSegment?.segment_type === 'work' ? 'working' : 'break',
      showSessionRecoveryModal: false,
    }))

    // Update segment start time for proper tracking
    if (state.currentSegment) {
      segmentStartTimeRef.current = new Date(state.currentSegment.started_at).getTime()
    }

    logger.info('Session resumed from recovery modal')
  }, [state.currentSegment])

  const discardSession = useCallback(async () => {
    // Set discarding flag immediately to prevent race conditions
    setState(prev => ({ ...prev, isDiscarding: true, showSessionRecoveryModal: false }))

    // End the session and reset
    try {
      if (state.session) {
        logger.log('Discarding session:', state.session.id)
        const workMinutes = Math.floor(state.workSeconds / 60)
        const breakMinutes = Math.floor(state.breakSeconds / 60)

        const endedSession = await focusTimerService.endSession(state.session.id, userId, {
          totalWorkMinutes: workMinutes,
          totalBreakMinutes: breakMinutes,
          adherencePercentage: state.adherencePercentage,
        })

        logger.log('Session discarded successfully')

        // Store discarded session ID to prevent race conditions with other instances
        // This will be checked by loadActiveSession in other hook instances
        localStorage.setItem('focus-session-discarded', JSON.stringify({
          sessionId: state.session.id,
          timestamp: Date.now()
        }))

        // Broadcast session ended event for other timer instances
        window.dispatchEvent(new CustomEvent('focus-session-ended', {
          detail: {
            sessionId: state.session.id,
            userId
          }
        }))
      } else {
        logger.warn('No session to discard')
      }
    } catch (error) {
      logger.error('Error discarding session:', error)
    }

    resetSession()
  }, [state.session, state.workSeconds, state.breakSeconds, state.adherencePercentage, userId, resetSession])

  // ================================================
  // BREAK ACTIVITY CONTROLS
  // ================================================
  const openBreakActivityModal = useCallback((categoryId: string) => {
    setState((prev) => ({
      ...prev,
      breakActivityModal: { isOpen: true, categoryId },
    }))
  }, [])

  const closeBreakActivityModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      breakActivityModal: { isOpen: false, categoryId: null },
    }))
  }, [])

  const startBreakActivity = useCallback((activity: BreakActivity) => {
    // Pause work timer if working
    if (state.status === 'working') {
      workPausedForBreakActivityRef.current = true
    }

    setState((prev) => ({
      ...prev,
      activeBreakActivity: activity,
      breakActivityTimeRemaining: activity.durationMinutes * 60,
    }))

    logger.info(`Started break activity: ${activity.name} (${activity.durationMinutes} min)`)
  }, [state.status])

  const completeBreakActivity = useCallback(() => {
    if (breakActivityIntervalRef.current) {
      clearInterval(breakActivityIntervalRef.current)
      breakActivityIntervalRef.current = null
    }

    workPausedForBreakActivityRef.current = false

    setState((prev) => ({
      ...prev,
      activeBreakActivity: null,
      breakActivityTimeRemaining: 0,
    }))

    logger.info('Break activity completed')
  }, [])

  // ================================================
  // BREAK ACTIVITY TIMER TICK
  // ================================================
  useEffect(() => {
    if (!state.activeBreakActivity || state.breakActivityTimeRemaining <= 0) {
      if (breakActivityIntervalRef.current) {
        clearInterval(breakActivityIntervalRef.current)
        breakActivityIntervalRef.current = null
      }
      return
    }

    breakActivityIntervalRef.current = setInterval(() => {
      setState((prev) => {
        const newTimeRemaining = prev.breakActivityTimeRemaining - 1

        if (newTimeRemaining <= 0) {
          // Auto-complete when timer ends
          setTimeout(() => completeBreakActivity(), 100)
          return { ...prev, breakActivityTimeRemaining: 0 }
        }

        return { ...prev, breakActivityTimeRemaining: newTimeRemaining }
      })
    }, 1000)

    return () => {
      if (breakActivityIntervalRef.current) {
        clearInterval(breakActivityIntervalRef.current)
      }
    }
  }, [state.activeBreakActivity, state.breakActivityTimeRemaining, completeBreakActivity])

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
  // Progress based on total session time (wall-clock), not just work time
  const goalProgress = (state.sessionSeconds / (state.goalMinutes * 60)) * 100
  // Calculate remaining time in the session
  const remainingSeconds = Math.max(0, (state.goalMinutes * 60) - state.sessionSeconds)
  const remainingTime = getFormattedTime(remainingSeconds)

  return {
    // State
    loading: state.loading,
    status: state.status,
    sessionTime,
    workTime,
    breakTime,
    remainingTime, // Time remaining in the session (countdown)
    goalMinutes: state.goalMinutes,
    goalProgress: Math.min(goalProgress, 100),
    adherencePercentage: state.adherencePercentage,
    adherenceColor: state.adherenceColor,
    showGoalReachedModal: state.showGoalReachedModal,
    showBreakCompleteModal: state.showBreakCompleteModal,
    showMaxDurationModal: state.showMaxDurationModal,
    showSessionRecoveryModal: state.showSessionRecoveryModal,
    recommendedBreakMinutes: state.recommendedBreakMinutes,
    session: state.session,
    breakActivityModal: state.breakActivityModal,
    activeBreakActivity: state.activeBreakActivity,
    breakActivityTimeRemaining: state.breakActivityTimeRemaining,

    // Actions
    startWorking,
    startBreak,
    stopSession,
    resetSession,
    setGoalMinutes,
    closeGoalReachedModal,
    closeBreakCompleteModal,
    closeMaxDurationModal,
    resumeSession,
    discardSession,
    openBreakActivityModal,
    closeBreakActivityModal,
    startBreakActivity,
    completeBreakActivity,
  }
}