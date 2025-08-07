import { useMemo } from 'react'
import { LearningItem } from '../types/database'
import { spacedRepetitionGamified } from '../services/spacedRepetitionGamified'

export function useOptimizedStats(items: LearningItem[]) {
  // Memoize expensive calculations
  const stats = useMemo(() => {
    const dueItems = spacedRepetitionGamified.getDueItems(items)
    const newItems = items.filter(item => item.review_count === 0)
    const masteredItems = items.filter(item => item.review_count >= 5)
    
    return {
      total: items.length,
      due: dueItems.length,
      new: newItems.length,
      mastered: masteredItems.length,
      dueItems,
      newItems,
      masteredItems
    }
  }, [items])

  const itemsByStatus = useMemo(() => {
    const statusMap = new Map<string, LearningItem[]>()
    
    items.forEach(item => {
      const status = item.review_count === 0 ? 'new' : 
                     item.review_count >= 5 ? 'mastered' :
                     spacedRepetitionGamified.getDueItems([item]).length > 0 ? 'due' : 
                     'learning'
      
      if (!statusMap.has(status)) {
        statusMap.set(status, [])
      }
      statusMap.get(status)!.push(item)
    })
    
    return statusMap
  }, [items])

  const progressPercentage = useMemo(() => {
    if (items.length === 0) return 0
    return Math.round((stats.mastered / items.length) * 100)
  }, [items.length, stats.mastered])

  return {
    ...stats,
    itemsByStatus,
    progressPercentage
  }
}