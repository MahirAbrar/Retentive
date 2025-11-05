import { X } from 'lucide-react'
import { getBreakCategory, type BreakActivity } from '../../services/breakActivities'

interface BreakActivityModalProps {
  isOpen: boolean
  categoryId: string | null
  onSelectActivity: (activity: BreakActivity) => void
  onClose: () => void
}

export function BreakActivityModal({
  isOpen,
  categoryId,
  onSelectActivity,
  onClose,
}: BreakActivityModalProps) {
  if (!isOpen || !categoryId) return null

  const category = getBreakCategory(categoryId)
  if (!category) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 className="h4" style={{ marginBottom: '0.25rem' }}>
              {category.emoji} {category.title}
            </h3>
            <p className="body-small text-secondary" style={{ margin: 0 }}>
              {category.description}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-text-secondary)',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Activity List */}
        <div
          style={{
            padding: '1rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {category.activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => {
                  onSelectActivity(activity)
                  onClose()
                }}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  backgroundColor: 'var(--color-background)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {activity.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '0.25rem',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="body" style={{ fontWeight: '600' }}>
                      {activity.name}
                    </span>
                    <span
                      className="caption"
                      style={{
                        color: 'var(--color-text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {activity.durationMinutes} min
                    </span>
                  </div>
                  <p
                    className="body-small text-secondary"
                    style={{ margin: 0 }}
                  >
                    {activity.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
