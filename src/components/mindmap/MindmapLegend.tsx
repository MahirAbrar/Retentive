/**
 * MindmapLegend Component
 * Shows mastery level legend for the mindmap visualization
 */

import { memo } from 'react'

export const MindmapLegend = memo(function MindmapLegend() {
  const levels = [
    { label: '0%', opacity: 0.2, width: 1, dashed: true },
    { label: '30%', opacity: 0.44, width: 1.9, dashed: false },
    { label: '60%', opacity: 0.68, width: 2.8, dashed: false },
    { label: '100%', opacity: 1, width: 4, dashed: false, glow: true }
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        marginTop: '1rem'
      }}
    >
      <span
        className="body-small"
        style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}
      >
        Mastery:
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {levels.map((level, index) => (
          <div
            key={index}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {/* Line sample */}
            <svg width="30" height="12" style={{ display: 'block' }}>
              <line
                x1="0"
                y1="6"
                x2="30"
                y2="6"
                stroke="var(--color-primary)"
                strokeWidth={level.width}
                strokeOpacity={level.opacity}
                strokeDasharray={level.dashed ? '4,4' : 'none'}
                strokeLinecap="round"
                style={{
                  filter: level.glow
                    ? 'drop-shadow(0 0 4px var(--color-primary))'
                    : 'none'
                }}
              />
            </svg>
            <span
              className="caption"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {level.label}
            </span>
          </div>
        ))}
      </div>

      {/* Node glow indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginLeft: '0.5rem',
          paddingLeft: '1rem',
          borderLeft: '1px solid var(--color-border)'
        }}
      >
        <svg width="20" height="20" style={{ display: 'block' }}>
          <defs>
            <filter id="legend-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="10"
            cy="10"
            r="6"
            fill="var(--color-primary)"
            fillOpacity="0.4"
            stroke="var(--color-primary)"
            strokeWidth="2"
            filter="url(#legend-glow)"
          />
        </svg>
        <span
          className="caption"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          80%+ glow
        </span>
      </div>
    </div>
  )
})
