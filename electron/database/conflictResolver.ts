export class ConflictResolver {
  // Topics: Last write wins based on updated_at
  resolveTopic(local: any, remote: any) {
    const localTime = new Date(local.updated_at).getTime()
    const remoteTime = new Date(remote.updated_at).getTime()
    
    if (localTime > remoteTime) {
      return local
    } else {
      return remote
    }
  }

  // Learning Items: Last write wins for content, merge for review data
  resolveLearningItem(local: any, remote: any) {
    const localTime = new Date(local.updated_at).getTime()
    const remoteTime = new Date(remote.updated_at).getTime()
    
    // For content changes, last write wins
    const content = localTime > remoteTime ? local.content : remote.content
    
    // For review data, take the higher review count
    const review_count = Math.max(local.review_count, remote.review_count)
    
    // Take the most recent review date
    let last_reviewed_at = null
    if (local.last_reviewed_at && remote.last_reviewed_at) {
      const localReview = new Date(local.last_reviewed_at).getTime()
      const remoteReview = new Date(remote.last_reviewed_at).getTime()
      last_reviewed_at = localReview > remoteReview ? local.last_reviewed_at : remote.last_reviewed_at
    } else {
      last_reviewed_at = local.last_reviewed_at || remote.last_reviewed_at
    }
    
    // Take the nearest next review date
    let next_review_at = null
    if (local.next_review_at && remote.next_review_at) {
      const localNext = new Date(local.next_review_at).getTime()
      const remoteNext = new Date(remote.next_review_at).getTime()
      const now = Date.now()
      
      // If both are in the future, take the earlier one
      if (localNext > now && remoteNext > now) {
        next_review_at = localNext < remoteNext ? local.next_review_at : remote.next_review_at
      } else {
        // Otherwise take the most recent
        next_review_at = localNext > remoteNext ? local.next_review_at : remote.next_review_at
      }
    } else {
      next_review_at = local.next_review_at || remote.next_review_at
    }
    
    return {
      ...local,
      content,
      review_count,
      last_reviewed_at,
      next_review_at,
      ease_factor: remote.ease_factor, // Trust remote for algorithm values
      interval_days: remote.interval_days,
      updated_at: new Date().toISOString()
    }
  }

  // Gamification Stats: Merge by taking higher values
  resolveGamificationStats(local: any, remote: any) {
    // Calculate streak from review history instead of trusting either value
    // This will be done by the service layer
    
    return {
      total_points: Math.max(local.total_points || 0, remote.total_points || 0),
      current_level: Math.max(local.current_level || 1, remote.current_level || 1),
      current_streak: Math.max(local.current_streak || 0, remote.current_streak || 0),
      longest_streak: Math.max(local.longest_streak || 0, remote.longest_streak || 0),
      last_review_date: this.getMostRecent(local.last_review_date, remote.last_review_date)
    }
  }

  // Daily Stats: Sum the values
  resolveDailyStats(local: any, remote: any) {
    return {
      points_earned: (local.points_earned || 0) + (remote.points_earned || 0),
      reviews_completed: (local.reviews_completed || 0) + (remote.reviews_completed || 0),
      perfect_timing_count: (local.perfect_timing_count || 0) + (remote.perfect_timing_count || 0),
      items_mastered: (local.items_mastered || 0) + (remote.items_mastered || 0)
    }
  }

  // Helper: Get most recent date
  private getMostRecent(date1: string | null, date2: string | null): string | null {
    if (!date1) return date2
    if (!date2) return date1
    
    const time1 = new Date(date1).getTime()
    const time2 = new Date(date2).getTime()
    
    return time1 > time2 ? date1 : date2
  }
}

export const conflictResolver = new ConflictResolver()