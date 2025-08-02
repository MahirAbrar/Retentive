import styles from './Loading.module.css'

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large'
  fullScreen?: boolean
  text?: string
}

export function Loading({ size = 'medium', fullScreen = false, text }: LoadingProps) {
  const content = (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  )

  if (fullScreen) {
    return <div className={styles.fullScreen}>{content}</div>
  }

  return content
}

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function LoadingSpinner({ size = 'medium', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.spinnerRing} ${styles[size]} ${className}`}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}