import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { requestDeduplicator } from './requestDeduplicator'
import { logger } from '../utils/logger'
import { GAMIFICATION_CONFIG } from '../config/gamification'

interface Stats {
  overdue: number
  dueToday: number
  upcoming: number
  mastered: number
}

interface ExtendedStats extends Stats {
  totalItems: number
  totalTopics: number
  streakDays: number
  nextDueIn: string | null
  newItemsCount: number
}

export async function getStudyStats(userId: string): Promise<Stats> {
  // Deduplicate requests with a normalized timestamp
  const now = new Date()
  const normalizedTime = requestDeduplicator.normalizeTimestamp(now, 'minute')
  const dedupeKey = `study-stats:${userId}:${normalizedTime}`
  
  return requestDeduplicator.execute(dedupeKey, async () => {
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)
    
    try {
    // Get active (non-archived) topic IDs first
    const { data: activeTopics } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)
      .neq('archive_status', 'archived')
    
    const activeTopicIds = activeTopics?.map(t => t.id) || []
    
    // Get overdue items (excluding new items with review_count = 0 and archived topics)
    const { count: overdue } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('topic_id', activeTopicIds)
      .lt('next_review_at', now.toISOString())
      .not('next_review_at', 'is', null)
      .gt('review_count', 0)

    // Get due today items (excluding new items with review_count = 0 and archived topics)
    const { count: dueToday } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('topic_id', activeTopicIds)
      .gte('next_review_at', now.toISOString())
      .lte('next_review_at', todayEnd.toISOString())
      .gt('review_count', 0)

    // Get upcoming items (next 7 days)
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    
    const { count: upcoming } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('topic_id', activeTopicIds)
      .gt('next_review_at', todayEnd.toISOString())
      .lte('next_review_at', weekFromNow.toISOString())

    // Get mastered items based on gamification config (excluding archived topics)
    const { count: mastered } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('topic_id', activeTopicIds)
      .gte('review_count', GAMIFICATION_CONFIG.MASTERY.reviewsRequired)

      return {
        overdue: overdue || 0,
        dueToday: dueToday || 0,
        upcoming: upcoming || 0,
        mastered: mastered || 0
      }
    } catch (error) {
      logger.error('Error fetching study stats:', error)
      return {
        overdue: 0,
        dueToday: 0,
        upcoming: 0,
        mastered: 0
      }
    }
  })
}

export async function getExtendedStats(userId: string): Promise<ExtendedStats> {
  // Check cache first
  const cacheKey = `stats:${userId}`
  const cached = cacheService.get<ExtendedStats>(cacheKey)
  if (cached) return cached
  
  // Deduplicate requests
  const now = new Date()
  const normalizedTime = requestDeduplicator.normalizeTimestamp(now, 'minute')
  const dedupeKey = `extended-stats:${userId}:${normalizedTime}`
  
  return requestDeduplicator.execute(dedupeKey, async () => {
    const basicStats = await getStudyStats(userId)
    
    try {
    // Get total items (excluding archived topics)
    // Get active (non-archived) topics for proper counts
    const { data: activeTopicsForStats } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)
      .neq('archive_status', 'archived')
    
    const activeTopicIdsForStats = activeTopicsForStats?.map(t => t.id) || []
    const totalTopics = activeTopicsForStats?.length || 0

    // Skip query if no active topics
    let totalItems = 0
    if (activeTopicIdsForStats.length > 0) {
      const { count } = await supabase
        .from('learning_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('topic_id', activeTopicIdsForStats)
      totalItems = count || 0
    }
    
    // Calculate streak days (consecutive days with reviews)
    const { data: recentSessions } = await supabase
      .from('review_sessions')
      .select('reviewed_at')
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: false })
      .limit(100)
    
    let streakDays = 0
    if (recentSessions && recentSessions.length > 0) {
      const dates = new Set<string>()
      recentSessions.forEach(session => {
        const date = new Date(session.reviewed_at).toDateString()
        dates.add(date)
      })
      
      // Check consecutive days from today backwards
      const checkDate = new Date()
      while (dates.has(checkDate.toDateString())) {
        streakDays++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }
    
    // Get next due item (excluding new items and archived topics)
    const { data: dueItems } = await supabase
      .from('learning_items')
      .select('*, topics!inner(archive_status)')
      .eq('user_id', userId)
      .neq('topics.archive_status', 'archived')
      .lte('next_review_at', now.toISOString())
      .gt('review_count', 0)
      .order('next_review_at', { ascending: true })
      .limit(10)
    
    let nextDueIn: string | null = null
    if (dueItems && dueItems.length > 0) {
      // If items are due now or overdue, show as "Now"
      nextDueIn = "Now"
    } else {
      // Get next upcoming item (excluding new items and archived topics)
      const { data: upcomingItems } = await supabase
        .from('learning_items')
        .select('next_review_at, content, topics!inner(archive_status)')
        .eq('user_id', userId)
        .neq('topics.archive_status', 'archived')
        .gt('next_review_at', now.toISOString())
        .gt('review_count', 0)
        .order('next_review_at', { ascending: true })
        .limit(1)

      if (upcomingItems && upcomingItems.length > 0) {
        const selectedItem = upcomingItems[0]

        // Calculate time until due
        if (selectedItem.next_review_at) {
        const timeDiff = new Date(selectedItem.next_review_at).getTime() - now.getTime()
        const minutes = Math.floor(timeDiff / (1000 * 60))
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (minutes < 60) {
          nextDueIn = `${minutes} minute${minutes !== 1 ? 's' : ''}`
        } else if (hours < 24) {
          nextDueIn = `${hours} hour${hours !== 1 ? 's' : ''}`
        } else {
          nextDueIn = `${days} day${days !== 1 ? 's' : ''}`
        }
        }
      }
    }
    
    // Count new items (never reviewed - review_count = 0, excluding archived topics)
    const { count: newItemsCount, error: newItemsError } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('topic_id', activeTopicIdsForStats.length > 0 ? activeTopicIdsForStats : ['00000000-0000-0000-0000-000000000000'])
      .eq('review_count', 0)
    
    if (newItemsError) {
      logger.error('Error counting new items:', newItemsError)
    }
    
    // Debug removed - use logger if needed
    // logger.debug('New items:', newItemsCount)
    
    const result = {
      ...basicStats,
      totalItems: totalItems || 0,
      totalTopics: totalTopics || 0,
      streakDays,
      nextDueIn,
      newItemsCount: newItemsCount || 0
    }
    
      // Cache for 5 minutes (balance between freshness and performance)
      cacheService.set(cacheKey, result, 5 * 60 * 1000)
      
      return result
    } catch (error) {
      logger.error('Error fetching extended stats:', error)
      return {
        ...basicStats,
        totalItems: 0,
        totalTopics: 0,
        streakDays: 0,
        nextDueIn: null,
        newItemsCount: 0
      }
    }
  })
}