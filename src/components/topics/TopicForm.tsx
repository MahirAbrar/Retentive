import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '@/components/ui'
import { dataService } from '@/services/dataService'
import { useUser } from '@/hooks/useAuth'
import { validateTopicName, parseSubtopics } from '@/utils/validation'
import { LEARNING_MODES } from '@/constants/learning'
import type { LearningMode } from '@/types/database'
import styles from './TopicForm.module.css'

export function TopicForm() {
  const [name, setName] = useState('')
  const [learningMode, setLearningMode] = useState<LearningMode>('steady')
  const [subtopics, setSubtopics] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const user = useUser()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!validateTopicName(name)) {
      newErrors.name = 'Topic name must be between 1 and 100 characters'
    }

    const parsedSubtopics = parseSubtopics(subtopics)
    if (parsedSubtopics.length === 0) {
      newErrors.subtopics = 'Please add at least one subtopic'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      // Create topic
      const { data: topic, error: topicError } = await dataService.createTopic({
        user_id: user.id,
        name,
        learning_mode: learningMode,
      })

      if (topicError || !topic) {
        throw topicError || new Error('Failed to create topic')
      }

      // Create subtopics
      const parsedSubtopics = parseSubtopics(subtopics)
      const subtopicItems = parsedSubtopics.map(content => ({
        topic_id: topic.id,
        user_id: user.id,
        content,
        learning_mode: learningMode,
        last_reviewed_at: null,
        next_review_at: null,
      }))

      const { error: itemsError } = await dataService.createLearningItems(subtopicItems)

      if (itemsError) {
        throw itemsError
      }

      addToast('success', `Topic "${name}" created with ${parsedSubtopics.length} items!`)
      navigate(`/topics/${topic.id}`)
    } catch (error) {
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create topic' 
      })
      addToast('error', 'Failed to create topic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="bordered">
      <CardHeader>
        <h2 className="h3">Create New Topic</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Topic Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="e.g., JavaScript Fundamentals"
            required
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Learning Mode</label>
            <div className={styles.radioGroup}>
              {Object.entries(LEARNING_MODES).map(([mode, config]) => (
                <label key={mode} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="learningMode"
                    value={mode}
                    checked={learningMode === mode}
                    onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                    className={styles.radioInput}
                  />
                  <div>
                    <p className="body font-medium">{config.label}</p>
                    <p className="body-small text-secondary">{config.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="subtopics" className={styles.label}>
              Subtopics (one per line)
            </label>
            <textarea
              id="subtopics"
              value={subtopics}
              onChange={(e) => setSubtopics(e.target.value)}
              placeholder="Variables and data types&#10;Functions and scope&#10;Arrays and objects&#10;Promises and async/await"
              rows={8}
              className={styles.textarea}
            />
            {errors.subtopics && (
              <span className={styles.errorText}>{errors.subtopics}</span>
            )}
            <p className="caption text-secondary">
              Each line will become a separate learning item
            </p>
          </div>

          {errors.general && (
            <p className={styles.errorText}>{errors.general}</p>
          )}

          <div className={styles.actions}>
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
  )
}