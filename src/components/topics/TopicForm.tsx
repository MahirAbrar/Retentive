import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, CardHeader, CardContent, useToast } from '@/components/ui'
import { dataService } from '@/services/dataService'
import { useUser } from '@/hooks/useAuth'
import { validateTopicName, parseItems } from '@/utils/validation'
import { LEARNING_MODES } from '@/constants/learning'
import type { LearningMode } from '@/types/database'
import styles from './TopicForm.module.css'

export function TopicForm() {
  const [name, setName] = useState('')
  const [learningMode, setLearningMode] = useState<LearningMode>('steady')
  const [items, setItems] = useState('')
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

    const parsedItems = parseItems(items)
    if (parsedItems.length === 0) {
      newErrors.items = 'Please add at least one item'
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

      // Create items
      const parsedItems = parseItems(items)
      const newItems = parsedItems.map(content => ({
        topic_id: topic.id,
        user_id: user.id,
        content,
        learning_mode: learningMode,
        last_reviewed_at: null,
        next_review_at: null,
      }))

      const { error: itemsError } = await dataService.createLearningItems(newItems)

      if (itemsError) {
        throw itemsError
      }

      addToast('success', `Topic "${name}" created with ${parsedItems.length} items!`)
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
            <label htmlFor="items" className={styles.label}>
              Items (one per line)
            </label>
            <textarea
              id="items"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="Variables and data types&#10;Functions and scope&#10;Arrays and objects&#10;Promises and async/await"
              rows={8}
              className={styles.textarea}
            />
            {errors.items && (
              <span className={styles.errorText}>{errors.items}</span>
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