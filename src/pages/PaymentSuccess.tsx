import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthFixed'
import { subscriptionService } from '../services/subscriptionService'
import { logger } from '../utils/logger'
import './PaymentSuccess.css'

export function PaymentSuccess() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    checkPaymentStatus()
  }, [user])

  const checkPaymentStatus = async () => {
    if (!user) return

    try {
      // Wait a moment for Stripe webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if subscription is now active
      const status = await subscriptionService.getSubscriptionStatus(user.id)
      
      if (status.isPaid || status.isActive) {
        setSuccess(true)
        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } else {
        // Payment might still be processing
        logger.warn('Subscription not yet active after payment')
        setSuccess(false)
      }
    } catch (error) {
      logger.error('Error checking payment status:', error)
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    navigate('/')
  }

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@retentive-app.com?subject=Payment Issue'
  }

  if (loading) {
    return (
      <div className="payment-success-page">
        <div className="payment-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <h2>Processing your payment...</h2>
          <p>Please wait while we confirm your subscription.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="payment-success-page">
        <div className="payment-container success">
          <div className="success-icon">✓</div>
          <h1>Welcome to Retentive Premium!</h1>
          <p>Your payment was successful and your subscription is now active.</p>
          <div className="success-details">
            <h3>What's next?</h3>
            <ul>
              <li>✓ Unlimited topics and learning items</li>
              <li>✓ Advanced analytics and insights</li>
              <li>✓ Priority support</li>
              <li>✓ Early access to new features</li>
            </ul>
          </div>
          <button className="btn btn-primary btn-large" onClick={handleContinue}>
            Start Learning
          </button>
          <p className="redirect-notice">Redirecting to app in 3 seconds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-success-page">
      <div className="payment-container warning">
        <div className="warning-icon">⚠️</div>
        <h1>Payment Processing</h1>
        <p>Your payment is still being processed. This can take a few moments.</p>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => checkPaymentStatus()}>
            Check Again
          </button>
          <button className="btn btn-secondary" onClick={handleContinue}>
            Continue to App
          </button>
        </div>
        <p className="support-text">
          If you continue to see this message, please{' '}
          <button className="btn-link" onClick={handleContactSupport}>
            contact support
          </button>
        </p>
      </div>
    </div>
  )
}