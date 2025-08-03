import styles from './LevelProgress.module.css'
import { gamificationService } from '../../services/gamificationService'

interface LevelProgressProps {
  totalPoints: number
  currentLevel: number
  compact?: boolean
}

export function LevelProgress({ totalPoints, currentLevel, compact = false }: LevelProgressProps) {
  const progress = gamificationService.getPointsForNextLevel(totalPoints)
  
  if (compact) {
    return (
      <div className={styles.compact}>
        <span className={styles.level}>Lvl {currentLevel}</span>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress.progressPercentage}%` }}
          />
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Level {currentLevel}</h3>
        <span className={styles.points}>{totalPoints.toLocaleString()} points</span>
      </div>
      
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress.progressPercentage}%` }}
          >
            <span className={styles.progressText}>
              {Math.round(progress.progressPercentage)}%
            </span>
          </div>
        </div>
        
        <div className={styles.progressInfo}>
          <span className={styles.current}>{progress.currentLevelProgress}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.needed}>
            {progress.currentLevelProgress + progress.pointsNeeded} XP
          </span>
        </div>
      </div>
      
      <p className={styles.nextLevel}>
        {progress.pointsNeeded} points to level {currentLevel + 1}
      </p>
    </div>
  )
}