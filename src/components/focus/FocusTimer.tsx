import { useState } from 'react'
import { Button } from '../ui'
import { Play, Pause, Square, ChevronDown, ChevronUp, Clock, Coffee } from 'lucide-react'
import { useFocusTimerContext } from '../../contexts/FocusTimerContext'
import { useAuth } from '../../hooks/useAuth'
import { GoalReachedModal } from './GoalReachedModal'
import { BreakCompleteModal } from './BreakCompleteModal'
import { MaxDurationModal } from './MaxDurationModal'
import { SessionSummary } from './SessionSummary'
import { BreakActivityModal } from './BreakActivityModal'
import { BreakActivityTimer } from './BreakActivityTimer'
import { SessionRecoveryModal } from './SessionRecoveryModal'
import { SessionStartModal } from './SessionStartModal'
import { logger } from '../../utils/logger'

const SESSION_GUIDE = [
  { mode: 'Ultra-Cram / Cram', duration: '15-30 min' },
  { mode: 'Steady', duration: '25-30 min' },
  { mode: 'Extended', duration: '30-45 min' },
]

const GOAL_PRESETS = [25, 45, 60, 90]

interface SummaryData {
  sessionMinutes?: number
  workMinutes: number
  breakMinutes: number
  adherencePercentage: number
  adherenceColor: { color: string; status: string; emoji: string }
  basePoints?: number
  pointsPenalty?: number
  netPoints?: number
  penaltyRate?: number
  isIncomplete?: boolean
}

export function FocusTimer() {
  const { user } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [showStartConfirmModal, setShowStartConfirmModal] = useState(false)

  const {
    loading,
    status,
    sessionTime,
    workTime,
    breakTime,
    remainingTime,
    goalMinutes,
    goalProgress,
    adherencePercentage,
    adherenceColor,
    showGoalReachedModal,
    showBreakCompleteModal,
    showMaxDurationModal,
    showSessionRecoveryModal,
    recommendedBreakMinutes,
    breakActivityModal,
    activeBreakActivity,
    breakActivityTimeRemaining,
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
  } = useFocusTimerContext()

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

  const handlePresetClick = (minutes: number) => {
    setGoalMinutes(minutes)
    logger.debug(`Goal updated to ${minutes} minutes`)
  }

  return (
    <>
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p className="body text-secondary">Loading session...</p>
          </div>
        ) : (
          <>
            {/* Timer Display */}
            <div style={{
              padding: 'var(--space-10) var(--space-8) var(--space-8)',
              textAlign: 'center',
            }}>
              {/* Status label */}
              {status !== 'idle' && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.75rem',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase' as const,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: status === 'working' ? 'var(--color-success)' : 'var(--color-warning)',
                    color: '#fff',
                  }}>
                    {status === 'working' ? 'Working' : 'Break'}
                  </span>
                </div>
              )}

              {/* Main time */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: status === 'idle' ? 'var(--color-gray-300)' : 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
              }}>
                {status !== 'idle' ? remainingTime.display : '00:00:00'}
              </div>

              {/* Subtext under time */}
              {status !== 'idle' ? (
                <p className="caption text-secondary" style={{ margin: 0 }}>
                  remaining of {goalMinutes}m goal
                </p>
              ) : (
                <p className="caption text-secondary" style={{ margin: 0 }}>
                  Goal: {goalMinutes} minutes
                </p>
              )}
            </div>

            {/* Progress bar — only during work */}
            {status === 'working' && (
              <div style={{ padding: '0 var(--space-8)' }}>
                <div style={{
                  height: '3px',
                  backgroundColor: 'var(--color-gray-100)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${goalProgress}%`,
                    backgroundColor: 'var(--color-success)',
                    transition: 'width 1s linear',
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 'var(--space-1)',
                }}>
                  <span className="caption text-secondary">
                    {sessionTime.display} elapsed
                  </span>
                  <span className="caption text-secondary">
                    {Math.round(goalProgress)}%
                  </span>
                </div>
              </div>
            )}

            {/* Adherence — when session active */}
            {status !== 'idle' && (
              <div style={{
                margin: 'var(--space-6) var(--space-8) 0',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 'var(--space-2)',
                }}>
                  <span className="caption" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Adherence
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    color: adherenceColor.color,
                  }}>
                    {adherenceColor.emoji} {Math.round(adherencePercentage)}%
                  </span>
                </div>
                <div style={{
                  height: '3px',
                  backgroundColor: 'var(--color-gray-200)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: 'var(--space-3)',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${adherencePercentage}%`,
                    backgroundColor: adherenceColor.color,
                    transition: 'all 0.3s ease',
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span className="caption text-secondary">
                    <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                    Work {Math.floor(workTime.minutes)}m {workTime.seconds % 60}s
                  </span>
                  <span className="caption text-secondary">
                    <Coffee size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                    Break {Math.floor(breakTime.minutes)}m {breakTime.seconds % 60}s
                  </span>
                </div>
              </div>
            )}

            {/* Break suggestion buttons */}
            {status === 'working' && (
              <div style={{
                margin: 'var(--space-4) var(--space-8) 0',
                display: 'flex',
                gap: 'var(--space-2)',
              }}>
                {[
                  { id: 'cognitive-overload' as const, label: 'Need to absorb' },
                  { id: 'attention-drift' as const, label: 'Losing focus' },
                  { id: 'urge-management' as const, label: 'Want to quit' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openBreakActivityModal(item.id)}
                    style={{
                      flex: 1,
                      padding: 'var(--space-2) var(--space-3)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-secondary)',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.color = 'var(--color-text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-secondary)'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{
              padding: 'var(--space-6) var(--space-8) var(--space-8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              {status === 'idle' && (
                <>
                  <Button
                    variant="primary"
                    size="large"
                    onClick={() => setShowStartConfirmModal(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Play size={18} />
                    Start Session
                  </Button>
                  <button
                    onClick={() => setShowSettings(prev => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                      padding: 'var(--space-2)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showSettings ? 'Hide settings' : 'Timer settings'}
                  </button>

                  {/* Inline settings panel */}
                  {showSettings && (
                    <div style={{
                      borderTop: '1px solid var(--color-gray-100)',
                      paddingTop: 'var(--space-4)',
                      marginTop: 'var(--space-1)',
                    }}>
                      <p className="caption" style={{
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-3)',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase' as const,
                        fontSize: '0.7rem',
                      }}>
                        Goal duration
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 'var(--space-2)',
                      }}>
                        {GOAL_PRESETS.map((minutes) => (
                          <button
                            key={minutes}
                            onClick={() => handlePresetClick(minutes)}
                            style={{
                              padding: 'var(--space-2) var(--space-3)',
                              border: goalMinutes === minutes
                                ? '2px solid var(--color-primary)'
                                : '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: goalMinutes === minutes
                                ? 'var(--color-gray-50)'
                                : 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: goalMinutes === minutes ? 600 : 400,
                              color: 'var(--color-text-primary)',
                              transition: 'var(--transition-fast)',
                            }}
                          >
                            {minutes}m
                          </button>
                        ))}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-3)',
                      }}>
                        <span className="caption text-secondary" style={{ whiteSpace: 'nowrap' }}>Custom:</span>
                        <input
                          id="custom-goal-input"
                          type="number"
                          min="1"
                          max="480"
                          placeholder="minutes"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value)
                              if (val > 0 && val <= 480) {
                                handlePresetClick(val);
                                (e.target as HTMLInputElement).value = ''
                              }
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-xs)',
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('custom-goal-input') as HTMLInputElement
                            const val = parseInt(input?.value)
                            if (val > 0 && val <= 480) {
                              handlePresetClick(val)
                              input.value = ''
                            }
                          }}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-gray-50)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Set
                        </button>
                      </div>
                      <p className="caption text-secondary" style={{
                        marginTop: 'var(--space-3)',
                        lineHeight: 1.4,
                      }}>
                        Set your goal to the total time you want to study, including breaks. The timer will suggest breaks along the way.
                      </p>
                    </div>
                  )}
                </>
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
                    <Square size={14} />
                    End Session
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
                    <Square size={14} />
                    End Session
                  </Button>
                </>
              )}
            </div>

            {/* Session guide + optional note — idle only */}
            {status === 'idle' && (
              <div style={{
                borderTop: '1px solid var(--color-gray-100)',
                padding: 'var(--space-6) var(--space-8)',
              }}>
                <p className="caption" style={{
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-3)',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase' as const,
                  fontSize: '0.7rem',
                }}>
                  Recommended session lengths
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {SESSION_GUIDE.map((guide) => (
                    <div key={guide.mode} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span className="caption text-secondary">{guide.mode}</span>
                      <span className="caption" style={{ fontWeight: 500 }}>{guide.duration}</span>
                    </div>
                  ))}
                </div>

                <p className="caption text-secondary" style={{
                  marginTop: 'var(--space-5)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--color-gray-100)',
                  lineHeight: 1.5,
                }}>
                  This timer is completely optional. You can review your topics anytime without it — it's just here if you'd like to track your focus.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals — unchanged */}
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

      <MaxDurationModal
        isOpen={showMaxDurationModal}
        workMinutes={Math.floor(workTime.minutes)}
        goalMinutes={goalMinutes}
        recommendedBreakMinutes={recommendedBreakMinutes}
        adherencePercentage={adherencePercentage}
        adherenceColor={adherenceColor}
        onTakeBreak={() => {
          startBreak(recommendedBreakMinutes)
          closeMaxDurationModal()
        }}
        onEndSession={() => {
          handleStopSession()
          closeMaxDurationModal()
        }}
      />

      {showSummary && summaryData && (
        <SessionSummary
          isOpen={showSummary}
          workMinutes={summaryData.workMinutes}
          breakMinutes={summaryData.breakMinutes}
          adherencePercentage={summaryData.adherencePercentage}
          adherenceColor={summaryData.adherenceColor}
          onClose={handleCloseSummary}
          basePoints={summaryData.basePoints}
          pointsPenalty={summaryData.pointsPenalty}
          netPoints={summaryData.netPoints}
          penaltyRate={summaryData.penaltyRate}
          isIncomplete={summaryData.isIncomplete}
        />
      )}

      <BreakActivityModal
        isOpen={breakActivityModal.isOpen}
        categoryId={breakActivityModal.categoryId}
        onSelectActivity={startBreakActivity}
        onClose={closeBreakActivityModal}
      />

      {activeBreakActivity && (
        <BreakActivityTimer
          activity={activeBreakActivity}
          timeRemaining={breakActivityTimeRemaining}
          onComplete={completeBreakActivity}
          onCancel={completeBreakActivity}
        />
      )}

      <SessionRecoveryModal
        isOpen={showSessionRecoveryModal}
        workMinutes={Math.floor(workTime.minutes)}
        breakMinutes={Math.floor(breakTime.minutes)}
        adherencePercentage={adherencePercentage}
        adherenceColor={adherenceColor}
        onResume={resumeSession}
        onDiscard={discardSession}
      />

      <SessionStartModal
        isOpen={showStartConfirmModal}
        goalMinutes={goalMinutes}
        onConfirm={() => {
          setShowStartConfirmModal(false)
          startWorking()
        }}
        onCancel={() => setShowStartConfirmModal(false)}
      />
    </>
  )
}
