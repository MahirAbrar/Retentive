import { logger } from '../utils/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { supabaseService } from './supabaseService'
import { dataService } from './dataService'
import type { Topic, LearningItem, Subject } from '../types/database'
import { subjectService } from './subjectService'
import { handleError } from '../utils/errors'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeChangeHandler<T> {
  onInsert?: (record: T) => void
  onUpdate?: (record: T, oldRecord: T) => void
  onDelete?: (oldRecord: T) => void
  onError?: (error: Error) => void
}

export interface PresenceState {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen: Date
  metadata?: Record<string, any>
}

export class RealtimeService {
  private static instance: RealtimeService
  private channels: Map<string, RealtimeChannel> = new Map()
  private presenceChannel: RealtimeChannel | null = null
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private subscriptionLocks: Set<string> = new Set() // Prevent race conditions
  private reconnectAttempts: Map<string, number> = new Map() // Track retry attempts
  private static readonly MAX_RECONNECT_ATTEMPTS = 5

  private constructor() {
    this.setupConnectionHandling()
  }
  
  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  private setupConnectionHandling() {
    // Monitor connection status
    supabaseService.onConnectionStatusChange((status) => {
      if (status.isOnline) {
        this.reconnectAllChannels()
      } else {
        this.pauseAllChannels()
      }
    })
  }

  // Topic Subscriptions

  subscribeToTopics(
    userId: string,
    handlers: RealtimeChangeHandler<Topic>
  ): () => void {
    const channelName = `topics:${userId}`

    // Prevent race conditions - skip if subscription is in progress
    if (this.subscriptionLocks.has(channelName)) {
      logger.log(`Subscription to ${channelName} already in progress, skipping`)
      return () => this.unsubscribeFromChannel(channelName)
    }

    // Unsubscribe from existing channel if any
    this.unsubscribeFromChannel(channelName)
    this.subscriptionLocks.add(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topics',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Topic>) => {
          this.handleTopicChange(payload, handlers)
        }
      )
      .subscribe((status) => {
        this.subscriptionLocks.delete(channelName)
        if (status === 'SUBSCRIBED') {
          logger.log(`Subscribed to topics for user ${userId}`)
          this.reconnectAttempts.delete(channelName) // Reset on success
        } else if (status === 'CHANNEL_ERROR') {
          handlers.onError?.(new Error('Failed to subscribe to topics'))
          this.scheduleReconnect(channelName, () => {
            this.subscribeToTopics(userId, handlers)
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromChannel(channelName)
  }

  // Subject Subscriptions

  subscribeToSubjects(
    userId: string,
    handlers: RealtimeChangeHandler<Subject>
  ): () => void {
    const channelName = `subjects:${userId}`

    // Prevent race conditions - skip if subscription is in progress
    if (this.subscriptionLocks.has(channelName)) {
      logger.log(`Subscription to ${channelName} already in progress, skipping`)
      return () => this.unsubscribeFromChannel(channelName)
    }

    // Unsubscribe from existing channel if any
    this.unsubscribeFromChannel(channelName)
    this.subscriptionLocks.add(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Subject>) => {
          this.handleSubjectChange(payload, handlers, userId)
        }
      )
      .subscribe((status) => {
        this.subscriptionLocks.delete(channelName)
        if (status === 'SUBSCRIBED') {
          logger.log(`Subscribed to subjects for user ${userId}`)
          this.reconnectAttempts.delete(channelName) // Reset on success
        } else if (status === 'CHANNEL_ERROR') {
          handlers.onError?.(new Error('Failed to subscribe to subjects'))
          this.scheduleReconnect(channelName, () => {
            this.subscribeToSubjects(userId, handlers)
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromChannel(channelName)
  }

  subscribeTopic(
    topicId: string,
    handlers: RealtimeChangeHandler<Topic>
  ): () => void {
    const channelName = `topic:${topicId}`
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromChannel(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topics',
          filter: `id=eq.${topicId}`,
        },
        (payload: RealtimePostgresChangesPayload<Topic>) => {
          this.handleTopicChange(payload, handlers)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log(`Subscribed to topic ${topicId}`)
        } else if (status === 'CHANNEL_ERROR') {
          handlers.onError?.(new Error('Failed to subscribe to topic'))
          this.scheduleReconnect(channelName, () => {
            this.subscribeTopic(topicId, handlers)
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromChannel(channelName)
  }

  // Learning Item Subscriptions

  subscribeToTopicItems(
    topicId: string,
    handlers: RealtimeChangeHandler<LearningItem>
  ): () => void {
    const channelName = `topic_items:${topicId}`
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromChannel(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_items',
          filter: `topic_id=eq.${topicId}`,
        },
        (payload: RealtimePostgresChangesPayload<LearningItem>) => {
          this.handleItemChange(payload, handlers)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log(`Subscribed to items for topic ${topicId}`)
        } else if (status === 'CHANNEL_ERROR') {
          handlers.onError?.(new Error('Failed to subscribe to topic items'))
          this.scheduleReconnect(channelName, () => {
            this.subscribeToTopicItems(topicId, handlers)
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromChannel(channelName)
  }

  subscribeToUserItems(
    userId: string,
    handlers: RealtimeChangeHandler<LearningItem>
  ): () => void {
    const channelName = `user_items:${userId}`
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromChannel(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<LearningItem>) => {
          this.handleItemChange(payload, handlers)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log(`Subscribed to items for user ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          handlers.onError?.(new Error('Failed to subscribe to user items'))
          this.scheduleReconnect(channelName, () => {
            this.subscribeToUserItems(userId, handlers)
          })
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribeFromChannel(channelName)
  }

  // Presence (for future collaboration features)

  joinPresence(
    roomId: string,
    userId: string,
    metadata?: Record<string, any>
  ): () => void {
    const channelName = `presence:${roomId}`
    
    // Leave existing presence channel if any
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe()
    }

    this.presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState()
        logger.log('Presence sync:', state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel?.track({
            userId,
            status: 'online',
            lastSeen: new Date(),
            metadata,
          })
        }
      })

    return () => {
      this.presenceChannel?.unsubscribe()
      this.presenceChannel = null
    }
  }

  // Private methods

  private handleTopicChange(
    payload: RealtimePostgresChangesPayload<Topic>,
    handlers: RealtimeChangeHandler<Topic>
  ) {
    try {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            handlers.onInsert?.(payload.new as Topic)
            // Clear cache
            dataService.clearCache()
          }
          break
        
        case 'UPDATE':
          if (payload.new && payload.old) {
            handlers.onUpdate?.(payload.new as Topic, payload.old as Topic)
            // Clear cache
            dataService.clearCache()
          }
          break
        
        case 'DELETE':
          if (payload.old) {
            handlers.onDelete?.(payload.old as Topic)
            // Clear cache
            dataService.clearCache()
          }
          break
      }
    } catch (error) {
      handleError(error, 'Realtime topic change')
      handlers.onError?.(error as Error)
    }
  }

  private handleItemChange(
    payload: RealtimePostgresChangesPayload<LearningItem>,
    handlers: RealtimeChangeHandler<LearningItem>
  ) {
    try {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            handlers.onInsert?.(payload.new as LearningItem)
            // Clear cache
            dataService.clearCache()
          }
          break

        case 'UPDATE':
          if (payload.new && payload.old) {
            handlers.onUpdate?.(payload.new as LearningItem, payload.old as LearningItem)
            // Clear cache
            dataService.clearCache()
          }
          break

        case 'DELETE':
          if (payload.old) {
            handlers.onDelete?.(payload.old as LearningItem)
            // Clear cache
            dataService.clearCache()
          }
          break
      }
    } catch (error) {
      handleError(error, 'Realtime item change')
      handlers.onError?.(error as Error)
    }
  }

  private handleSubjectChange(
    payload: RealtimePostgresChangesPayload<Subject>,
    handlers: RealtimeChangeHandler<Subject>,
    userId: string
  ) {
    try {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            handlers.onInsert?.(payload.new as Subject)
            // Clear subject cache
            subjectService.clearCache(userId)
          }
          break

        case 'UPDATE':
          if (payload.new && payload.old) {
            handlers.onUpdate?.(payload.new as Subject, payload.old as Subject)
            // Clear subject cache
            subjectService.clearCache(userId)
          }
          break

        case 'DELETE':
          if (payload.old) {
            handlers.onDelete?.(payload.old as Subject)
            // Clear subject cache
            subjectService.clearCache(userId)
          }
          break
      }
    } catch (error) {
      handleError(error, 'Realtime subject change')
      handlers.onError?.(error as Error)
    }
  }

  private unsubscribeFromChannel(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelName)
    }

    // Clear any reconnect timeout
    const timeout = this.reconnectTimeouts.get(channelName)
    if (timeout) {
      clearTimeout(timeout)
      this.reconnectTimeouts.delete(channelName)
    }
  }

  private scheduleReconnect(channelName: string, reconnectFn: () => void, delay: number = 5000) {
    // Check retry limit to prevent infinite loops
    const attempts = this.reconnectAttempts.get(channelName) || 0
    if (attempts >= RealtimeService.MAX_RECONNECT_ATTEMPTS) {
      logger.warn(`Max reconnect attempts (${RealtimeService.MAX_RECONNECT_ATTEMPTS}) reached for ${channelName}, giving up`)
      this.reconnectAttempts.delete(channelName)
      return
    }

    // Increment attempt counter
    this.reconnectAttempts.set(channelName, attempts + 1)

    // Clear existing timeout if any
    const existingTimeout = this.reconnectTimeouts.get(channelName)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Use exponential backoff
    const backoffDelay = delay * Math.pow(2, attempts)
    logger.log(`Scheduling reconnect for ${channelName} in ${backoffDelay}ms (attempt ${attempts + 1}/${RealtimeService.MAX_RECONNECT_ATTEMPTS})`)

    const timeout = setTimeout(() => {
      this.reconnectTimeouts.delete(channelName)
      reconnectFn()
    }, backoffDelay)

    this.reconnectTimeouts.set(channelName, timeout)
  }

  private pauseAllChannels() {
    // Channels automatically pause when offline
    logger.log('Pausing all realtime channels due to offline status')
  }

  private reconnectAllChannels() {
    logger.log('Reconnecting all realtime channels')
    // Channels automatically reconnect when online
  }

  // Cleanup

  unsubscribeAll() {
    // Unsubscribe from all channels
    this.channels.forEach((_channel, name) => {
      this.unsubscribeFromChannel(name)
    })

    // Unsubscribe from presence
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe()
      this.presenceChannel = null
    }

    // Clear all reconnect timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout))
    this.reconnectTimeouts.clear()
  }
}

export const realtimeService = RealtimeService.getInstance()