import { logger } from '../utils/logger'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import { LEARNING_MODES } from '../constants/learning'
import type { LearningMode } from '../types/database'
import { sanitizeInput } from '../utils/sanitize'
import { useAutoSave } from '../hooks/useAutoSave'
import { cacheService } from '../services/cacheService'
import { Clock, Layers, BookOpen } from 'lucide-react'

// Guidance for each learning mode
const MODE_GUIDANCE: Record<LearningMode, {
  intervals: string
  sessionLength: string
  contentLength: string
  example: string
}> = {
  ultracram: {
    intervals: '30s → 2h → 1d → 3d',
    sessionLength: '15-20 min, then break',
    contentLength: '~50-75 words',
    example: 'ATP definition: page 42\nKrebs cycle: diagram 3.1\nMitosis phases: bullet points'
  },
  cram: {
    intervals: '2h → 1d → 3d → 7d',
    sessionLength: '25-30 min, then break',
    contentLength: '~50-75 words',
    example: 'REST API basics: section 2.1\nHTTP methods: notes p.15\nStatus codes: summary table'
  },
  steady: {
    intervals: '1d → 3d → 7d → 14d',
    sessionLength: '25-30 min, then break',
    contentLength: '~75-125 words',
    example: 'Growth Hormone: paragraphs 1-3\nPhotosynthesis: light reactions section\nReact Hooks: useEffect basics + examples'
  },
  extended: {
    intervals: '3d → 7d → 14d → 30d',
    sessionLength: '30-45 min, then break',
    contentLength: '~100-150 words',
    example: 'Compound interest: chapter 4, worked examples\nNeural networks: architecture + backprop notes\nDesign patterns: singleton with code samples'
  }
}

export function NewTopicPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [topicName, setTopicName] = useState('')
  const [learningMode, setLearningMode] = useState<LearningMode>('steady')
  const [items, setItems] = useState('')
  const [upcomingDate, setUpcomingDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-save draft to localStorage
  const formData = { topicName, learningMode, items, upcomingDate }
  const { isSaving, lastSaved } = useAutoSave(formData, {
    delay: 2000,
    onSave: async (data) => {
      localStorage.setItem('newTopicDraft', JSON.stringify(data))
    },
    enabled: !loading
  })
  
  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('newTopicDraft')
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        setTopicName(parsed.topicName || '')
        setLearningMode(parsed.learningMode || 'steady')
        setItems(parsed.items || parsed.subtopics || '')
        setUpcomingDate(parsed.upcomingDate || '')
      } catch (error) {
        logger.error('Failed to load draft:', error)
      }
    }
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!topicName.trim()) {
      newErrors.name = 'Topic name is required'
    }
    
    if (!items.trim()) {
      newErrors.items = 'At least one item is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !user) return
    
    setLoading(true)
    
    try {
      // Create the topic
      const { data: topic, error: topicError } = await topicsService.createTopic({
        user_id: user.id,
        name: sanitizeInput(topicName.trim()),
        learning_mode: learningMode
      })
      
      if (topicError || !topic) {
        logger.error('Database error:', topicError)
        throw new Error(topicError?.message || 'Failed to create topic')
      }
      
      // Parse items and create learning items
      const itemLines = items
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      // Determine the initial review date
      let nextReviewAt: string
      if (upcomingDate) {
        // User specified a future date
        const selectedDate = new Date(upcomingDate)
        selectedDate.setHours(9, 0, 0, 0) // Set to 9 AM on the selected date
        nextReviewAt = selectedDate.toISOString()
      } else {
        // Default to now
        nextReviewAt = new Date().toISOString()
      }
      
      const learningItems = itemLines.map(content => ({
        topic_id: topic.id,
        user_id: user.id,
        content: sanitizeInput(content),
        learning_mode: learningMode,
        review_count: 0,
        last_reviewed_at: null,
        next_review_at: nextReviewAt,
        ease_factor: 2.5,
        interval_days: 0
      }))
      
      const { error: itemsError } = await topicsService.createLearningItems(learningItems)
      
      if (itemsError) {
        // If items fail, we should ideally delete the topic, but for now just warn
        addToast('warning', 'Topic created but some items failed to save')
      } else {
        addToast('success', `Created topic "${topicName}" with ${learningItems.length} items`)
      }
      
      // Clear draft after successful submission
      localStorage.removeItem('newTopicDraft')
      
      // Invalidate topics cache so the new topic shows immediately
      cacheService.delete(`topics:${user.id}`)
      
      navigate('/topics')
    } catch (error) {
      addToast('error', 'Failed to create topic')
      logger.error('Error creating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="h2">Create New Topic</h1>
            <p className="body text-secondary">
              Add a topic and its items to start learning
            </p>
          </div>
          {lastSaved && (
            <p className="body-small text-secondary animate-fade-in">
              {isSaving ? 'Saving...' : `Draft saved ${new Date(lastSaved).toLocaleTimeString()}`}
            </p>
          )}
        </div>
      </header>

      <Card variant="bordered">
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Input
              label="Topic Name"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              error={errors.name}
              placeholder="e.g., Spanish Vocabulary, Physics Formulas"
              required
            />

            <div>
              <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Learning Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(LEARNING_MODES).map(([mode, config]) => (
                  <label
                    key={mode}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: `2px solid ${learningMode === mode ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: learningMode === mode ? 'var(--color-primary-light)' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="learningMode"
                      value={mode}
                      checked={learningMode === mode}
                      onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div>
                      <span className="body" style={{ fontWeight: learningMode === mode ? '600' : '400' }}>{config.label}</span>
                      <p className="body-small text-secondary">{config.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Mode Guidance Panel */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-200)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Clock size={16} color="var(--color-text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <p className="caption text-secondary">Review schedule</p>
                      <p className="body-small" style={{ fontWeight: '500' }}>{MODE_GUIDANCE[learningMode].intervals}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Layers size={16} color="var(--color-text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <p className="caption text-secondary">Session length</p>
                      <p className="body-small" style={{ fontWeight: '500' }}>{MODE_GUIDANCE[learningMode].sessionLength}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <BookOpen size={16} color="var(--color-text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <p className="caption text-secondary">Content per item</p>
                      <p className="body-small" style={{ fontWeight: '500' }}>{MODE_GUIDANCE[learningMode].contentLength}</p>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--color-gray-300)'
                }}>
                  <p className="body-small" style={{ marginBottom: '0.5rem' }}>
                    Each item = a chunk of your notes ({MODE_GUIDANCE[learningMode].contentLength})
                  </p>
                  <pre className="body-small" style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    color: 'var(--color-text-secondary)'
                  }}>{MODE_GUIDANCE[learningMode].example}</pre>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="items" className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Items (one per line)
              </label>
              <textarea
                id="items"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder="Enter each item on a new line&#10;e.g.:&#10;Hola - Hello&#10;Buenos días - Good morning&#10;Gracias - Thank you"
                rows={8}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: `1px solid ${errors.items ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  resize: 'vertical'
                }}
              />
              {errors.items && (
                <p className="body-small text-error" style={{ marginTop: '0.25rem' }}>
                  {errors.items}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="upcomingDate" className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Start Date (Optional)
              </label>
              <input
                type="date"
                id="upcomingDate"
                value={upcomingDate}
                onChange={(e) => setUpcomingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-gray-300)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit'
                }}
              />
              <p className="body-small text-secondary" style={{ marginTop: '0.25rem' }}>
                Leave empty to start learning immediately, or set a future date to schedule items
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/topics')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
              >
                Create Topic
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}