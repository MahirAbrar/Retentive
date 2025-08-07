import React from 'react'
import styles from './Card.module.css'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'none' | 'small' | 'medium' | 'large'
  children: React.ReactNode
}

export function Card({
  variant = 'default',
  padding = 'medium',
  className = '',
  children,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    'animate-fade-in',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardHeader({ className = '', children, ...props }: CardHeaderProps) {
  return (
    <div className={`${styles.header} ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={`${styles.content} ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div className={`${styles.footer} ${className}`} {...props}>
      {children}
    </div>
  )
}