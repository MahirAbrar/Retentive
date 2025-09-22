import { useEffect, useState } from 'react'
import styles from './PointsPopup.module.css'
import { Sparkles } from 'lucide-react'

interface PointsPopupProps {
  points: number
  message?: string
  isPerfect?: boolean
  onComplete?: () => void
}

export function PointsPopup({ points, message, isPerfect = false, onComplete }: PointsPopupProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [onComplete])
  
  if (!isVisible) return null
  
  return (
    <div className={`${styles.popup} ${isPerfect ? styles.perfect : ''} animate-scale-in`}>
      <div className={styles.points}>+{points}</div>
      {message && <div className={styles.message}>{message}</div>}
      {isPerfect && (
        <div className={styles.particles}>
          <Sparkles className={styles.particle} size={16} />
          <Sparkles className={styles.particle} size={20} />
          <Sparkles className={styles.particle} size={16} />
        </div>
      )}
    </div>
  )
}