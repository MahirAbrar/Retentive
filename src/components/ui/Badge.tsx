import React, { memo } from 'react'
import styles from './Badge.module.css'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost'
  size?: 'small' | 'medium'
}

export const Badge = memo(function Badge({
  children,
  variant = 'primary',
  size = 'small',
}: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${styles[size]}`}
    >
      {children}
    </span>
  )
})