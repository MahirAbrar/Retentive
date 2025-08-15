import React, { memo } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
  as?: React.ElementType
}

export const Button = memo(function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  as: Component = 'button',
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={styles.loadingContent}>
          <span className={styles.spinner} />
          Loading...
        </span>
      ) : (
        children
      )}
    </Component>
  )
})