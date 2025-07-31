import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import { LEARNING_MODES, PRIORITY_LABELS } from '../constants/learning'
import type { LearningMode } from '../types/database'

export function NewTopicPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [topicName, setTopicName] = useState('')
  const [learningMode, setLearningMode] = useState<LearningMode>('steady')
  const [priority, setPriority] = useState(5)
  const [subtopics, setSubtopics] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!topicName.trim()) {
      newErrors.name = 'Topic name is required'
    }
    
    if (!subtopics.trim()) {
      newErrors.subtopics = 'At least one subtopic is required'
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
        name: topicName.trim(),
        learning_mode: learningMode,
        priority: priority
      })
      
      if (topicError || !topic) {
        throw new Error('Failed to create topic')
      }
      
      // Parse subtopics and create learning items
      const subtopicLines = subtopics
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      const learningItems = subtopicLines.map(content => ({
        topic_id: topic.id,
        user_id: user.id,
        content,
        priority: priority,
        learning_mode: learningMode,
        review_count: 0,
        last_reviewed_at: null,
        next_review_at: new Date().toISOString(), // Set to now so items are immediately due
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
      
      navigate('/topics')
    } catch (error) {
      addToast('error', 'Failed to create topic')
      console.error('Error creating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">Create New Topic</h1>
        <p className="body text-secondary">
          Add a topic and its subtopics to start learning
        </p>
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                {Object.entries(LEARNING_MODES).map(([mode, config]) => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="learningMode"
                      value={mode}
                      checked={learningMode === mode}
                      onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                    />
                    <div>
                      <span className="body">{config.label}</span>
                      <p className="body-small text-secondary">{config.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Priority: {priority} - {PRIORITY_LABELS[priority]}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span className="body-small text-secondary">Low</span>
                <span className="body-small text-secondary">Medium</span>
                <span className="body-small text-secondary">High</span>
              </div>
            </div>

            <div>
              <label htmlFor="subtopics" className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Subtopics (one per line)
              </label>
              <textarea
                id="subtopics"
                value={subtopics}
                onChange={(e) => setSubtopics(e.target.value)}
                placeholder="Enter each subtopic on a new line&#10;e.g.:&#10;Hola - Hello&#10;Buenos días - Good morning&#10;Gracias - Thank you"
                rows={8}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: `1px solid ${errors.subtopics ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  resize: 'vertical'
                }}
              />
              {errors.subtopics && (
                <p className="body-small text-error" style={{ marginTop: '0.25rem' }}>
                  {errors.subtopics}
                </p>
              )}
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