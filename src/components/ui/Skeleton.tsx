import './Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ 
  width, 
  height,
  variant = 'rectangular',
  animation = 'pulse',
  className = '',
  style
}: SkeletonProps) {
  const classes = [
    'skeleton',
    `skeleton-${variant}`,
    animation !== 'none' && `skeleton-${animation}`,
    className
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={classes}
      style={{
        width,
        height,
        ...style
      }}
    />
  )
}