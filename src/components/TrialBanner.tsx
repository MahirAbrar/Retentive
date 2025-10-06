import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthFixed'
import { trialService } from '../services/trialService'
import type { TrialStatus } from '../services/trialService'
import './TrialBanner.css'

export function TrialBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const loadTrialStatus = useCallback(async () => {
    if (!user) return
    
    try {
      const status = await trialService.getTrialStatus(user.id)
      setTrialStatus(status)
      
      // Check if user has dismissed the banner for today
      const dismissedKey = `trial-banner-dismissed-${user.id}-${new Date().toDateString()}`
      const wasDismissed = localStorage.getItem(dismissedKey) === 'true'
      setDismissed(wasDismissed)
    } catch (error) {
      console.error('Error loading trial status:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadTrialStatus()
    }
  }, [user, loadTrialStatus])

  const handleUpgrade = () => {
    navigate('/paywall')
  }

  const handleDismiss = () => {
    if (!user) return
    const dismissedKey = `trial-banner-dismissed-${user.id}-${new Date().toDateString()}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
  }

  // Don't show banner if:
  // - No user logged in
  // - Not on trial
  // - Trial has more than 5 days left (show earlier for 14-day trial)
  // - User dismissed it today
  if (!user || !trialStatus?.isActive || trialStatus.daysRemaining > 5 || dismissed) {
    return null
  }

  const message = trialService.formatTrialMessage(trialStatus.daysRemaining)
  const urgency = trialStatus.daysRemaining <= 1 ? 'urgent' : 'warning'

  return (
    <div className={`trial-banner trial-banner-${urgency}`}>
      <div className="trial-banner-content">
        <span className="trial-banner-icon">⏰</span>
        <span className="trial-banner-message">{message}</span>
        <div className="trial-banner-actions">
          <button 
            className="btn btn-primary btn-small"
            onClick={handleUpgrade}
          >
            Upgrade Now
          </button>
          <button 
            className="btn-link btn-small"
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}