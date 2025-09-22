import { useMemo } from 'react'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import type { LearningItem } from '../../types/database'
import styles from './ReviewWindowIndicator.module.css'
import { Target } from 'lucide-react'

interface ReviewWindowIndicatorProps {
  item: LearningItem
  currentTime?: Date
}

export function ReviewWindowIndicator({ item, currentTime = new Date() }: ReviewWindowIndicatorProps) {
  const status = useMemo(() => {
    if (!item.next_review_at) return { type: 'new', label: 'New Item', color: 'info' }
    
    const mode = GAMIFICATION_CONFIG.LEARNING_MODES[item.learning_mode]
    const dueTime = new Date(item.next_review_at)
    const timeDiff = currentTime.getTime() - dueTime.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    // Check if overdue
    if (hoursDiff > mode.windowAfter) {
      return { 
        type: 'overdue', 
        label: 'Overdue', 
        color: 'error',
        multiplier: mode.pointsMultiplier.late
      }
    }
    
    // Check if in perfect timing window
    if (Math.abs(hoursDiff) <= GAMIFICATION_CONFIG.FEATURES.timePressure.perfectWindow) {
      return { 
        type: 'perfect', 
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Perfect Time! <Target size={16} />
          </span>
        ), 
        color: 'success',
        multiplier: mode.pointsMultiplier.onTime
      }
    }
    
    // Check if in review window
    const earliestTime = new Date(dueTime)
    earliestTime.setHours(earliestTime.getHours() - mode.windowBefore)
    
    const latestTime = new Date(dueTime)
    latestTime.setHours(latestTime.getHours() + mode.windowAfter)
    
    if (currentTime >= earliestTime && currentTime <= latestTime) {
      return { 
        type: 'inWindow', 
        label: 'In Review Window', 
        color: 'warning',
        multiplier: mode.pointsMultiplier.inWindow
      }
    }
    
    // Not yet due
    return { 
      type: 'notDue', 
      label: `Due in ${Math.ceil(-hoursDiff)} hours`, 
      color: 'default' 
    }
  }, [item, currentTime])
  
  if (status.type === 'notDue' || status.type === 'new') {
    return null
  }
  
  return (
    <div className={`${styles.indicator} ${styles[status.color]}`}>
      <span className={styles.label}>{status.label}</span>
      {status.multiplier && (
        <span className={styles.multiplier}>×{status.multiplier}</span>
      )}
    </div>
  )
}