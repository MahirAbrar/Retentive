import { supabase } from './supabase'
import { cacheService } from './cacheService'
import { requestDeduplicator } from './requestDeduplicator'
import type { Priority } from '../types/database'

interface Stats {
  overdue: number
  dueToday: number
  upcoming: number
  mastered: number
}

interface PriorityStats {
  priority: Priority
  label: string
  total: number
  due: number
  percentage: number
}

interface ExtendedStats extends Stats {
  priorityBreakdown: PriorityStats[]
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
    // Get overdue items (excluding new items with review_count = 0)
    const { count: overdue } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lt('next_review_at', now.toISOString())
      .not('next_review_at', 'is', null)
      .gt('review_count', 0)

    // Get due today items (excluding new items with review_count = 0)
    const { count: dueToday } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
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
      .gt('next_review_at', todayEnd.toISOString())
      .lte('next_review_at', weekFromNow.toISOString())

    // Get mastered items based on gamification config
    const { count: mastered } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('review_count', (await import('../config/gamification')).GAMIFICATION_CONFIG.MASTERY.reviewsRequired)

      return {
        overdue: overdue || 0,
        dueToday: dueToday || 0,
        upcoming: upcoming || 0,
        mastered: mastered || 0
      }
    } catch (error) {
      console.error('Error fetching study stats:', error)
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
    // Get total items and topics
    const { count: totalItems } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    const { count: totalTopics } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Get priority breakdown
    const { data: topics } = await supabase
      .from('topics')
      .select('id, priority')
      .eq('user_id', userId)
    
    // Priority categories
    type PriorityCategory = 'critical' | 'high' | 'medium' | 'low'
    
    // Convert numeric priority to category
    const getPriorityCategory = (priority: number): PriorityCategory => {
      if (priority >= 8) return 'critical'
      if (priority >= 6) return 'high'
      if (priority >= 4) return 'medium'
      return 'low'
    }
    
    const priorityMap: Record<PriorityCategory, { total: number; due: number }> = {
      critical: { total: 0, due: 0 },
      high: { total: 0, due: 0 },
      medium: { total: 0, due: 0 },
      low: { total: 0, due: 0 }
    }
    
    // Get items per topic with their due status
    for (const topic of topics || []) {
      const { data: items } = await supabase
        .from('learning_items')
        .select('id, next_review_at, review_count')
        .eq('topic_id', topic.id)
      
      const topicTotal = items?.length || 0
      const topicDue = items?.filter(item => 
        item.review_count > 0 && (!item.next_review_at || new Date(item.next_review_at) <= now)
      ).length || 0
      
      const category = getPriorityCategory(topic.priority)
      priorityMap[category].total += topicTotal
      priorityMap[category].due += topicDue
    }
    
    // Convert to array format
    const priorityBreakdown: PriorityStats[] = [
      {
        priority: 5,
        label: 'Critical',
        total: priorityMap.critical.total,
        due: priorityMap.critical.due,
        percentage: priorityMap.critical.total > 0 
          ? Math.round((priorityMap.critical.due / priorityMap.critical.total) * 100)
          : 0
      },
      {
        priority: 4,
        label: 'High',
        total: priorityMap.high.total,
        due: priorityMap.high.due,
        percentage: priorityMap.high.total > 0 
          ? Math.round((priorityMap.high.due / priorityMap.high.total) * 100)
          : 0
      },
      {
        priority: 3,
        label: 'Medium',
        total: priorityMap.medium.total,
        due: priorityMap.medium.due,
        percentage: priorityMap.medium.total > 0 
          ? Math.round((priorityMap.medium.due / priorityMap.medium.total) * 100)
          : 0
      },
      {
        priority: 2,
        label: 'Low',
        total: priorityMap.low.total,
        due: priorityMap.low.due,
        percentage: priorityMap.low.total > 0 
          ? Math.round((priorityMap.low.due / priorityMap.low.total) * 100)
          : 0
      }
    ]
    
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
    
    // Get next due item with priority-based selection (excluding new items)
    const { data: dueItems } = await supabase
      .from('learning_items')
      .select('*, topics!inner(priority)')
      .eq('user_id', userId)
      .lte('next_review_at', now.toISOString())
      .gt('review_count', 0)
      .order('next_review_at', { ascending: true })
      .limit(10) // Get a few to check for items due within 1 hour
    
    let nextDueIn: string | null = null
    if (dueItems && dueItems.length > 0) {
      // If items are due now or overdue, show as "Now"
      nextDueIn = "Now"
    } else {
      // Get next upcoming item (excluding new items)
      const { data: upcomingItems } = await supabase
        .from('learning_items')
        .select('next_review_at, priority, content, topics!inner(priority)')
        .eq('user_id', userId)
        .gt('next_review_at', now.toISOString())
        .gt('review_count', 0)
        .order('next_review_at', { ascending: true })
        .limit(10)
      
      if (upcomingItems && upcomingItems.length > 0) {
        // Group items due within 1 hour of the first item
        const firstDueTime = new Date(upcomingItems[0].next_review_at!)
        const oneHourLater = new Date(firstDueTime.getTime() + 60 * 60 * 1000)
        
        const itemsWithinHour = upcomingItems.filter(item => 
          new Date(item.next_review_at!) <= oneHourLater
        )
        
        // Sort by priority (highest first), then alphabetically
        const selectedItem = itemsWithinHour.sort((a: any, b: any) => {
          const priorityDiff = (b.topics?.[0]?.priority || b.priority) - (a.topics?.[0]?.priority || a.priority)
          if (priorityDiff !== 0) return priorityDiff
          return a.content.localeCompare(b.content)
        })[0]
        
        // Calculate time until due
        const timeDiff = new Date(selectedItem.next_review_at!).getTime() - now.getTime()
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
    
    // Count new items (never reviewed - review_count = 0)
    const { count: newItemsCount, error: newItemsError } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('review_count', 0)
    
    if (newItemsError) {
      console.error('Error counting new items:', newItemsError)
    }
    
    // Debug: Let's also check what we get without the review_count filter
    const { count: totalCount } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    console.log('Debug - Total items:', totalCount, 'New items (review_count=0):', newItemsCount)
    
    const result = {
      ...basicStats,
      priorityBreakdown,
      totalItems: totalItems || 0,
      totalTopics: totalTopics || 0,
      streakDays,
      nextDueIn,
      newItemsCount: newItemsCount || 0
    }
    
      // Cache for 1 hour (stats only change when user takes actions)
      cacheService.set(cacheKey, result, 60 * 60 * 1000)
      
      return result
    } catch (error) {
      console.error('Error fetching extended stats:', error)
      return {
        ...basicStats,
        priorityBreakdown: [],
        totalItems: 0,
        totalTopics: 0,
        streakDays: 0,
        nextDueIn: null,
        newItemsCount: 0
      }
    }
  })
}