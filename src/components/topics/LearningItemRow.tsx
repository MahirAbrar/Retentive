import React, { memo, useCallback, useMemo } from 'react'
import { Button, Input } from '../ui'
import type { LearningItem } from '../../types/database'
import { ReviewWindowIndicator } from '../gamification/ReviewWindowIndicator'
import { GAMIFICATION_CONFIG } from '../../config/gamification'

interface LearningItemRowProps {
  item: LearningItem
  isEditing: boolean
  editContent: string
  isProcessing: boolean
  isDue: boolean
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
  isDue,
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

  // Memoize the next review display
  const nextReviewDisplay = useMemo(() => {
    if (item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired) {
      return '✓ Mastered'
    }
    if (!item.next_review_at) return null
    
    const reviewDate = new Date(item.next_review_at)
    const now = new Date()
    const hoursUntil = Math.floor((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysUntil = Math.floor(hoursUntil / 24)
    
    if (hoursUntil < 0) return 'Due now'
    if (hoursUntil < 1) return 'Due in < 1 hour'
    if (hoursUntil < 24) return `Due in ${hoursUntil} hours`
    return `Due in ${daysUntil} days`
  }, [item.review_count, item.next_review_at])

  const isMastered = item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired
  const showStudyButton = (isDue || item.review_count === 0) && !isMastered

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
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <span className="body-small text-secondary">
                Reviews: {item.review_count}
              </span>
              {item.review_count > 0 && item.next_review_at && (
                <ReviewWindowIndicator
                  nextReviewAt={item.next_review_at}
                  learningMode={item.learning_mode}
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
                {nextReviewDisplay}
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
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.isDue === nextProps.isDue
  )
})