import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent, Button } from '../ui'
import { useAuth } from '../../hooks/useAuthFixed'
import { subscriptionService } from '../../services/subscriptionService'
import { trialService } from '../../services/trialService'
import { logger } from '../../utils/logger'
import type { SubscriptionStatus as SubStatus } from '../../services/subscriptionService'
import type { TrialStatus } from '../../services/trialService'
import { AlertTriangle } from 'lucide-react'
import './SubscriptionStatus.css'

export function SubscriptionStatus() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubStatus | null>(null)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)

  const loadStatus = useCallback(async () => {
    if (!user) return

    try {
      const [subStatus, trialStat] = await Promise.all([
        subscriptionService.getSubscriptionStatus(user.id),
        trialService.getTrialStatus(user.id)
      ])
      
      setSubscriptionStatus(subStatus)
      setTrialStatus(trialStat)
    } catch (error) {
      logger.error('Error loading subscription status:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    logger.info('SubscriptionStatus component mounted, user:', user?.id)
    if (user) {
      loadStatus()
    } else {
      setLoading(false)
    }
  }, [user, loadStatus])

  const handleUpgrade = () => {
    window.open('https://retentive-learning-app.vercel.app/', '_blank')
  }


  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPlanName = () => {
    if (subscriptionStatus?.isPaid) {
      if (subscriptionStatus.subscriptionType === 'yearly') {
        return 'Yearly Plan'
      } else if (subscriptionStatus.subscriptionType === 'monthly') {
        return 'Monthly Plan'
      }
    }
    
    if (trialStatus?.isActive) {
      return 'Free Trial'
    }

    return 'Free'
  }

  const getPlanDetails = () => {
    if (subscriptionStatus?.isPaid) {
      const price = subscriptionStatus.subscriptionType === 'yearly' ? '$30/year' : '$3/month'
      return price
    }
    
    if (trialStatus?.isActive && trialStatus.expiresAt) {
      const expiryDate = new Date(trialStatus.expiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
      return `Ends on ${expiryDate} (${trialStatus.daysRemaining} days left)`
    }

    return 'Limited access'
  }

  const getStatusBadge = () => {
    if (subscriptionStatus?.isPaid) {
      if (subscriptionStatus.status === 'cancelled') {
        return <span className="badge badge-warning">Cancelled</span>
      }
      return <span className="badge badge-success">Active</span>
    }
    
    if (trialStatus?.isActive) {
      return <span className="badge badge-info">Trial</span>
    }

    if (trialStatus?.hasUsedTrial) {
      return <span className="badge badge-secondary">Trial Expired</span>
    }

    return <span className="badge badge-default">Free</span>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="h4">Subscription</h3>
        </CardHeader>
        <CardContent>
          <div className="loading-text">Loading subscription status...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="h4">Subscription</h3>
      </CardHeader>
      <CardContent>
        <div className="subscription-status">
          <div className="status-header">
            <div className="plan-info">
              <div className="plan-name">
                <span className="label">Current Plan:</span>
                <span className="value">{getPlanName()}</span>
                {getStatusBadge()}
              </div>
              <div className="plan-details">
                {getPlanDetails()}
              </div>
            </div>
          </div>

          <div className="status-details">
            {subscriptionStatus?.isPaid && (
              <>
                <div className="detail-row">
                  <span className="label">Billing Cycle:</span>
                  <span className="value">
                    {subscriptionStatus.subscriptionType === 'yearly' ? 'Annual' : 'Monthly'}
                  </span>
                </div>
                {subscriptionStatus.expiresAt && (
                  <div className="detail-row">
                    <span className="label">
                      {subscriptionStatus.status === 'cancelled' ? 'Access Until:' : 'Next Billing:'}
                    </span>
                    <span className="value">{formatDate(subscriptionStatus.expiresAt)}</span>
                  </div>
                )}
              </>
            )}

            {trialStatus?.isActive && (
              <>
                <div className="detail-row">
                  <span className="label">Trial Period:</span>
                  <span className="value">14-day free trial</span>
                </div>
                <div className="detail-row">
                  <span className="label">Started:</span>
                  <span className="value">{formatDate(trialStatus.startedAt)}</span>
                </div>
                <div className="detail-row trial-expiry-row">
                  <span className="label">Trial Ends:</span>
                  <span className="value" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    {formatDate(trialStatus.expiresAt)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Time Remaining:</span>
                  <span className="value">
                    {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>
                {trialStatus.daysRemaining <= 5 && (
                  <div className="trial-warning">
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px' }} />
                    Your trial is expiring soon! Only {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left. Upgrade now to keep full access.
                  </div>
                )}
              </>
            )}

            {!subscriptionStatus?.isPaid && !trialStatus?.isActive && (
              <div className="free-plan-info">
                <p className="body-small text-secondary">
                  You&rsquo;re on the free plan with limited features.
                </p>
                {!trialStatus?.hasUsedTrial && (
                  <p className="body-small text-secondary">
                    Start your 14-day free trial to unlock all features!
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="subscription-actions">
            {!subscriptionStatus?.isPaid && (
              <Button
                className="btn btn-primary"
                onClick={handleUpgrade}
              >
                {trialStatus?.hasUsedTrial ? 'Upgrade to Premium' : 'Start Free Trial'}
              </Button>
            )}

            {subscriptionStatus?.isPaid && subscriptionStatus.status !== 'cancelled' && (
              <Button
                className="btn btn-secondary"
                onClick={handleUpgrade}
              >
                Manage Subscription
              </Button>
            )}

            {subscriptionStatus?.status === 'cancelled' && (
              <Button
                className="btn btn-primary"
                onClick={handleUpgrade}
              >
                Reactivate Subscription
              </Button>
            )}
          </div>

          <div className="subscription-footer">
            <p className="body-small text-secondary" style={{ marginBottom: '0.5rem' }}>
              Subscription management is handled on our external website.
            </p>
            <p className="body-small text-secondary">
              Questions about billing?{' '}
              <a
                href="mailto:mahirabrar.au@gmail.com?subject=Retentive Billing Question"
                className="link"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}