import { Badge } from '../ui'
import { Flame } from 'lucide-react'
import styles from './StreakIndicator.module.css'

interface StreakIndicatorProps {
  currentStreak: number
  showAnimation?: boolean
}

export function StreakIndicator({ currentStreak, showAnimation = true }: StreakIndicatorProps) {
  if (currentStreak <= 0) return null
  
  const getFlameCount = () => {
    if (currentStreak >= 100) return 3
    if (currentStreak >= 30) return 2
    return 1
  }
  
  const flameCount = getFlameCount()
  
  return (
    <div className={`${styles.container} ${showAnimation && currentStreak >= 3 ? 'animate-pulse' : ''}`}>
      <Badge variant="warning">
        <span className={styles.emoji} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {Array.from({ length: flameCount }, (_, i) => (
            <Flame 
              key={i} 
              size={14} 
              style={{ 
                color: currentStreak >= 100 ? '#ff4500' : currentStreak >= 30 ? '#ff6b35' : '#ff8c00'
              }} 
            />
          ))}
        </span>
        <span className={styles.text}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
      </Badge>
    </div>
  )
}