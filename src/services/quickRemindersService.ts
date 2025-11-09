/**
 * Quick Reminders Service
 * Manages user's quick reminder notes accessible from navbar
 */

import { supabase } from './supabase'
import { logger } from '../utils/logger'
import type { QuickReminder } from '../types/database'

class QuickRemindersService {
  private static instance: QuickRemindersService

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): QuickRemindersService {
    if (!QuickRemindersService.instance) {
      QuickRemindersService.instance = new QuickRemindersService()
    }
    return QuickRemindersService.instance
  }

  /**
   * Get all reminders for a user
   */
  async getReminders(userId: string): Promise<{ data: QuickReminder[] | null; error: any }> {
    try {
      logger.info('Fetching quick reminders for user', { userId })

      const { data, error } = await supabase
        .from('quick_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching quick reminders:', error)
        return { data: null, error }
      }

      logger.info('Successfully fetched quick reminders', { count: data?.length || 0 })
      return { data, error: null }
    } catch (error) {
      logger.error('Unexpected error fetching quick reminders:', error)
      return { data: null, error }
    }
  }

  /**
   * Add a new reminder
   */
  async addReminder(
    userId: string,
    content: string
  ): Promise<{ data: QuickReminder | null; error: any }> {
    try {
      if (!content.trim()) {
        return { data: null, error: new Error('Reminder content cannot be empty') }
      }

      logger.info('Adding quick reminder', { userId, contentLength: content.length })

      const { data, error } = await supabase
        .from('quick_reminders')
        .insert({
          user_id: userId,
          content: content.trim(),
          completed: false,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error adding quick reminder:', error)
        return { data: null, error }
      }

      logger.info('Successfully added quick reminder', { reminderId: data.id })
      return { data, error: null }
    } catch (error) {
      logger.error('Unexpected error adding quick reminder:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<{ error: any }> {
    try {
      logger.info('Deleting quick reminder', { reminderId })

      const { error } = await supabase
        .from('quick_reminders')
        .delete()
        .eq('id', reminderId)

      if (error) {
        logger.error('Error deleting quick reminder:', error)
        return { error }
      }

      logger.info('Successfully deleted quick reminder', { reminderId })
      return { error: null }
    } catch (error) {
      logger.error('Unexpected error deleting quick reminder:', error)
      return { error }
    }
  }

  /**
   * Toggle completed status
   */
  async toggleCompleted(
    reminderId: string,
    completed: boolean
  ): Promise<{ data: QuickReminder | null; error: any }> {
    try {
      logger.info('Toggling reminder completed status', { reminderId, completed })

      const { data, error } = await supabase
        .from('quick_reminders')
        .update({ completed })
        .eq('id', reminderId)
        .select()
        .single()

      if (error) {
        logger.error('Error toggling reminder completed status:', error)
        return { data: null, error }
      }

      logger.info('Successfully toggled reminder completed status', { reminderId })
      return { data, error: null }
    } catch (error) {
      logger.error('Unexpected error toggling reminder completed status:', error)
      return { data: null, error }
    }
  }

  /**
   * Get reminder count for badge
   */
  async getReminderCount(userId: string): Promise<{ count: number; error: any }> {
    try {
      const { count, error } = await supabase
        .from('quick_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) {
        logger.error('Error getting reminder count:', error)
        return { count: 0, error }
      }

      return { count: count || 0, error: null }
    } catch (error) {
      logger.error('Unexpected error getting reminder count:', error)
      return { count: 0, error }
    }
  }
}

export const quickRemindersService = QuickRemindersService.getInstance()
