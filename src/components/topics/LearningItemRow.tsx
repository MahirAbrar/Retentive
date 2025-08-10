import React, { memo, useCallback, useMemo, useState } from 'react'
import { Button, Input } from '../ui'
import type { LearningItem } from '../../types/database'
import { ReviewWindowIndicator } from '../gamification/ReviewWindowIndicator'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import { formatDuration, formatReviewDate, getOptimalReviewWindow } from '../../utils/timeFormat'

interface LearningItemRowProps {
  item: LearningItem
  isEditing: boolean
  editContent: string
  isProcessing: boolean
  onReview: (item: LearningItem) => void
  onEdit: (itemId: string, content: string) => void
  onSaveEdit: (item: LearningItem) => void
  onCancelEdit: () => void
  onDelete: (item: LearningItem) => void
  onEditContentChange: (content: string) => void
}

export const LearningItemRow = memo(function LearningItemRow({
  item,
  isEditing,
  editContent,
  isProcessing,
  onReview,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditContentChange
}: LearningItemRowProps) {
  const handleReviewClick = useCallback(() => {
    onReview(item)
  }, [onReview, item])

  const handleEditClick = useCallback(() => {
    onEdit(item.id, item.content)
  }, [onEdit, item.id, item.content])

  const handleSaveClick = useCallback(() => {
    onSaveEdit(item)
  }, [onSaveEdit, item])

  const handleDeleteClick = useCallback(() => {
    onDelete(item)
  }, [onDelete, item])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onEditContentChange(e.target.value)
  }, [onEditContentChange])

  // State for showing info tooltip
  const [showInfo, setShowInfo] = useState(false)

  // Memoize the next review display
  const nextReviewInfo = useMemo(() => {
    if (item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired) {
      return { 
        primary: '✓ Mastered',
        secondary: null,
        exact: null,
        isDue: false
      }
    }
    if (!item.next_review_at) return { primary: null, secondary: null, exact: null, isDue: false }
    
    const reviewDate = new Date(item.next_review_at)
    const now = new Date()
    const diffMs = reviewDate.getTime() - now.getTime()
    
    const isDue = diffMs <= 0
    const primary = isDue ? 'Due now' : `Due in ${formatDuration(diffMs)}`
    const exact = formatReviewDate(reviewDate)
    
    return { primary, secondary: null, exact, isDue }
  }, [item.review_count, item.next_review_at])

  const isMastered = item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired
  const showStudyButton = (nextReviewInfo.isDue || item.review_count === 0) && !isMastered

  return (
    <div style={{ 
      padding: '0.75rem',
      borderBottom: '1px solid var(--color-gray-100)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: isMastered ? 0.7 : 1
    }}>
      <div style={{ flex: 1, marginRight: '1rem' }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Input
              value={editContent}
              onChange={handleContentChange}
              style={{ flex: 1 }}
              autoFocus
            />
            <Button 
              variant="primary" 
              size="small"
              onClick={handleSaveClick}
            >
              Save
            </Button>
            <Button 
              variant="ghost" 
              size="small"
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div>
            <p className="body">{item.content}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', alignItems: 'center' }}>
              <span className="body-small text-secondary">
                Reviews: {item.review_count}
              </span>
              {nextReviewInfo.primary && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="body-small text-secondary" style={{ 
                    color: nextReviewInfo.isDue ? 'var(--color-warning)' : 'var(--color-text-secondary)' 
                  }}>
                    {nextReviewInfo.primary}
                  </span>
                  {nextReviewInfo.exact && (
                    <>
                      <span className="body-small text-secondary">•</span>
                      <span className="body-small text-secondary">
                        {nextReviewInfo.exact}
                      </span>
                    </>
                  )}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <button
                      onMouseEnter={() => setShowInfo(true)}
                      onMouseLeave={() => setShowInfo(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'help',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px'
                      }}
                    >
                      ⓘ
                    </button>
                    {showInfo && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 100,
                        minWidth: '250px',
                        fontSize: '12px'
                      }}>
                        <div style={{ marginBottom: '0.25rem', fontWeight: 'bold' }}>
                          Optimal Review Window ({item.learning_mode})
                        </div>
                        {(() => {
                          const window = getOptimalReviewWindow(item.learning_mode)
                          return (
                            <>
                              <div>🟢 Perfect: {window.perfect}</div>
                              <div>🟡 Early: {window.early}</div>
                              <div>🔴 Late: {window.late}</div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {item.review_count > 0 && item.next_review_at && (
                <ReviewWindowIndicator
                  item={item}
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', minWidth: '200px', justifyContent: 'flex-end' }}>
        {!isEditing && (
          <>
            {showStudyButton ? (
              <Button 
                variant="primary" 
                size="small"
                onClick={handleReviewClick}
                loading={isProcessing}
                disabled={isProcessing}
              >
                Study
              </Button>
            ) : (
              <span className="body-small" style={{ color: 'var(--color-success)' }}>
                {nextReviewInfo.primary}
              </span>
            )}
            <Button
              variant="ghost"
              size="small"
              onClick={handleEditClick}
              style={{ padding: '0.25rem 0.5rem' }}
              disabled={isProcessing}
            >
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleDeleteClick}
              style={{ padding: '0.25rem 0.5rem' }}
              disabled={isProcessing}
            >
              ×
            </Button>
          </>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.content === nextProps.item.content &&
    prevProps.item.review_count === nextProps.item.review_count &&
    prevProps.item.next_review_at === nextProps.item.next_review_at &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editContent === nextProps.editContent &&
    prevProps.isProcessing === nextProps.isProcessing
  )
})