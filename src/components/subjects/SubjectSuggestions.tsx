import React from 'react'
import { SUBJECT_SUGGESTIONS } from '../../constants/subjects'
import { getIconComponent } from '../../utils/icons'

interface SubjectSuggestionsProps {
  onSelect: (suggestion: { name: string; icon: string; color: string }) => void
  disabled?: boolean
}

export function SubjectSuggestions({ onSelect, disabled = false }: SubjectSuggestionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      {SUBJECT_SUGGESTIONS.map((suggestion) => {
        const Icon = getIconComponent(suggestion.icon)
        return (
          <button
            key={suggestion.name}
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: suggestion.color + '15',
              color: suggestion.color,
              border: `1px solid ${suggestion.color}40`,
              borderRadius: 'var(--radius-full)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = suggestion.color + '25'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = suggestion.color + '15'
            }}
          >
            <Icon size={14} />
            {suggestion.name}
          </button>
        )
      })}
    </div>
  )
}
