// Data export/import types

import type { Topic, LearningItem } from './database'

export interface ExportData {
  version: string
  exportDate: string
  topics: Topic[]
  learningItems: LearningItem[]
}

export interface ImportResult {
  success: boolean
  topicsImported: number
  itemsImported: number
  errors: string[]
}
