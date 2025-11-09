import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthFixed'
import { useToast } from '../components/ui'
import { trialService } from '../services/trialService'
import { subscriptionService } from '../services/subscriptionService'
import { PRICING, PAYWALL_STATS } from '../types/subscription'
import { logger } from '../utils/logger'
import * as Icons from 'lucide-react'
import './PaywallPage.css'

// Helper function to dynamically render Lucide icons
const renderIcon = (iconName: string, props?: any) => {
  const IconComponent = (Icons as any)[iconName]
  if (!IconComponent) return null
  return <IconComponent {...props} />
}

export function PaywallPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [trialStatus, setTrialStatus] = useState<any>(null)

  const loadTrialStatus = useCallback(async () => {
    if (!user) return
    
    try {
      const status = await trialService.getTrialStatus(user.id)
      setTrialStatus(status)
    } catch (error) {
      logger.error('Error loading trial status:', error)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    loadTrialStatus()
  }, [user, navigate, loadTrialStatus])

  const handleStartTrial = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await trialService.startTrial(user.id)
      
      if (result.success) {
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 14)
        const formattedDate = trialEndDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
        addToast('success', `Welcome to your 14-day free trial! Your trial will end on ${formattedDate}. Enjoy full access to all features.`)
        navigate('/')
      } else {
        addToast('error', result.error || 'Failed to start trial')
      }
    } catch (error) {
      logger.error('Error starting trial:', error)
      addToast('error', 'Failed to start trial. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await subscriptionService.createCheckoutSession(
        user.id,
        plan
      )
      
      if (result.url) {
        // Open marketing website in new tab or redirect
        if (window.electronAPI) {
          // In Electron, open in external browser
          window.electronAPI.openExternal(result.url)
        } else {
          // In web, redirect to marketing site
          window.location.href = result.url
        }
      } else {
        addToast('error', result.error || 'Failed to create checkout URL')
      }
    } catch (error) {
      logger.error('Error creating checkout:', error)
      addToast('error', 'Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paywall-page">
      <div className="paywall-container">
        <div className="paywall-header">
          <h1 className="display">Unlock Your Superhuman Memory</h1>
          <p className="subtitle">
            Science-backed spaced repetition that transforms you into the person everyone thinks has a photographic memory.
          </p>
          <p className="hero-cta">Become the human everyone thinks is superhuman!</p>
          <p className="social-proof">Join {PAYWALL_STATS.activeUsers} learners who&apos;ve unlocked their brain&apos;s true potential</p>
          {trialStatus?.hasUsedTrial && (
            <p className="subtitle trial-ended">Hope you enjoyed your trial! Ready to continue your learning journey?</p>
          )}
        </div>

        {/* Statistics Section */}
        <div className="stats-section">
          {PAYWALL_STATS.statistics.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{renderIcon(stat.iconName, { size: 32, strokeWidth: 2 })}</span>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="pricing-section">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Start with a free trial, upgrade when you&apos;re ready</p>

          <div className="pricing-cards">
            {/* Trial Card */}
            {!trialStatus?.hasUsedTrial && (
              <div className="pricing-card trial-card">
                <div className="card-header">
                  <h3 className="card-title">{PRICING.trial.name}</h3>
                  <div className="price">
                    <span className="currency">$</span>
                    <span className="amount">0</span>
                    <span className="period">/{PRICING.trial.days} days</span>
                  </div>
                  <p className="plan-description">Full access to all features</p>
                </div>
                <ul className="features-list">
                  {PRICING.trial.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleStartTrial}
                  disabled={loading || trialStatus?.hasUsedTrial}
                >
                  {loading ? 'Starting...' : 'Start Free Trial'}
                </button>
              </div>
            )}

            {/* Monthly Plan */}
            <div className="pricing-card">
              <div className="card-header">
                <h3 className="card-title">{PRICING.monthly.name}</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">{PRICING.monthly.price}</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-description">{PRICING.monthly.description}</p>
              </div>
              <ul className="features-list">
                {PRICING.monthly.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => handleSubscribe('monthly')}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Get Started'}
              </button>
            </div>

            {/* Quarterly Plan */}
            <div className="pricing-card featured">
              <div className="badge">{PRICING.quarterly.badge}</div>
              <div className="card-header">
                <h3 className="card-title">{PRICING.quarterly.name}</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">{PRICING.quarterly.price}</span>
                  <span className="period">/3 months</span>
                </div>
                <p className="plan-description">{PRICING.quarterly.description}</p>
              </div>
              <ul className="features-list">
                {PRICING.quarterly.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <button
                className="btn btn-primary btn-large"
                onClick={() => handleSubscribe('quarterly' as any)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Get Started'}
              </button>
              <p className="card-footer">Save 20%</p>
            </div>

            {/* Semi-Annual Plan */}
            <div className="pricing-card best-value">
              <div className="badge">{PRICING.semiAnnual.badge}</div>
              <div className="card-header">
                <h3 className="card-title">{PRICING.semiAnnual.name}</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">{PRICING.semiAnnual.price}</span>
                  <span className="period">/6 months</span>
                </div>
                <p className="plan-description">{PRICING.semiAnnual.description}</p>
              </div>
              <ul className="features-list">
                {PRICING.semiAnnual.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <button
                className="btn btn-primary btn-large"
                onClick={() => handleSubscribe('semiannual' as any)}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Get Started'}
              </button>
              <p className="card-footer">Best value - 50% off</p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="how-it-works-section">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Transform into a learning superhuman with our science-backed method</p>
          <p className="section-hero">Become the person everyone thinks has superhuman memory!</p>

          <div className="steps-grid">
            {PAYWALL_STATS.howItWorks.map((step) => (
              <div key={step.step} className="step-card">
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{renderIcon(step.iconName, { size: 48, strokeWidth: 1.5 })}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Modes Section */}
        <div className="learning-modes-section">
          <h2 className="section-title">Choose Your Learning Mode</h2>
          <p className="section-subtitle">
            Pick the right pace for your goals. You review the SAME material at increasing intervals - not new content each time.
          </p>
          <p className="modes-tagline">This is what makes spaced repetition so powerful.</p>

          <div className="modes-grid">
            {PAYWALL_STATS.learningModes.map((mode) => (
              <div key={mode.name} className="mode-card">
                <div className="mode-icon">{renderIcon(mode.iconName, { size: 48, strokeWidth: 1.5 })}</div>
                <h3 className="mode-title">{mode.name}</h3>
                <p className="mode-intervals">{mode.intervals}</p>
                <p className="mode-wordcount">{mode.wordCount}</p>
                <p className="mode-bestfor">
                  <strong>Best for:</strong> {mode.bestFor}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Time Tracking Section */}
        <div className="time-tracking-section">
          <h2 className="section-title">{PAYWALL_STATS.timeTracking.title}</h2>
          <p className="section-subtitle">{PAYWALL_STATS.timeTracking.subtitle}</p>
          <p className="tracking-description">{PAYWALL_STATS.timeTracking.description}</p>

          <div className="tracking-benefits-grid">
            {PAYWALL_STATS.timeTracking.benefits.map((benefit, index) => (
              <div key={index} className="tracking-benefit-card">
                <div className="benefit-icon">{renderIcon(benefit.iconName, { size: 48, strokeWidth: 1.5 })}</div>
                <div className="benefit-stat">{benefit.stat}</div>
                <h4 className="benefit-title">{benefit.title}</h4>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>

          <p className="tracking-research-note">{PAYWALL_STATS.timeTracking.researchNote}</p>
        </div>

        {/* Research Section */}
        <div className="testimonials-section">
          <h2 className="section-title">Why Spaced Repetition Works</h2>
          <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
            Backed by 140+ years of scientific research
          </p>
          <div className="testimonials-grid">
            {PAYWALL_STATS.research.map((study, index) => (
              <div key={index} className="testimonial-card">
                <div style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--color-primary)' }}>
                  {renderIcon(study.iconName, { size: 40, strokeWidth: 1.5 })}
                </div>
                <p className="testimonial-text">{study.text}</p>
                <div className="testimonial-author">
                  <span className="author-name">{study.author}</span>
                  <span className="author-role">{study.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="faq-section">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>Yes! You can cancel your subscription at any time from your settings page.</p>
            </div>
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept all major credit cards, debit cards, and PayPal through Stripe.</p>
            </div>
            <div className="faq-item">
              <h4>Is my data safe?</h4>
              <p>Absolutely. We use industry-standard encryption and never share your data.</p>
            </div>
            <div className="faq-item">
              <h4>Can I switch plans?</h4>
              <p>Yes, you can upgrade or downgrade your plan at any time.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="paywall-footer">
          <button className="btn-link" onClick={() => navigate('/')}>
            Maybe later
          </button>
          <p className="footer-text">
            Secure payment powered by Stripe • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}