import { supabase } from './supabase'

interface Stats {
  overdue: number
  dueToday: number
  upcoming: number
  mastered: number
}

export async function getStudyStats(userId: string): Promise<Stats> {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  
  try {
    // Get overdue items
    const { count: overdue } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lt('next_review_at', now.toISOString())
      .not('next_review_at', 'is', null)

    // Get due today items
    const { count: dueToday } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('next_review_at', now.toISOString())
      .lte('next_review_at', todayEnd.toISOString())

    // Get upcoming items (next 7 days)
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    
    const { count: upcoming } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('next_review_at', todayEnd.toISOString())
      .lte('next_review_at', weekFromNow.toISOString())

    // Get mastered items (reviewed more than 5 times with good performance)
    const { count: mastered } = await supabase
      .from('learning_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('review_count', 5)
      .gte('ease_factor', 2.5)

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
}