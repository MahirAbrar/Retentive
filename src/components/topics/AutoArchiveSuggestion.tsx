import { useState, useEffect } from 'react'
import { Button } from '../ui'

interface AutoArchiveSuggestionProps {
  topicId: string
  topicName: string
  onArchive: () => void
  onDismiss: () => void
}

export function AutoArchiveSuggestion({ topicName, onArchive, onDismiss }: AutoArchiveSuggestionProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-hide after 10 seconds if not interacted with
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'var(--color-success-light)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '0.5rem',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p className="body" style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
            🎉 Congratulations! All items mastered in "{topicName}"
          </p>
          <p className="body-small text-secondary">
            Would you like to archive this topic to keep your list clean?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              onArchive()
              setIsVisible(false)
            }}
          >
            Archive Topic
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              onDismiss()
              setIsVisible(false)
            }}
          >
            Keep Active
          </Button>
        </div>
      </div>
    </div>
  )
}