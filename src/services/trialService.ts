import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { cacheService } from './cacheService'

export type TrialStatus = {
  isActive: boolean
  hasUsedTrial: boolean
  daysRemaining: number
  startedAt: Date | null
  expiresAt: Date | null
}

export class TrialService {
  private static instance: TrialService
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  public static getInstance(): TrialService {
    if (!TrialService.instance) {
      TrialService.instance = new TrialService()
    }
    return TrialService.instance
  }

  async startTrial(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if trial has already been used
      const status = await this.getTrialStatus(userId)
      if (status.hasUsedTrial) {
        return { success: false, error: 'Trial has already been used' }
      }

      // Call the database function to start trial
      const { error } = await supabase.rpc('start_user_trial', {
        user_id: userId
      })

      if (error) {
        logger.error('Failed to start trial:', error)
        return { success: false, error: error.message }
      }

      // Clear cache to force refresh
      this.clearTrialCache(userId)

      return { success: true }
    } catch (error) {
      logger.error('Error starting trial:', error)
      return { success: false, error: 'Failed to start trial' }
    }
  }

  async getTrialStatus(userId: string): Promise<TrialStatus> {
    const cacheKey = `trial:${userId}`
    const cached = cacheService.get<TrialStatus>(cacheKey)
    if (cached) {
      logger.info('Using cached trial status:', cached)
      return cached
    }

    try {
      // Get trial information from user_settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('is_trial, has_used_trial, trial_started_at, trial_ended_at')
        .eq('user_id', userId)
        .single()

      logger.info('Trial data from DB:', { data, error, userId })

      if (error || !data) {
        logger.warn('No user settings found for trial:', { error, userId })
        // User settings might not exist yet
        return {
          isActive: false,
          hasUsedTrial: false,
          daysRemaining: 0,
          startedAt: null,
          expiresAt: null
        }
      }

      // Calculate trial status
      const now = new Date()
      const trialStarted = data.trial_started_at ? new Date(data.trial_started_at) : null
      const trialEnded = data.trial_ended_at ? new Date(data.trial_ended_at) : null
      
      let isActive = false
      let daysRemaining = 0
      let expiresAt = null

      if (data.is_trial && trialStarted && !trialEnded) {
        // Calculate expiry (14 days from start)
        expiresAt = new Date(trialStarted)
        expiresAt.setDate(expiresAt.getDate() + 14)
        
        if (now < expiresAt) {
          isActive = true
          daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      const status: TrialStatus = {
        isActive,
        hasUsedTrial: data.has_used_trial || false,
        daysRemaining,
        startedAt: trialStarted,
        expiresAt
      }

      // Cache for 5 minutes
      cacheService.set(cacheKey, status, 5 * 60 * 1000)

      return status
    } catch (error) {
      logger.error('Error getting trial status:', error)
      return {
        isActive: false,
        hasUsedTrial: false,
        daysRemaining: 0,
        startedAt: null,
        expiresAt: null
      }
    }
  }

  async checkTrialExpiry(userId: string): Promise<boolean> {
    const status = await this.getTrialStatus(userId)
    
    if (status.isActive && status.daysRemaining <= 0) {
      // Trial has expired, update database
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({
            is_trial: false,
            trial_ended_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) {
          logger.error('Failed to expire trial:', error)
        }

        this.clearTrialCache(userId)
        return true // Trial expired
      } catch (error) {
        logger.error('Error expiring trial:', error)
      }
    }

    return false // Trial not expired or not on trial
  }

  async getRemainingTrialDays(userId: string): Promise<number> {
    const status = await this.getTrialStatus(userId)
    return status.daysRemaining
  }

  async hasUsedTrial(userId: string): Promise<boolean> {
    const status = await this.getTrialStatus(userId)
    return status.hasUsedTrial
  }

  clearTrialCache(userId: string) {
    const cacheKey = `trial:${userId}`
    cacheService.delete(cacheKey)
  }

  formatTrialMessage(daysRemaining: number): string {
    if (daysRemaining <= 0) {
      return 'Your trial has expired'
    } else if (daysRemaining === 1) {
      return 'Your trial expires tomorrow!'
    } else if (daysRemaining <= 3) {
      return `Your trial expires in ${daysRemaining} days`
    } else {
      return `${daysRemaining} days left in your trial`
    }
  }
}

export const trialService = TrialService.getInstance()