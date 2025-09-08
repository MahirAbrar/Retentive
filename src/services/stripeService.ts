import { loadStripe } from '@stripe/stripe-js'
import { STRIPE_CONFIG } from '../config/stripe'
import { logger } from '../utils/logger'

class StripeService {
  private static instance: StripeService
  private stripePromise: ReturnType<typeof loadStripe> | null = null

  private constructor() {
    if (STRIPE_CONFIG.publishableKey) {
      this.stripePromise = loadStripe(STRIPE_CONFIG.publishableKey)
    }
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService()
    }
    return StripeService.instance
  }

  async createTestCheckout(
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    try {
      const stripe = await this.stripePromise
      if (!stripe) {
        throw new Error('Stripe not initialized')
      }

      // For testing, we'll redirect to Stripe Checkout with just the price
      // In production, you'd create a checkout session on your backend
      logger.info('Creating Stripe checkout for price:', priceId)
      
      // This is a simplified version for testing
      // You'll need backend endpoints for production
      const checkoutUrl = `https://checkout.stripe.com/c/pay/${priceId}#${encodeURIComponent(email)}`
      
      logger.warn('Using test checkout - implement backend for production')
      
      return {
        url: checkoutUrl,
        error: 'Test mode - please implement backend checkout session creation'
      }
    } catch (error) {
      logger.error('Error creating checkout:', error)
      return {
        url: null,
        error: 'Failed to create checkout session'
      }
    }
  }

  async getStripe() {
    return this.stripePromise
  }
}

export const stripeService = StripeService.getInstance()