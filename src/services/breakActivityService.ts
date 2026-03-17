import { BREAK_CATEGORIES, type BreakActivity, type BreakCategory } from '../config/breakActivities'

/**
 * Get break category by ID
 */
export function getBreakCategory(categoryId: string): BreakCategory | undefined {
  return BREAK_CATEGORIES.find((cat) => cat.id === categoryId)
}

/**
 * Get all activities across all categories
 */
export function getAllActivities(): BreakActivity[] {
  return BREAK_CATEGORIES.flatMap((cat) => cat.activities)
}

/**
 * Get activity by ID
 */
export function getActivityById(activityId: string): BreakActivity | undefined {
  const allActivities = getAllActivities()
  return allActivities.find((act) => act.id === activityId)
}
