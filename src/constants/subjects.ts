import type { SubjectSuggestion } from '../types/subject'

export const SUBJECT_SUGGESTIONS: SubjectSuggestion[] = [
  {
    name: 'Mathematics',
    icon: 'calculator',
    color: '#ef4444',
    description: 'Math, algebra, calculus, statistics',
  },
  {
    name: 'Science',
    icon: 'flask',
    color: '#22c55e',
    description: 'Physics, chemistry, biology',
  },
  {
    name: 'Language',
    icon: 'languages',
    color: '#3b82f6',
    description: 'Vocabulary, grammar, languages',
  },
  {
    name: 'History',
    icon: 'landmark',
    color: '#f59e0b',
    description: 'History, geography, culture',
  },
  {
    name: 'Technology',
    icon: 'laptop',
    color: '#8b5cf6',
    description: 'Programming, IT, engineering',
  },
  {
    name: 'Arts',
    icon: 'palette',
    color: '#ec4899',
    description: 'Art, music, literature',
  },
  {
    name: 'Business',
    icon: 'briefcase',
    color: '#06b6d4',
    description: 'Economics, finance, management',
  },
  {
    name: 'Health',
    icon: 'heart-pulse',
    color: '#10b981',
    description: 'Medicine, wellness, nutrition',
  },
]

export const DEFAULT_SUBJECT_ICON = 'folder'
export const DEFAULT_SUBJECT_COLOR = '#6366f1'
