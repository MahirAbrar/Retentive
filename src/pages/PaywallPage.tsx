import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { trialService } from '../services/trialService'
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

  return (
    <div className="paywall-page">
      <div className="paywall-container">
        <div className="paywall-header">
          <h1 className="display">Study Once. Remember for Months.</h1>
          <p className="subtitle">
            Retentive tells you exactly when to review what you&apos;ve learned — before you forget it. Create topics, add your study material, and let the algorithm handle the rest.
          </p>
          <p className="hero-cta">Try first, decide later — 30 days free, no credit card required.</p>
          <p className="social-proof">Spaced repetition — the only study method with 140+ years of research behind it.</p>
          {trialStatus?.hasUsedTrial && (
            <p className="subtitle trial-ended">Hope you enjoyed your trial! Ready to continue your learning journey?</p>
          )}
        </div>

        {/* Skip Link */}
        <div className="skip-link-top">
          <button className="btn-skip" onClick={() => navigate('/')}>
            Maybe later
          </button>
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

        {/* How It Works Section */}
        <div className="how-it-works-section">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">You handle the learning. Retentive handles the timing.</p>

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

        {/* Pricing / Subscribe Section */}
        <div className="pricing-section">
          <h2 className="section-title">Get Started</h2>
          <p className="section-subtitle">
            {trialStatus?.hasUsedTrial
              ? 'Subscribe to continue your learning journey'
              : 'Try free for 30 days, then pick a plan that works for you'}
          </p>

          <div className="pricing-cta-cards">
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
                <a
                  className="btn btn-primary btn-large"
                  href="https://www.retentive.site/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Start Free Trial
                </a>
                <p className="no-card-note">No credit card required</p>
              </div>
            )}

            <div className="pricing-card subscribe-card">
              <div className="card-header">
                <h3 className="card-title">Subscribe</h3>
                <p className="plan-description">
                  Plans starting from ${PRICING.semiAnnual.pricePerMonth}/month
                </p>
              </div>
              <ul className="features-list">
                <li>✓ Unlimited topics &amp; items</li>
                <li>✓ Advanced statistics</li>
                <li>✓ Offline mode</li>
                <li>✓ Export your data</li>
                <li>✓ Cancel anytime</li>
              </ul>
              <a
                className="btn btn-primary btn-large"
                href="https://www.retentive.site/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Plans &amp; Subscribe
              </a>
            </div>
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
              <p>Yes! You can cancel your subscription at any time from your dashboard.</p>
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
          <a
            className="btn btn-primary"
            href="https://www.retentive.site/dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Plans &amp; Subscribe
          </a>
          <button className="btn-link" onClick={() => navigate('/')}>
            Maybe later
          </button>
          <p className="footer-text">
            Secure payment powered by Stripe • No credit card required for trial
          </p>
        </div>
      </div>
    </div>
  )
}