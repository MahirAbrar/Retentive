import React, { memo, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardContent, Button, Badge } from '../ui'
import type { Topic } from '../../types/database'
import { LEARNING_MODES, PRIORITY_LABELS } from '../../constants/learning'

interface TopicCardProps {
  topic: Topic
  stats: { total: number; due: number; new: number }
  isExpanded: boolean
  onToggleExpand: (topicId: string) => void
  onOpenMenu: (topicId: string) => void
  isMenuOpen: boolean
  onEdit: (topic: Topic) => void
  onDelete?: (topicId: string, topicName: string) => void
  children?: React.ReactNode
}

export const TopicCard = memo(function TopicCard({
  topic,
  stats,
  isExpanded,
  onToggleExpand,
  onOpenMenu,
  isMenuOpen,
  onEdit,
  onDelete,
  children
}: TopicCardProps) {
  const handleToggle = useCallback(() => {
    onToggleExpand(topic.id)
  }, [onToggleExpand, topic.id])

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenMenu(topic.id)
  }, [onOpenMenu, topic.id])

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(topic)
    onOpenMenu('')
  }, [onEdit, topic, onOpenMenu])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(topic.id, topic.name)
    }
    onOpenMenu('')
  }, [onDelete, topic.id, topic.name, onOpenMenu])

  // Memoize badge styles
  const modeBadgeVariant = useMemo(() => 
    topic.learning_mode === 'cram' ? 'warning' : 'info',
    [topic.learning_mode]
  )

  return (
    <Card 
      variant="bordered"
      style={{ 
        animationDelay: `${0.05}s`,
      }}
      className="animate-fade-in"
    >
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h4">{topic.name}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Badge variant={modeBadgeVariant}>
              {LEARNING_MODES[topic.learning_mode].label}
            </Badge>
            <Badge variant="ghost">
              {PRIORITY_LABELS[topic.priority]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <p className="body-small text-secondary">Items</p>
              <p className="body">{stats.total}</p>
            </div>
            <div>
              <p className="body-small text-secondary">New</p>
              <p className="body" style={{ color: stats.new > 0 ? 'var(--color-info)' : 'inherit' }}>{stats.new}</p>
            </div>
            <div>
              <p className="body-small text-secondary">Due</p>
              <p className="body" style={{ color: stats.due > 0 ? 'var(--color-warning)' : 'inherit' }}>{stats.due}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button 
              variant="primary" 
              size="small"
              onClick={handleToggle}
            >
              {isExpanded ? 'Collapse' : 'View Items'}
            </Button>
            <div style={{ position: 'relative' }}>
              <Button 
                variant="ghost" 
                size="small"
                onClick={handleMenuClick}
                style={{ padding: '0.25rem 0.5rem', fontSize: '1.2rem' }}
              >
                ⋮
              </Button>
              {isMenuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.25rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  zIndex: 10,
                  minWidth: '120px'
                }}>
                  <button
                    onClick={handleEditClick}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Edit
                  </button>
                  {onDelete && (
                    <button
                      onClick={handleDeleteClick}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-error)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {isExpanded && children}
      </CardContent>
    </Card>
  )
})