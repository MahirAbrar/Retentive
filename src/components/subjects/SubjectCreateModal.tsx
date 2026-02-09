import { useState } from 'react'
import { Button, Modal, Input } from '../ui'
import { subjectService } from '../../services/subjectService'
import { SubjectSuggestions } from './SubjectSuggestions'
import { getIconComponent, getAvailableIcons } from '../../utils/icons'
import type { Subject } from '../../types/database'

interface SubjectCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (subject: Subject) => void
  userId: string
}

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#6366f1', // indigo
  '#64748b', // slate
]

export function SubjectCreateModal({ isOpen, onClose, onSave, userId }: SubjectCreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('folder')
  const [color, setColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSuggestionSelect = (suggestion: { name: string; icon: string; color: string }) => {
    setName(suggestion.name)
    setIcon(suggestion.icon)
    setColor(suggestion.color)
  }

  const handleSave = async () => {
    if (!name.trim() || saving) return

    setSaving(true)
    setError('')

    const { data, error: saveError } = await subjectService.createSubject({
      user_id: userId,
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
    })

    if (data && !saveError) {
      onSave(data)
      // Reset form
      setName('')
      setDescription('')
      setIcon('folder')
      setColor('#6366f1')
    } else {
      setError(saveError?.message || 'Failed to create subject')
    }
    setSaving(false)
  }

  const availableIcons = getAvailableIcons()
  const SelectedIcon = getIconComponent(icon)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Subject">
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Quick suggestions */}
        {!name && (
          <div>
            <p className="body-small text-secondary" style={{ marginBottom: '0.5rem' }}>
              Quick start with a suggestion:
            </p>
            <SubjectSuggestions onSelect={handleSuggestionSelect} />
          </div>
        )}

        <Input
          label="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Mathematics"
          error={error}
        />

        <Input
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Algebra, calculus, statistics"
        />

        <div>
          <label className="body" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Icon
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '0.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {availableIcons.map(({ name: iconName, icon: IconComponent }) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: icon === iconName ? color + '20' : 'transparent',
                  border: icon === iconName ? `2px solid ${color}` : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: icon === iconName ? color : 'var(--color-text-secondary)',
                }}
                title={iconName}
              >
                <IconComponent size={18} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="body" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map((colorOption) => (
              <button
                key={colorOption}
                type="button"
                onClick={() => setColor(colorOption)}
                style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: colorOption,
                  border: color === colorOption ? '3px solid var(--color-text)' : '2px solid transparent',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  outline: color === colorOption ? '2px solid var(--color-surface)' : 'none',
                  outlineOffset: '-4px',
                }}
                title={colorOption}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: color + '10',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${color}30`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: color + '20',
              color: color,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <SelectedIcon size={20} />
          </div>
          <div>
            <p className="body" style={{ fontWeight: 500, margin: 0 }}>
              {name || 'Subject Name'}
            </p>
            <p className="body-small text-secondary" style={{ margin: 0 }}>
              Preview
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Creating...' : 'Create Subject'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
