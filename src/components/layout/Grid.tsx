import React from 'react'
import styles from './Grid.module.css'

interface GridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 'small' | 'medium' | 'large'
  responsive?: boolean
  className?: string
}

export function Grid({ 
  children, 
  columns = 12, 
  gap = 'medium', 
  responsive = true,
  className = '' 
}: GridProps) {
  const classes = [
    styles.grid,
    styles[`columns-${columns}`],
    styles[`gap-${gap}`],
    responsive && styles.responsive,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children}
    </div>
  )
}

interface GridItemProps {
  children: React.ReactNode
  span?: 1 | 2 | 3 | 4 | 6 | 8 | 12
  spanMobile?: 1 | 2 | 3 | 4 | 6 | 8 | 12
  spanTablet?: 1 | 2 | 3 | 4 | 6 | 8 | 12
  className?: string
}

export function GridItem({ 
  children, 
  span = 1, 
  spanMobile,
  spanTablet,
  className = '' 
}: GridItemProps) {
  const style: React.CSSProperties = {
    '--span': span,
    '--span-mobile': spanMobile || span,
    '--span-tablet': spanTablet || span,
  } as React.CSSProperties

  const classes = [
    styles.gridItem,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}

// Container component for consistent max-width and padding
interface ContainerProps {
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large' | 'full'
  className?: string
}

export function Container({ 
  children, 
  size = 'large',
  className = '' 
}: ContainerProps) {
  const classes = [
    styles.container,
    styles[`container-${size}`],
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children}
    </div>
  )
}