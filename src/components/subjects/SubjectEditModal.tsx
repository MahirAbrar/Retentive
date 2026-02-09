import React, { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Modal, Input, ConfirmDialog } from '../ui'
import { subjectService } from '../../services/subjectService'
import type { Subject } from '../../types/database'
import { getIconComponent, getAvailableIcons } from '../../utils/icons'

interface SubjectEditModalProps {
  subject: Subject | null
  isOpen: boolean
  onClose: () => void
  onSave: (subject: Subject) => void
  onDelete: (subjectId: string) => void
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

export function SubjectEditModal({ subject, isOpen, onClose, onSave, onDelete }: SubjectEditModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('folder')
  const [color, setColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (subject) {
      setName(subject.name)
      setDescription(subject.description || '')
      setIcon(subject.icon)
      setColor(subject.color)
    }
  }, [subject])

  const handleSave = async () => {
    if (!subject || !name.trim() || saving) return

    setSaving(true)
    const { data, error } = await subjectService.updateSubject(subject.id, {
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
    })

    if (data && !error) {
      onSave(data)
      onClose()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!subject) return

    const { error } = await subjectService.deleteSubject(subject.id)
    if (!error) {
      onDelete(subject.id)
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  const availableIcons = getAvailableIcons()
  const SelectedIcon = getIconComponent(icon)

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Subject">
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <Input
            label="Subject Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mathematics"
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              marginTop: '0.5rem',
            }}
          >
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ color: 'var(--color-error)' }}
            >
              <Trash2 size={16} /> Delete
            </Button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!name.trim() || saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${subject?.name}"? Topics in this subject will become unassigned.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  )
}
