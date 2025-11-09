import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Trash2, Plus } from 'lucide-react'
import { quickRemindersService } from '../../services/quickRemindersService'
import { useAuth } from '../../hooks/useAuthFixed'
import { useToast } from '../ui'
import type { QuickReminder } from '../../types/database'
import { logger } from '../../utils/logger'

interface QuickRemindersPopupProps {
  isOpen: boolean
  onClose: () => void
  onCountChange?: (count: number) => void
}

export function QuickRemindersPopup({ isOpen, onClose, onCountChange }: QuickRemindersPopupProps) {
  const [reminders, setReminders] = useState<QuickReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [newReminderContent, setNewReminderContent] = useState('')
  const [addingReminder, setAddingReminder] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load reminders
  const loadReminders = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await quickRemindersService.getReminders(user.id)
      if (error) {
        logger.error('Error loading reminders:', error)
        addToast('error', 'Failed to load reminders')
      } else {
        setReminders(data || [])
        onCountChange?.(data?.length || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [user, addToast, onCountChange])

  // Load reminders when popup opens
  useEffect(() => {
    if (isOpen) {
      loadReminders()
    }
  }, [isOpen, loadReminders])

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleAddReminder = async () => {
    if (!user || !newReminderContent.trim() || addingReminder) return

    setAddingReminder(true)
    try {
      const { data, error } = await quickRemindersService.addReminder(
        user.id,
        newReminderContent
      )

      if (error) {
        addToast('error', 'Failed to add reminder')
      } else if (data) {
        // Optimistic update
        setReminders((prev) => [data, ...prev])
        onCountChange?.(reminders.length + 1)
        setNewReminderContent('')
        inputRef.current?.focus()
      }
    } finally {
      setAddingReminder(false)
    }
  }

  const handleDeleteReminder = async (reminderId: string) => {
    if (!user) return

    // Optimistic update
    const prevReminders = reminders
    setReminders((prev) => prev.filter((r) => r.id !== reminderId))
    onCountChange?.(reminders.length - 1)

    const { error } = await quickRemindersService.deleteReminder(reminderId)

    if (error) {
      // Revert on error
      setReminders(prevReminders)
      onCountChange?.(prevReminders.length)
      addToast('error', 'Failed to delete reminder')
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleAddReminder()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: 0,
        width: '360px',
        maxHeight: '500px',
        backgroundColor: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 className="h5" style={{ margin: 0 }}>
          Quick Reminders
        </h3>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-secondary)',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Add new reminder */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type reminder..."
            value={newReminderContent}
            onChange={(e) => setNewReminderContent(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={addingReminder}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={handleAddReminder}
            disabled={!newReminderContent.trim() || addingReminder}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: newReminderContent.trim()
                ? 'var(--color-primary)'
                : 'var(--color-gray-200)',
              color: newReminderContent.trim() ? 'white' : 'var(--color-text-secondary)',
              cursor: newReminderContent.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Reminders list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
          maxHeight: '350px',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p className="body-small">Loading...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p className="body-small">No reminders yet</p>
            <p className="caption" style={{ marginTop: '0.5rem' }}>
              Add one above to get started
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-gray-50)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gray-100)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'
                }}
              >
                <p
                  className="body-small"
                  style={{
                    flex: 1,
                    margin: 0,
                    wordBreak: 'break-word',
                    lineHeight: '1.4',
                  }}
                >
                  {reminder.content}
                </p>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                  aria-label="Delete reminder"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
