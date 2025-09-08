import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuthFixed'
import { useToast } from '../components/ui'
import { trialService } from '../services/trialService'
import { subscriptionService } from '../services/subscriptionService'
import { PRICING, PAYWALL_STATS } from '../types/subscription'
import { logger } from '../utils/logger'
import './PaywallPage.css'

export function PaywallPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [trialStatus, setTrialStatus] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    loadTrialStatus()
  }, [user])

  const loadTrialStatus = async () => {
    if (!user) return
    
    try {
      const status = await trialService.getTrialStatus(user.id)
      setTrialStatus(status)
    } catch (error) {
      logger.error('Error loading trial status:', error)
    }
  }

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

  const formatPrice = (plan: 'monthly' | 'yearly') => {
    return subscriptionService.formatPrice(plan)
  }

  return (
    <div className="paywall-page">
      <div className="paywall-container">
        <div className="paywall-header">
          <h1 className="display">Unlock Your Learning Potential</h1>
          {trialStatus?.hasUsedTrial && (
            <p className="subtitle">Hope you enjoyed your trial! Ready to continue your learning journey?</p>
          )}
        </div>

        {/* Statistics Section */}
        <div className="stats-section">
          {PAYWALL_STATS.statistics.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="pricing-cards">
          {/* Trial Card */}
          {!trialStatus?.hasUsedTrial && (
            <div className="pricing-card trial-card">
              <div className="card-header">
                <h3 className="card-title">Free Trial</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">0</span>
                  <span className="period">14 days</span>
                </div>
              </div>
              <ul className="features-list">
                <li>✓ 14 days of full access</li>
                <li>✓ Unlimited topics</li>
                <li>✓ Advanced analytics</li>
                <li>✓ No credit card required</li>
                <li>✓ Cancel anytime</li>
              </ul>
              <button 
                className="btn btn-primary btn-large"
                onClick={handleStartTrial}
                disabled={loading || trialStatus?.hasUsedTrial}
              >
                {loading ? 'Starting...' : 'Start Free Trial'}
              </button>
              <p className="card-footer">One-time offer</p>
            </div>
          )}

          {/* Monthly Plan */}
          <div className={`pricing-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}>
            <div className="card-header">
              <h3 className="card-title">Monthly</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">{PRICING.monthly.price}</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="features-list">
              <li>✓ Everything in trial</li>
              <li>✓ Cancel anytime</li>
              <li>✓ Email support</li>
              <li>✓ Auto-renews monthly</li>
            </ul>
            <button 
              className="btn btn-secondary btn-large"
              onClick={() => handleSubscribe('monthly')}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Subscribe Monthly'}
            </button>
          </div>

          {/* Yearly Plan */}
          <div className={`pricing-card featured ${selectedPlan === 'yearly' ? 'selected' : ''}`}>
            <div className="badge">BEST VALUE</div>
            <div className="card-header">
              <h3 className="card-title">Yearly</h3>
              <div className="price">
                <span className="currency">$</span>
                <span className="amount">{PRICING.yearly.price}</span>
                <span className="period">/year</span>
              </div>
              <div className="savings">Save {subscriptionService.calculateSavings()} (2 months free!)</div>
            </div>
            <ul className="features-list">
              <li>✓ Everything in monthly</li>
              <li>✓ Priority support</li>
              <li>✓ Early access to new features</li>
              <li>✓ Best value pricing</li>
            </ul>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => handleSubscribe('yearly')}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Subscribe Yearly'}
            </button>
            <p className="card-footer">Billed annually</p>
          </div>
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
                <div style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>{study.icon}</div>
                <p className="testimonial-text">{study.text}</p>
                <div className="testimonial-author">
                  <span className="author-name">{study.author}</span>
                  <span className="author-role">{study.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Comparison */}
        <div className="features-section">
          <h2 className="section-title">Compare Plans</h2>
          <table className="features-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free Trial</th>
                <th>Monthly</th>
                <th>Yearly</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Duration</td>
                <td>14 days</td>
                <td>30 days</td>
                <td>365 days</td>
              </tr>
              <tr>
                <td>Unlimited Topics</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Advanced Analytics</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Priority Support</td>
                <td>-</td>
                <td>-</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Early Access</td>
                <td>-</td>
                <td>-</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Price</td>
                <td>Free</td>
                <td>$3/mo</td>
                <td>$2.50/mo</td>
              </tr>
            </tbody>
          </table>
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