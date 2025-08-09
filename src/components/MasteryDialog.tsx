import { useState } from 'react'
import { Modal, Button, Card, CardContent } from './ui'
import type { LearningMode, MasteryStatus } from '../types/database'

interface MasteryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (status: MasteryStatus) => void
  itemContent: string
  learningMode: LearningMode
  currentInterval: number
}

export function MasteryDialog({
  isOpen,
  onClose,
  onSelect,
  itemContent,
  learningMode,
  currentInterval
}: MasteryDialogProps) {
  const [hoveredOption, setHoveredOption] = useState<MasteryStatus | null>(null)

  // Calculate maintenance interval based on learning mode
  const getMaintenanceInterval = () => {
    const baseInterval = currentInterval * 2
    
    switch (learningMode) {
      case 'ultracram':
        return Math.min(baseInterval, 60) // Cap at 60 days
      case 'cram':
        return Math.min(baseInterval, 90) // Cap at 90 days
      case 'extended':
        return Math.min(baseInterval, 180) // Cap at 180 days
      case 'steady':
        return Math.min(baseInterval, 365) // Cap at 1 year
      default:
        return baseInterval
    }
  }

  const maintenanceInterval = getMaintenanceInterval()

  const handleSelect = (status: MasteryStatus) => {
    onSelect(status)
    onClose()
  }

  const options = [
    {
      status: 'archived' as MasteryStatus,
      icon: '📦',
      title: 'Archive',
      description: 'No more reviews. Perfect for completed exams or temporary knowledge.',
      action: 'Never review again',
      color: 'var(--color-gray-600)'
    },
    {
      status: 'maintenance' as MasteryStatus,
      icon: '🔄',
      title: 'Maintain',
      description: 'Keep it fresh with occasional reviews at extended intervals.',
      action: `Review in ${maintenanceInterval} days`,
      color: 'var(--color-info)'
    },
    {
      status: 'repeat' as MasteryStatus,
      icon: '🔁',
      title: 'Repeat',
      description: 'Start from the beginning. Great for refreshing important knowledge.',
      action: 'Reset and start over',
      color: 'var(--color-warning)'
    }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎉 Mastered!"
      size="large"
    >
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="body-large" style={{ marginBottom: '0.5rem' }}>
            Congratulations! You've successfully reviewed this item 5 times.
          </p>
          <p className="body text-secondary" style={{ 
            padding: '0.75rem',
            backgroundColor: 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)',
            fontStyle: 'italic'
          }}>
            "{itemContent.substring(0, 100)}{itemContent.length > 100 ? '...' : ''}"
          </p>
        </div>

        <div>
          <h3 className="h4" style={{ marginBottom: '1rem' }}>
            What would you like to do next?
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {options.map((option) => (
              <Card
                key={option.status}
                variant={hoveredOption === option.status ? 'elevated' : 'bordered'}
                onClick={() => handleSelect(option.status)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: hoveredOption === option.status 
                    ? `2px solid ${option.color}` 
                    : '2px solid transparent'
                }}
                onMouseEnter={() => setHoveredOption(option.status)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <CardContent>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '2rem' }}>{option.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h4 className="body" style={{ 
                        fontWeight: '600', 
                        marginBottom: '0.25rem',
                        color: option.color 
                      }}>
                        {option.title}
                      </h4>
                      <p className="body-small text-secondary" style={{ marginBottom: '0.5rem' }}>
                        {option.description}
                      </p>
                      <p className="body-small" style={{ 
                        fontWeight: '500',
                        color: option.color
                      }}>
                        → {option.action}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-gray-200)'
        }}>
          <Button
            variant="ghost"
            onClick={() => {
              onSelect('mastered')
              onClose()
            }}
          >
            Decide Later
          </Button>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="body-small text-secondary">
              You can change this anytime
            </span>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}