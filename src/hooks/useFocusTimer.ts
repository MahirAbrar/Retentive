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
import type { BreakActivity } from '../config/breakActivities'

type TimerStatus = 'idle' | 'working' | 'break'

const TIMER_STATE_KEY = 'focus-timer-state'

interface PersistedTimerState {
  sessionId: string
  userId: string
  goalMinutes: number
  workSeconds: number
  breakSeconds: number
  sessionSeconds: number
  status: TimerStatus
  startedAt: string
  lastUpdatedAt: string
}

function saveTimerState(data: PersistedTimerState) {
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(data))
  } catch { /* ignore quota errors */ }
}

function loadTimerState(): PersistedTimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearTimerState() {
  localStorage.removeItem(TIMER_STATE_KEY)
}

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

  // Max duration auto-pause is handled by the timer tick effect above (lines 110-128)

  // ================================================
  // LOAD ACTIVE SESSION ON MOUNT (localStorage first, DB fallback)
  // ================================================
  useEffect(() => {
    if (!userId) return

    const loadActiveSession = async () => {
      try {
        // Check localStorage for in-progress session
        const persisted = loadTimerState()

        if (persisted && persisted.userId === userId && persisted.status !== 'idle') {
          // Calculate how long since last update
          const timeSinceUpdate = Date.now() - new Date(persisted.lastUpdatedAt).getTime()
          const maxStaleAge = 2 * 60 * 60 * 1000 // 2 hours

          if (timeSinceUpdate > maxStaleAge) {
            // Session is too old — auto-end it in DB and clear
            logger.log('Found stale localStorage session, auto-ending')
            const adherence = calculateAdherence(persisted.workSeconds / 60, persisted.breakSeconds / 60)

            if (persisted.workSeconds >= 60) {
              // Has meaningful work — end it in DB
              try {
                await focusTimerService.endSession(persisted.sessionId, userId, {
                  totalWorkMinutes: Math.floor(persisted.workSeconds / 60),
                  totalBreakMinutes: Math.floor(persisted.breakSeconds / 60),
                  adherencePercentage: adherence,
                })
              } catch (e) {
                logger.error('Error auto-ending stale session:', e)
              }
            }

            clearTimerState()
            setState(prev => ({ ...prev, loading: false }))
            return
          }

          // Session is fresh enough — show recovery modal
          const adherence = calculateAdherence(persisted.workSeconds / 60, persisted.breakSeconds / 60)

          // Verify our session still exists in DB
          const dbSession = await focusTimerService.getActiveSession(userId)
          if (!dbSession) {
            // No active session in DB at all — clear localStorage
            clearTimerState()
            setState(prev => ({ ...prev, loading: false }))
            return
          }
          if (dbSession.id !== persisted.sessionId) {
            // DB has a different active session (from another device) — clear our stale localStorage, don't touch their session
            clearTimerState()
            setState(prev => ({ ...prev, loading: false }))
            return
          }

          setState(prev => ({
            ...prev,
            loading: false,
            session: dbSession,
            currentSegment: null,
            goalMinutes: persisted.goalMinutes,
            sessionSeconds: persisted.sessionSeconds,
            workSeconds: persisted.workSeconds,
            breakSeconds: persisted.breakSeconds,
            adherencePercentage: adherence,
            adherenceColor: getAdherenceColor(adherence),
            status: 'idle', // Pause until user confirms recovery
            showSessionRecoveryModal: true,
          }))
          return
        }

        // No localStorage state — check DB for orphaned sessions
        const session = await focusTimerService.getActiveSession(userId)
        if (session) {
          const sessionAge = Date.now() - new Date(session.started_at).getTime()
          const maxAge = 2 * 60 * 60 * 1000 // 2 hours

          if (sessionAge > maxAge) {
            // Stale session (>2h) with no localStorage on any device — safe to auto-end
            logger.log('Found stale orphaned DB session, auto-ending')
            try {
              await focusTimerService.endSession(session.id, userId, {
                totalWorkMinutes: 0,
                totalBreakMinutes: 0,
                adherencePercentage: 100,
              })
            } catch (e) {
              logger.error('Error auto-ending stale session:', e)
            }
          }
          // If session is fresh, leave it alone — it may be active on another device
        }

        setState(prev => ({ ...prev, loading: false }))
      } catch (error) {
        logger.error('Error loading active session:', error)
        setState(prev => ({ ...prev, loading: false }))
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
  // PERSIST TO LOCALSTORAGE on beforeunload + visibility hidden
  // ================================================
  useEffect(() => {
    if (!state.session || state.status === 'idle') return

    const persistState = () => {
      if (!stateRef.current.session || stateRef.current.status === 'idle') return
      saveTimerState({
        sessionId: stateRef.current.session.id,
        userId,
        goalMinutes: stateRef.current.goalMinutes,
        workSeconds: stateRef.current.workSeconds,
        breakSeconds: stateRef.current.breakSeconds,
        sessionSeconds: stateRef.current.sessionSeconds,
        status: stateRef.current.status,
        startedAt: stateRef.current.session.started_at,
        lastUpdatedAt: new Date().toISOString(),
      })
    }

    const handleBeforeUnload = () => persistState()
    const handleVisibilityChange = () => {
      if (document.hidden) persistState()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.session?.id, state.status, userId])

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

        segmentStartTimeRef.current = Date.now()

        setState((prev) => ({
          ...prev,
          status: 'working',
          session,
          currentSegment: null,
          goalMinutes: goal,
          showGoalReachedModal: false,
        }))

        // Persist to localStorage immediately
        saveTimerState({
          sessionId: session.id,
          userId,
          goalMinutes: goal,
          workSeconds: state.workSeconds,
          breakSeconds: state.breakSeconds,
          sessionSeconds: state.sessionSeconds,
          status: 'working',
          startedAt: session.started_at,
          lastUpdatedAt: new Date().toISOString(),
        })

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
        if (!state.session) {
          logger.error('Cannot start break: no active session')
          return
        }

        segmentStartTimeRef.current = Date.now()

        setState((prev) => ({
          ...prev,
          status: 'break',
          currentSegment: null,
          showGoalReachedModal: false,
          recommendedBreakMinutes: recommendedMinutes || prev.recommendedBreakMinutes,
        }))

        // Persist to localStorage
        saveTimerState({
          sessionId: state.session.id,
          userId,
          goalMinutes: state.goalMinutes,
          workSeconds: state.workSeconds,
          breakSeconds: state.breakSeconds,
          sessionSeconds: state.sessionSeconds,
          status: 'break',
          startedAt: state.session.started_at,
          lastUpdatedAt: new Date().toISOString(),
        })

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

          // Check for focus achievements
          await gamificationService.checkFocusAchievements(userId, {
            totalWorkMinutes: workMinutes,
            adherencePercentage: state.adherencePercentage,
          })
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

    clearTimerState()

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

        await focusTimerService.endSession(state.session.id, userId, {
          totalWorkMinutes: workMinutes,
          totalBreakMinutes: breakMinutes,
          adherencePercentage: state.adherencePercentage,
        })

        logger.log('Session discarded successfully')
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