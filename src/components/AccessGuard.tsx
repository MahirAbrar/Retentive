import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthFixed'
import { subscriptionService } from '../services/subscriptionService'
import { trialService } from '../services/trialService'
import { logger } from '../utils/logger'

interface AccessGuardProps {
  children: React.ReactNode
  requirePayment?: boolean
}

export function AccessGuard({ children, requirePayment = true }: AccessGuardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const checkAccess = useCallback(async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!requirePayment) {
      setHasAccess(true)
      setChecking(false)
      return
    }

    try {
      // Check if user has active subscription or trial
      const [subscriptionStatus, trialStatus] = await Promise.all([
        subscriptionService.getSubscriptionStatus(user.id),
        trialService.getTrialStatus(user.id)
      ])

      const hasValidAccess = subscriptionStatus.hasAccess || trialStatus.isActive

      logger.info('Access check:', {
        userId: user.id,
        hasValidAccess,
        subscriptionHasAccess: subscriptionStatus.hasAccess,
        trialIsActive: trialStatus.isActive,
        trialDaysRemaining: trialStatus.daysRemaining,
        isPaid: subscriptionStatus.isPaid
      })

      if (!hasValidAccess) {
        // No access, redirect to paywall
        logger.warn('Access denied - redirecting to paywall', { userId: user.id })
        navigate('/paywall')
      } else {
        setHasAccess(true)
        
        // Check if trial is expiring soon
        if (trialStatus.isActive && trialStatus.daysRemaining <= 3) {
          // Trial expiring soon, could show a banner (handled by TrialBanner component)
          logger.info(`Trial expiring in ${trialStatus.daysRemaining} days`)
        }
      }
    } catch (error) {
      logger.error('Error checking access:', error)
      // On error, allow access but log the issue
      setHasAccess(true)
    } finally {
      setChecking(false)
    }
  }, [user, navigate, requirePayment])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  if (checking) {
    return (
      <div className="access-guard-loading">
        <p>Checking access...</p>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will redirect to paywall
  }

  return <>{children}</>
}