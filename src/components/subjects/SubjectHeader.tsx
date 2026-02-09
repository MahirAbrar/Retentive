import React from 'react'
import { ChevronDown, ChevronRight, Edit2 } from 'lucide-react'
import { Button } from '../ui'
import type { SubjectWithStats } from '../../types/subject'
import { getIconComponent } from '../../utils/icons'

interface SubjectHeaderProps {
  subject: SubjectWithStats
  isCollapsed: boolean
  onToggle: () => void
  onEdit: () => void
}

export function SubjectHeader({ subject, isCollapsed, onToggle, onEdit }: SubjectHeaderProps) {
  const Icon = getIconComponent(subject.icon)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        marginBottom: isCollapsed ? '0' : '1rem',
      }}
    >
      <button
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.25rem',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem',
          backgroundColor: subject.color + '20',
          color: subject.color,
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <Icon size={20} />
      </div>

      <div style={{ flex: 1 }}>
        <h3 className="h4" style={{ margin: 0 }}>
          {subject.name}
        </h3>
        <p className="body-small text-secondary" style={{ margin: 0 }}>
          {subject.topicCount} topic{subject.topicCount !== 1 ? 's' : ''} · {subject.itemCount} item
          {subject.itemCount !== 1 ? 's' : ''}
          {subject.dueCount > 0 && (
            <span style={{ color: 'var(--color-warning)', marginLeft: '0.5rem' }}>
              · {subject.dueCount} due
            </span>
          )}
        </p>
      </div>

      <Button
        variant="ghost"
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        aria-label="Edit subject"
        style={{ padding: '0.5rem' }}
      >
        <Edit2 size={16} />
      </Button>
    </div>
  )
}
