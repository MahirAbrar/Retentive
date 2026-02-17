import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { logger } from '../utils/logger'
// import { GAMIFICATION_CONFIG } from '../config/gamification'

interface TimingSummary {
  totalReviews: number
  perfectCount: number
  onTimeCount: number
  lateCount: number
  overallPercentage: number
}

interface TopicTimingStats {
  topicId: string
  topicName: string
  totalItems: number
  totalReviews: number
  perfectCount: number
  onTimeCount: number
  lateCount: number
  onTimePercentage: number
  itemsNeedingAttention: number // Items with <60% on-time
}

interface ItemTimingStats {
  itemId: string
  content: string
  totalReviews: number
  perfectCount: number
  onTimeCount: number
  lateCount: number
  onTimePercentage: number
  lastReviewTiming: 'perfect' | 'onTime' | 'late' | null
  trend: 'improving' | 'declining' | 'stable'
}

class TimingStatsService {
  private static instance: TimingStatsService

  static getInstance(): TimingStatsService {
    if (!this.instance) {
      this.instance = new TimingStatsService()
    }
    return this.instance
  }

  /**
   * Get overall timing summary (cached for performance)
   */
  async getTimingSummary(userId: string, days?: number): Promise<TimingSummary> {
    const cacheKey = `timing-summary:${userId}:${days ?? 'all'}`
    const cached = cacheService.get<TimingSummary>(cacheKey)
    if (cached) return cached

    try {
      let query = supabase
        .from('review_sessions')
        .select('timing_bonus, points_earned')
        .eq('user_id', userId)

      if (days) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('reviewed_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate timing categories based on timing_bonus
      let perfectCount = 0
      let onTimeCount = 0
      let lateCount = 0

      for (const session of data || []) {
        if (session.timing_bonus >= 2.0) {
          perfectCount++
        } else if (session.timing_bonus >= 1.2) {
          onTimeCount++
        } else {
          lateCount++
        }
      }

      const totalReviews = data?.length || 0
      const overallPercentage = totalReviews > 0
        ? Math.round(((perfectCount + onTimeCount) / totalReviews) * 100)
        : 0

      const summary: TimingSummary = {
        totalReviews,
        perfectCount,
        onTimeCount,
        lateCount,
        overallPercentage
      }

      // Cache for 5 minutes
      cacheService.set(cacheKey, summary, 5 * 60 * 1000)
      return summary
    } catch (error) {
      logger.error('Error fetching timing summary:', error)
      return {
        totalReviews: 0,
        perfectCount: 0,
        onTimeCount: 0,
        lateCount: 0,
        overallPercentage: 0
      }
    }
  }

  /**
   * Get timing stats grouped by topic (optimized query)
   */
  async getTopicTimingStats(userId: string, days?: number): Promise<TopicTimingStats[]> {
    const cacheKey = `timing-topics:${userId}:${days ?? 'all'}`
    const cached = cacheService.get<TopicTimingStats[]>(cacheKey)
    if (cached) return cached

    try {
      const startDate = new Date()
      if (days) {
        startDate.setDate(startDate.getDate() - days)
      } else {
        startDate.setFullYear(2020)
      }

      // Single optimized query with aggregation at database level
      const { data, error } = await supabase
        .rpc('get_topic_timing_stats', {
          p_user_id: userId,
          p_date_limit: startDate.toISOString()
        })

      if (error) {
        // Fallback to manual query if RPC doesn't exist
        return this.getTopicTimingStatsFallback(userId, days)
      }

      const stats: TopicTimingStats[] = (data || []).map((row: any) => ({
        topicId: row.topic_id,
        topicName: row.topic_name,
        totalItems: row.total_items,
        totalReviews: row.total_reviews,
        perfectCount: row.perfect_count,
        onTimeCount: row.on_time_count,
        lateCount: row.late_count,
        onTimePercentage: row.total_reviews > 0
          ? Math.round(((row.perfect_count + row.on_time_count) / row.total_reviews) * 100)
          : 0,
        itemsNeedingAttention: row.items_needing_attention || 0
      }))

      // Cache for 2 minutes
      cacheService.set(cacheKey, stats, 2 * 60 * 1000)
      return stats
    } catch (error) {
      logger.error('Error fetching topic timing stats:', error)
      return []
    }
  }

  /**
   * Fallback method if database function doesn't exist
   */
  private async getTopicTimingStatsFallback(userId: string, days?: number): Promise<TopicTimingStats[]> {
    try {
      const startDate = new Date()
      if (days) {
        startDate.setDate(startDate.getDate() - days)
      } else {
        startDate.setFullYear(2020)
      }

      // Get topics
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name')
        .eq('user_id', userId)

      if (!topics) return []

      // Get review sessions with learning items
      const { data: sessions } = await supabase
        .from('review_sessions')
        .select(`
          id,
          timing_bonus,
          learning_items!inner (
            id,
            topic_id
          )
        `)
        .eq('user_id', userId)
        .gte('reviewed_at', startDate.toISOString())

      // Process data
      const topicStatsMap = new Map<string, TopicTimingStats>()

      for (const topic of topics) {
        topicStatsMap.set(topic.id, {
          topicId: topic.id,
          topicName: topic.name,
          totalItems: 0,
          totalReviews: 0,
          perfectCount: 0,
          onTimeCount: 0,
          lateCount: 0,
          onTimePercentage: 0,
          itemsNeedingAttention: 0
        })
      }

      // Count reviews per topic
      for (const session of sessions || []) {
        const topicId = (session.learning_items as any).topic_id
        const stats = topicStatsMap.get(topicId)
        
        if (stats) {
          stats.totalReviews++
          
          if (session.timing_bonus >= 2.0) {
            stats.perfectCount++
          } else if (session.timing_bonus >= 1.2) {
            stats.onTimeCount++
          } else {
            stats.lateCount++
          }
        }
      }

      // Calculate percentages
      const results = Array.from(topicStatsMap.values())
      for (const stat of results) {
        if (stat.totalReviews > 0) {
          stat.onTimePercentage = Math.round(
            ((stat.perfectCount + stat.onTimeCount) / stat.totalReviews) * 100
          )
        }
      }

      return results.filter(stat => stat.totalReviews > 0)
    } catch (error) {
      logger.error('Error in fallback timing stats:', error)
      return []
    }
  }

  /**
   * Get detailed timing stats for items in a topic (lazy loaded)
   */
  async getTopicItemDetails(topicId: string, limit = 20): Promise<ItemTimingStats[]> {
    const cacheKey = `timing-detail:${topicId}`
    const cached = cacheService.get<ItemTimingStats[]>(cacheKey)
    if (cached) return cached

    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Get learning items with their review sessions
      const { data, error } = await supabase
        .from('learning_items')
        .select(`
          id,
          content,
          review_sessions (
            id,
            timing_bonus,
            reviewed_at
          )
        `)
        .eq('topic_id', topicId)
        .order('content')
        .limit(limit)

      if (error) throw error

      const itemStats: ItemTimingStats[] = []

      for (const item of data || []) {
        const sessions = item.review_sessions || []
        let perfectCount = 0
        let onTimeCount = 0
        let lateCount = 0
        let lastReviewTiming: 'perfect' | 'onTime' | 'late' | null = null

        // Process sessions
        for (const session of sessions) {
          if (new Date(session.reviewed_at) < thirtyDaysAgo) continue

          if (session.timing_bonus >= 2.0) {
            perfectCount++
            if (!lastReviewTiming) lastReviewTiming = 'perfect'
          } else if (session.timing_bonus >= 1.2) {
            onTimeCount++
            if (!lastReviewTiming) lastReviewTiming = 'onTime'
          } else {
            lateCount++
            if (!lastReviewTiming) lastReviewTiming = 'late'
          }
        }

        const totalReviews = perfectCount + onTimeCount + lateCount
        const onTimePercentage = totalReviews > 0
          ? Math.round(((perfectCount + onTimeCount) / totalReviews) * 100)
          : 0

        // Determine trend (simplified for now)
        let trend: 'improving' | 'declining' | 'stable' = 'stable'
        if (sessions.length >= 3) {
          const recentSessions = sessions.slice(-3)
          const recentAvg = recentSessions.reduce((sum, s) => sum + s.timing_bonus, 0) / 3
          const olderSessions = sessions.slice(-6, -3)
          if (olderSessions.length === 3) {
            const olderAvg = olderSessions.reduce((sum, s) => sum + s.timing_bonus, 0) / 3
            if (recentAvg > olderAvg + 0.2) trend = 'improving'
            else if (recentAvg < olderAvg - 0.2) trend = 'declining'
          }
        }

        itemStats.push({
          itemId: item.id,
          content: item.content,
          totalReviews,
          perfectCount,
          onTimeCount,
          lateCount,
          onTimePercentage,
          lastReviewTiming,
          trend
        })
      }

      // Sort by performance (worst first)
      itemStats.sort((a, b) => a.onTimePercentage - b.onTimePercentage)

      // Cache for 1 minute
      cacheService.set(cacheKey, itemStats, 60 * 1000)
      return itemStats
    } catch (error) {
      logger.error('Error fetching topic item details:', error)
      return []
    }
  }

  /**
   * Clear timing caches when new reviews happen
   */
  clearCaches(userId: string, topicId?: string) {
    for (const range of [7, 30, 365, 'all']) {
      cacheService.delete(`timing-summary:${userId}:${range}`)
      cacheService.delete(`timing-topics:${userId}:${range}`)
    }
    if (topicId) {
      cacheService.delete(`timing-detail:${topicId}`)
    }
  }
}

export const timingStatsService = TimingStatsService.getInstance()