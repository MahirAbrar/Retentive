import { useState } from 'react'
import { Button, Card, CardContent, CardHeader } from '../ui'
import { Play, Pause, Square, Settings as SettingsIcon, Clock, Coffee } from 'lucide-react'
import { useFocusTimer } from '../../hooks/useFocusTimer'
import { useAuth } from '../../hooks/useAuthFixed'
import { GoalReachedModal } from './GoalReachedModal'
import { BreakCompleteModal } from './BreakCompleteModal'
import { SessionSummary } from './SessionSummary'
import { FocusTimerSettings } from './FocusTimerSettings'
import { logger } from '../../utils/logger'

interface SummaryData {
  sessionMinutes?: number
  workMinutes: number
  breakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
}

export function FocusTimer() {
  const { user } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)

  const {
    status,
    sessionTime,
    workTime,
    breakTime,
    goalMinutes,
    goalProgress,
    adherencePercentage,
    adherenceColor,
    showGoalReachedModal,
    showBreakCompleteModal,
    recommendedBreakMinutes,
    startWorking,
    startBreak,
    stopSession,
    resetSession,
    setGoalMinutes,
    closeGoalReachedModal,
    closeBreakCompleteModal,
  } = useFocusTimer(user?.id || '')

  if (!user) return null

  const handleStopSession = async () => {
    const summary = await stopSession()
    if (summary) {
      setSummaryData(summary)
      setShowSummary(true)
    }
    resetSession()
  }

  const handleCloseSummary = () => {
    setShowSummary(false)
    setSummaryData(null)
  }

  const handleSaveGoal = (minutes: number) => {
    // Update the goal minutes immediately
    setGoalMinutes(minutes)

    // If session is active and user is working, we might want to recalculate progress
    // The timer will automatically adjust the goal progress calculation
    logger.debug(`Goal updated to ${minutes} minutes`)
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'working':
        return (
          <span
            className="caption"
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-success-light)',
              color: 'var(--color-success)',
              fontWeight: '600',
            }}
          >
            Working
          </span>
        )
      case 'break':
        return (
          <span
            className="caption"
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning)',
              fontWeight: '600',
            }}
          >
            On Break
          </span>
        )
      default:
        return (
          <span
            className="caption"
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-gray-100)',
              color: 'var(--color-text-secondary)',
              fontWeight: '600',
            }}
          >
            Not Studying
          </span>
        )
    }
  }

  return (
    <>
      <Card variant="bordered">
        <CardHeader
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 className="h4">Focus Timer</h3>
          <button
            onClick={() => setShowSettings(true)}
            disabled={status !== 'idle'}
            style={{
              border: 'none',
              background: 'none',
              cursor: status === 'idle' ? 'pointer' : 'not-allowed',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              opacity: status === 'idle' ? 1 : 0.5,
            }}
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </CardHeader>
        <CardContent>
          {/* Status Badge */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            {getStatusBadge()}
          </div>

          {/* Main Timer Display */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '1.5rem',
              backgroundColor: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* Session Timer - Main Focus */}
            {status !== 'idle' ? (
              <>
                <p className="caption text-secondary" style={{ marginBottom: '0.5rem' }}>
                  Session Time
                </p>
                <div
                  className="h1"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2.5rem',
                    fontWeight: '600',
                    color: 'var(--color-primary)',
                    marginBottom: '1rem',
                  }}
                >
                  {sessionTime.display}
                </div>

                {/* Current Activity Status - No timer, just status */}
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: status === 'working' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-block',
                }}>
                  <p className="body" style={{
                    fontWeight: '500',
                    color: status === 'working' ? 'var(--color-success)' : 'var(--color-warning)',
                    margin: 0,
                  }}>
                    {status === 'working' ? '🎯 Working' : '☕ On Break'}
                  </p>
                </div>

                {status === 'working' && (
                  <p className="caption text-secondary" style={{ marginTop: '0.75rem' }}>
                    Goal: {goalMinutes} minutes
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Idle state - show placeholder */}
                <div
                  className="h1"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2.5rem',
                    marginBottom: '0.5rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  00:00:00
                </div>
                <p className="body-small text-secondary">
                  Set goal: {goalMinutes} minutes
                </p>
              </>
            )}
          </div>

          {/* Progress Bar (only when working) */}
          {status === 'working' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  height: '8px',
                  backgroundColor: 'var(--color-gray-200)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${goalProgress}%`,
                    backgroundColor: 'var(--color-success)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <p className="caption text-secondary" style={{ marginTop: '0.25rem', textAlign: 'right' }}>
                {Math.round(goalProgress)}% of goal
              </p>
            </div>
          )}

          {/* Adherence Display (when session active) */}
          {status !== 'idle' && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: adherenceColor.color + '20',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="body-small" style={{ fontWeight: '600' }}>
                  Adherence
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{adherenceColor.emoji}</span>
                  <span
                    className="h4"
                    style={{ color: adherenceColor.color }}
                  >
                    {Math.round(adherencePercentage)}%
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: 'var(--color-gray-200)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${adherencePercentage}%`,
                    backgroundColor: adherenceColor.color,
                    transition: 'all 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                }}
              >
                <span className="caption text-secondary">
                  <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Work: {Math.floor(workTime.minutes)}m {workTime.seconds % 60}s
                </span>
                <span className="caption text-secondary">
                  <Coffee size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Break: {Math.floor(breakTime.minutes)}m {breakTime.seconds % 60}s
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            {status === 'idle' && (
              <Button
                variant="primary"
                size="large"
                onClick={() => startWorking()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Play size={18} />
                Start Working
              </Button>
            )}

            {status === 'working' && (
              <>
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => startBreak()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Pause size={18} />
                  Take Break
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleStopSession}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Square size={16} />
                  Stop Session
                </Button>
              </>
            )}

            {status === 'break' && (
              <>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => startWorking()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Play size={18} />
                  Resume Working
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleStopSession}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Square size={16} />
                  Stop Session
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <GoalReachedModal
        isOpen={showGoalReachedModal}
        workMinutes={Math.floor(workTime.minutes)}
        recommendedBreakMinutes={recommendedBreakMinutes}
        adherencePercentage={adherencePercentage}
        adherenceColor={adherenceColor}
        onStopSession={() => {
          handleStopSession()
          closeGoalReachedModal()
        }}
      />

      <BreakCompleteModal
        isOpen={showBreakCompleteModal}
        breakMinutes={Math.floor(breakTime.minutes)}
        onStartWorking={() => startWorking()}
        onExtendBreak={closeBreakCompleteModal}
        onClose={closeBreakCompleteModal}
      />

      {showSummary && summaryData && (
        <SessionSummary
          isOpen={showSummary}
          workMinutes={summaryData.workMinutes}
          breakMinutes={summaryData.breakMinutes}
          adherencePercentage={summaryData.adherencePercentage}
          adherenceColor={summaryData.adherenceColor}
          onClose={handleCloseSummary}
        />
      )}

      <FocusTimerSettings
        isOpen={showSettings}
        currentGoalMinutes={goalMinutes}
        onSaveGoal={handleSaveGoal}
        onClose={() => setShowSettings(false)}
      />
    </>
  )
}