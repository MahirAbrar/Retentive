import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, Modal, Input } from '../ui'
import { subjectService } from '../../services/subjectService'
import { SubjectSuggestions } from './SubjectSuggestions'
import type { Subject } from '../../types/database'
import { DEFAULT_SUBJECT_COLOR, DEFAULT_SUBJECT_ICON } from '../../constants/subjects'
import { getIconComponent } from '../../utils/icons'

interface SubjectSelectorProps {
  userId: string
  selectedSubjectId: string | null
  onSelect: (subjectId: string | null) => void
  showSuggestions?: boolean
}

export function SubjectSelector({
  userId,
  selectedSubjectId,
  onSelect,
  showSuggestions = false,
}: SubjectSelectorProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectIcon, setNewSubjectIcon] = useState(DEFAULT_SUBJECT_ICON)
  const [newSubjectColor, setNewSubjectColor] = useState(DEFAULT_SUBJECT_COLOR)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [userId])

  const loadSubjects = async () => {
    const { data } = await subjectService.getSubjects(userId)
    setSubjects(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newSubjectName.trim() || creating) return

    setCreating(true)
    const { data, error } = await subjectService.createSubject({
      user_id: userId,
      name: newSubjectName.trim(),
      icon: newSubjectIcon,
      color: newSubjectColor,
    })

    if (data && !error) {
      setSubjects([...subjects, data])
      onSelect(data.id)
      setShowCreateModal(false)
      setNewSubjectName('')
      setNewSubjectIcon(DEFAULT_SUBJECT_ICON)
      setNewSubjectColor(DEFAULT_SUBJECT_COLOR)
    }
    setCreating(false)
  }

  const handleSuggestionSelect = async (suggestion: { name: string; icon: string; color: string }) => {
    setCreating(true)
    const { data, error } = await subjectService.createSubject({
      user_id: userId,
      name: suggestion.name,
      icon: suggestion.icon,
      color: suggestion.color,
    })

    if (data && !error) {
      setSubjects([...subjects, data])
      onSelect(data.id)
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="body-small text-secondary">Loading subjects...</p>
      </div>
    )
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId)
  const SelectedIcon = selectedSubject ? getIconComponent(selectedSubject.icon) : null

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label className="body" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
        Subject (Optional)
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          {selectedSubject && SelectedIcon && (
            <div
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: selectedSubject.color,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SelectedIcon size={16} />
            </div>
          )}
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => onSelect(e.target.value || null)}
            style={{
              width: '100%',
              padding: '0.75rem',
              paddingLeft: selectedSubject ? '2.5rem' : '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface)',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
            }}
          >
            <option value="">No subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => setShowCreateModal(true)}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={14} /> New
        </Button>
      </div>

      {showSuggestions && subjects.length === 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p className="body-small text-secondary" style={{ marginBottom: '0.75rem' }}>
            Quick start with a suggested subject:
          </p>
          <SubjectSuggestions onSelect={handleSuggestionSelect} disabled={creating} />
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Subject">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Input
            label="Subject Name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="e.g., Computer Science"
            autoFocus
          />

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newSubjectName.trim() || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
