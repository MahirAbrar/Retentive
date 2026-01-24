import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { cacheService } from './cacheService'
import { PRICING } from '../types/subscription'

export type SubscriptionStatus = {
  hasAccess: boolean
  isActive: boolean
  isPaid: boolean
  isTrial: boolean
  subscriptionType: 'monthly' | 'yearly' | null
  expiresAt: Date | null
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'inactive'
}

export class SubscriptionService {
  private static instance: SubscriptionService
  
  private constructor() {
    // No Stripe initialization - payments handled on marketing website
  }
  
  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService()
    }
    return SubscriptionService.instance
  }

  async checkAccess(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_app_access', {
        user_id: userId
      })

      if (error) {
        logger.error('Error checking access:', error)
        return false
      }

      return data || false
    } catch (error) {
      logger.error('Error checking access:', error)
      return false
    }
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const cacheKey = `subscription:${userId}`
    const cached = cacheService.get<SubscriptionStatus>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('is_paid, is_trial, subscription_type, subscription_expires_at, subscription_status, trial_started_at')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        // User settings might not exist yet
        return {
          hasAccess: false,
          isActive: false,
          isPaid: false,
          isTrial: false,
          subscriptionType: null,
          expiresAt: null,
          status: 'inactive'
        }
      }

      const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null
      const now = new Date()

      // Check if subscription is still valid
      // Simple rule: if expiry date is in the future, user has access
      // 'cancelled' just means won't auto-renew, not that access is revoked
      const isActive = expiresAt ? expiresAt > now : false
      
      // Check if trial is still valid (14 days from trial_started_at)
      let trialIsActive = false
      if (data.is_trial && data.trial_started_at) {
        const trialStart = new Date(data.trial_started_at)
        const trialExpiry = new Date(trialStart)
        trialExpiry.setDate(trialExpiry.getDate() + 14)
        trialIsActive = now < trialExpiry
        
        logger.info('Trial check in subscriptionService:', {
          is_trial: data.is_trial,
          trial_started_at: data.trial_started_at,
          trialExpiry: trialExpiry.toISOString(),
          now: now.toISOString(),
          trialIsActive
        })
      }
      
      const hasAccess = isActive || trialIsActive
      
      logger.info('Access determination in subscriptionService:', {
        isActive,
        trialIsActive,
        hasAccess,
        is_paid: data.is_paid,
        subscription_status: data.subscription_status
      })

      const status: SubscriptionStatus = {
        hasAccess,
        isActive,
        isPaid: data.is_paid || false,
        isTrial: data.is_trial || false,
        subscriptionType: data.subscription_type as 'monthly' | 'yearly' | null,
        expiresAt,
        status: (data.subscription_status as any) || 'inactive'
      }

      // Cache for 5 minutes
      cacheService.set(cacheKey, status, 5 * 60 * 1000)

      return status
    } catch (error) {
      logger.error('Error getting subscription status:', error)
      return {
        hasAccess: false,
        isActive: false,
        isPaid: false,
        isTrial: false,
        subscriptionType: null,
        expiresAt: null,
        status: 'inactive'
      }
    }
  }

  async createCheckoutSession(
    userId: string, 
    plan: 'monthly' | 'yearly'
  ): Promise<{ url: string | null; error?: string }> {
    try {
      // Get user email for marketing website
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { url: null, error: 'User not authenticated' }
      }

      // Redirect to marketing website with user info
      const marketingUrl = import.meta.env.VITE_MARKETING_URL || 'https://retentive.app'
      const checkoutUrl = new URL(`${marketingUrl}/subscribe`)
      checkoutUrl.searchParams.set('plan', plan)
      checkoutUrl.searchParams.set('email', user.email || '')
      checkoutUrl.searchParams.set('userId', userId)
      
      return { url: checkoutUrl.toString() }
    } catch (error) {
      logger.error('Error creating checkout URL:', error)
      return { url: null, error: 'Failed to create checkout URL' }
    }
  }

  async activateSubscription(
    userId: string, 
    plan: 'monthly' | 'yearly',
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('activate_subscription', {
        user_id: userId,
        subscription_type: plan,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        duration_days: plan === 'yearly' ? 365 : 30
      })

      if (error) {
        logger.error('Failed to activate subscription:', error)
        return { success: false, error: error.message }
      }

      // Clear cache to force refresh
      this.clearSubscriptionCache(userId)

      return { success: true }
    } catch (error) {
      logger.error('Error activating subscription:', error)
      return { success: false, error: 'Failed to activate subscription' }
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current subscription
      const { data: userData, error: userError } = await supabase
        .from('user_settings')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single()

      if (userError || !userData?.stripe_subscription_id) {
        return { success: false, error: 'No active subscription found' }
      }

      // Call Supabase Edge Function to cancel Stripe subscription
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: userData.stripe_subscription_id
        }
      })

      if (error) {
        logger.error('Error cancelling subscription:', error)
        return { success: false, error: error.message }
      }

      // Update database
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          subscription_status: 'cancelled'
        })
        .eq('user_id', userId)

      if (updateError) {
        logger.error('Failed to update subscription status:', updateError)
      }

      this.clearSubscriptionCache(userId)
      return { success: true }
    } catch (error) {
      logger.error('Error cancelling subscription:', error)
      return { success: false, error: 'Failed to cancel subscription' }
    }
  }

  async checkAndExpireSubscriptions(): Promise<void> {
    try {
      const { error } = await supabase.rpc('check_and_expire_subscriptions')
      
      if (error) {
        logger.error('Error checking expired subscriptions:', error)
      }
    } catch (error) {
      logger.error('Error in subscription expiry check:', error)
    }
  }

  clearSubscriptionCache(userId: string) {
    const cacheKey = `subscription:${userId}`
    cacheService.delete(cacheKey)
  }

  formatPrice(plan: 'monthly' | 'yearly'): string {
    const pricing = PRICING[plan]
    if (!pricing) return ''
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: pricing.currency
    })
    
    return formatter.format(pricing.price)
  }

  calculateSavings(): string {
    const monthlyCost = PRICING.monthly.price * 12
    const yearlyCost = PRICING.yearly.price
    const savings = monthlyCost - yearlyCost
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })
    
    return formatter.format(savings)
  }
}

export const subscriptionService = SubscriptionService.getInstance()