import { Badge } from '../ui'
import styles from './StreakIndicator.module.css'

interface StreakIndicatorProps {
  currentStreak: number
  showAnimation?: boolean
}

export function StreakIndicator({ currentStreak, showAnimation = true }: StreakIndicatorProps) {
  if (currentStreak <= 0) return null
  
  const getStreakEmoji = () => {
    if (currentStreak >= 100) return '🔥🔥🔥'
    if (currentStreak >= 30) return '🔥🔥'
    return '🔥'
  }
  
  return (
    <div className={`${styles.container} ${showAnimation && currentStreak >= 3 ? 'animate-pulse' : ''}`}>
      <Badge variant="warning">
        <span className={styles.emoji}>{getStreakEmoji()}</span>
        <span className={styles.text}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
      </Badge>
    </div>
  )
}