import type { Subject } from './database'

export interface SubjectWithStats extends Subject {
  topicCount: number
  itemCount: number
  dueCount: number
  newCount: number
  masteredCount: number
}

export interface SubjectSuggestion {
  name: string
  icon: string
  color: string
  description: string
}
