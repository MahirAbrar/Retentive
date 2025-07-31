import { supabase } from '../services/supabase'
import type { ExportData } from './dataExport'
import type { Topic, LearningItem } from '../types/database'

export interface ImportResult {
  success: boolean
  topicsImported: number
  itemsImported: number
  errors: string[]
}

export async function importUserData(
  data: ExportData, 
  userId: string,
  mergeStrategy: 'replace' | 'merge' = 'merge'
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    topicsImported: 0,
    itemsImported: 0,
    errors: []
  }

  try {
    // If replace strategy, delete existing data first
    if (mergeStrategy === 'replace') {
      // Delete all existing topics (this will cascade delete items)
      const { error: deleteError } = await supabase
        .from('topics')
        .delete()
        .eq('user_id', userId)
      
      if (deleteError) {
        result.errors.push('Failed to delete existing data')
        return result
      }
    }

    // Create a mapping of old topic IDs to new topic IDs
    const topicIdMap = new Map<string, string>()

    // Import topics
    for (const topic of data.topics) {
      const newTopic: Omit<Topic, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        name: topic.name,
        learning_mode: topic.learning_mode,
        priority: topic.priority
      }

      const { data: insertedTopic, error: topicError } = await supabase
        .from('topics')
        .insert(newTopic)
        .select()
        .single()

      if (topicError) {
        result.errors.push(`Failed to import topic "${topic.name}": ${topicError.message}`)
        continue
      }

      if (insertedTopic) {
        topicIdMap.set(topic.id, insertedTopic.id)
        result.topicsImported++
      }
    }

    // Import learning items
    for (const item of data.learningItems) {
      const newTopicId = topicIdMap.get(item.topic_id)
      if (!newTopicId) {
        result.errors.push(`Skipping item "${item.content}" - topic not found`)
        continue
      }

      const newItem: Omit<LearningItem, 'id' | 'created_at' | 'updated_at'> = {
        topic_id: newTopicId,
        content: item.content,
        priority: item.priority,
        review_count: item.review_count,
        last_reviewed_at: item.last_reviewed_at,
        next_review_at: item.next_review_at,
        ease_factor: item.ease_factor,
        interval_days: item.interval_days
      }

      const { error: itemError } = await supabase
        .from('learning_items')
        .insert(newItem)

      if (itemError) {
        result.errors.push(`Failed to import item "${item.content}": ${itemError.message}`)
        continue
      }

      result.itemsImported++
    }

    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

export function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve(data)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}