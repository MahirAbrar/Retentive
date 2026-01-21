import { topicsService } from '../services/topicsFixed'
import type { Topic, LearningItem } from '../types/database'

export interface ExportData {
  version: string
  exportDate: string
  topics: Topic[]
  learningItems: LearningItem[]
}

export async function exportUserData(userId: string): Promise<ExportData> {
  // Get all topics
  const { data: topics, error: topicsError } = await topicsService.getTopics(userId)
  if (topicsError) throw new Error('Failed to load topics for export')

  // Get all learning items for each topic
  const allLearningItems: LearningItem[] = []
  
  for (const topic of topics || []) {
    const { data: items, error: itemsError } = await topicsService.getTopicItems(topic.id)
    if (itemsError) throw new Error(`Failed to load items for topic ${topic.name}`)
    allLearningItems.push(...(items || []))
  }

  const exportData: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    topics: topics || [],
    learningItems: allLearningItems
  }

  return exportData
}

export function downloadJSON(data: ExportData, filename: string = 'retentive-export.json') {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function validateImportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') return false
  if (!data.version || typeof data.version !== 'string') return false
  if (!data.exportDate || typeof data.exportDate !== 'string') return false
  if (!Array.isArray(data.topics)) return false
  if (!Array.isArray(data.learningItems)) return false
  
  // Validate topics structure
  for (const topic of data.topics) {
    if (!topic.id || !topic.name || !topic.user_id || !topic.learning_mode) {
      return false
    }
  }
  
  // Validate learning items structure
  for (const item of data.learningItems) {
    if (!item.id || !item.topic_id || !item.content || typeof item.review_count !== 'number') {
      return false
    }
  }
  
  return true
}