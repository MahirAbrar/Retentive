import { logger } from '../../utils/logger'
import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardContent, Button, Badge, useToast, ConfirmDialog, Input, Modal } from '../ui'
import { MasteryDialog } from '../MasteryDialog'
import { ArchiveInsights } from './ArchiveInsights'
import { AutoArchiveSuggestion } from './AutoArchiveSuggestion'
import { SubjectSelector } from '../subjects'
import type { Topic, LearningItem, LearningMode, MasteryStatus } from '../../types/database'
import { 
  MoreVertical, 
  X, 
  Info, 
  Check,
  RefreshCw,
  Package,
  Settings
} from 'lucide-react'
import { LEARNING_MODES, MODE_TOOLTIP } from '../../config/learning'
import { formatDuration, formatReviewDate, getOptimalReviewWindow } from '../../utils/timeFormat'
import { formatRelativeTime } from '../../utils/date'

// Mode guidance for tooltips
import { formatNextReview } from '../../utils/formatters'
import { getModeRecommendation } from '../../utils/learningScience'
import { topicsService } from '../../services/topicsService'
import { dataService } from '../../services/dataService'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuth'
import { cacheService } from '../../services/cacheService'
import { spacedRepetitionGamified } from '../../services/spacedRepetitionGamified'
import { gamificationService } from '../../services/gamificationService'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import { ReviewWindowIndicator } from '../gamification/ReviewWindowIndicator'
import { useAchievements } from '../../hooks/useAchievements'

type ItemFilterType = 'all' | 'due' | 'new' | 'upcoming' | 'mastered' | 'archived'
type TopicStats = { total: number; due: number; new: number; archived?: number; longestDueAt?: string | null }

function getLongestDueAt(items: LearningItem[]): string | null {
  const now = new Date().toISOString()
  let earliest: string | null = null
  for (const item of items) {
    if (
      item.next_review_at &&
      item.next_review_at <= now &&
      item.review_count > 0 &&
      item.mastery_status !== 'archived' &&
      (!earliest || item.next_review_at < earliest)
    ) {
      earliest = item.next_review_at
    }
  }
  return earliest
}

const EMPTY_ITEMS: LearningItem[] = []
const DEFAULT_STATS = { total: 0, due: 0, new: 0, archived: 0, longestDueAt: null as string | null }

const TOPIC_CARD_RESPONSIVE_CSS = `
  @media (max-width: 768px) {
    .topic-card-content-row {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 0.75rem !important;
    }
    .topic-card-stats {
      gap: 1rem !important;
      flex-wrap: wrap !important;
    }
    .topic-card-actions {
      width: 100% !important;
    }
    .topic-card-actions > a,
    .topic-card-actions > button {
      flex: 1 !important;
    }
    .topic-card-item-meta {
      flex-wrap: wrap !important;
    }
  }
`

/** Self-updating countdown that ticks every second — only re-renders itself, not the parent */
function CountdownTimer({ nextReviewAt, learningMode }: { nextReviewAt: string; learningMode: string }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const reviewDate = new Date(nextReviewAt)
  const now = new Date()
  const diffMs = reviewDate.getTime() - now.getTime()
  const hoursDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60)
  const mode = GAMIFICATION_CONFIG.LEARNING_MODES[learningMode || 'steady']
  const perfectWindowMs = GAMIFICATION_CONFIG.FEATURES.timePressure.perfectWindow * 60 * 60 * 1000
  const windowAfterMs = mode.windowAfter * 60 * 60 * 1000
  const exactDate = formatReviewDate(reviewDate)

  let timeDisplay: string
  let timeColor: string
  let timingContext: string | null = null

  if (Math.abs(hoursDiff) <= GAMIFICATION_CONFIG.FEATURES.timePressure.perfectWindow) {
    const remainingMs = perfectWindowMs - Math.abs(diffMs)
    timeColor = 'var(--color-success)'
    timeDisplay = diffMs > 0 ? `Due in ${formatDuration(diffMs)}` : 'Due now'
    timingContext = `Perfect timing · ${formatDuration(remainingMs)} left · ${mode.pointsMultiplier.onTime}x pts`
  } else if (diffMs > perfectWindowMs) {
    const msTillPerfect = diffMs - perfectWindowMs
    timeColor = 'var(--color-text-secondary)'
    timeDisplay = `Due in ${formatDuration(diffMs)}`
    timingContext = `Perfect window in ${formatDuration(msTillPerfect)}`
  } else if (hoursDiff > 0 && hoursDiff <= mode.windowAfter) {
    const remainingMs = windowAfterMs - (hoursDiff * 60 * 60 * 1000)
    timeColor = 'var(--color-warning)'
    timeDisplay = `${formatDuration(Math.abs(diffMs))} overdue`
    timingContext = `Good timing · ${formatDuration(remainingMs)} left · ${mode.pointsMultiplier.inWindow}x pts`
  } else if (diffMs > 0 && hoursDiff < 0) {
    const msTillPerfect = diffMs - perfectWindowMs
    timeColor = 'var(--color-text-secondary)'
    timeDisplay = `Due in ${formatDuration(diffMs)}`
    timingContext = `Perfect window in ${formatDuration(msTillPerfect)}`
  } else {
    timeColor = 'var(--color-error)'
    timeDisplay = `${formatDuration(Math.abs(diffMs))} overdue`
    timingContext = `Late · ${mode.pointsMultiplier.late}x pts`
  }

  return (
    <>
      <span className="body-small" style={{
        color: timeColor,
        fontWeight: timingContext?.includes('Perfect timing') ? 600 : 'normal'
      }}>
        {timeDisplay}
      </span>
      {timingContext && (
        <>
          <span className="body-small text-secondary">·</span>
          <span className="body-small" style={{ color: timeColor, opacity: 0.85, fontSize: 'var(--text-xs)' }}>
            {timingContext}
          </span>
        </>
      )}
      <span className="body-small text-secondary">•</span>
      <span className="body-small text-secondary">
        {exactDate}
      </span>
    </>
  )
}

interface TopicCardProps {
  topic: Topic
  stats: TopicStats
  items: LearningItem[]
  isExpanded: boolean
  isArchived: boolean
  showArchiveSuggestion: boolean
  isLoadingItems: boolean
  currentFilter: ItemFilterType
  visibleCount: number
  onToggle: (topicId: string) => void
  onArchive?: (topicId: string) => void
  onUnarchive?: (topicId: string) => void
  onDelete?: (topicId: string) => void
  setEditingTopic: React.Dispatch<React.SetStateAction<Topic | null>>
  setArchiveConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; topicId: string | null; topicName: string; activeItemCount: number }>>
  setDeleteConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; topicId: string | null; topicName: string }>>
  setDeleteItemConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; item: LearningItem | null }>>
  setMasteryDialogItem: React.Dispatch<React.SetStateAction<LearningItem | null>>
  setTopicItems: React.Dispatch<React.SetStateAction<Record<string, LearningItem[]>>>
  setTopicStats: React.Dispatch<React.SetStateAction<Record<string, TopicStats>>>
  setItemFilter: React.Dispatch<React.SetStateAction<Record<string, ItemFilterType>>>
  setItemsVisible: React.Dispatch<React.SetStateAction<Record<string, number>>>
  setShowArchiveSuggestions: React.Dispatch<React.SetStateAction<Set<string>>>
  setDismissedSuggestions: React.Dispatch<React.SetStateAction<Set<string>>>
  isDue: (item: LearningItem) => boolean
}

const TopicCard = memo(function TopicCard({
  topic, stats, items, isExpanded, isArchived, showArchiveSuggestion,
  isLoadingItems, currentFilter, visibleCount,
  onToggle, onArchive, onUnarchive, onDelete,
  setEditingTopic, setArchiveConfirm, setDeleteConfirm, setDeleteItemConfirm,
  setMasteryDialogItem, setTopicItems, setTopicStats, setItemFilter, setItemsVisible,
  setShowArchiveSuggestions, setDismissedSuggestions, isDue,
}: TopicCardProps) {
  const longestDueAt = stats.longestDueAt ?? null
  const longestDueMs = longestDueAt ? Date.now() - new Date(longestDueAt).getTime() : 0
  const longestDueText = longestDueAt ? formatRelativeTime(longestDueAt) : null
  const longestDueColor = longestDueMs > 7 * 86400000
    ? 'var(--color-error)'
    : longestDueMs > 3 * 86400000
      ? 'var(--color-warning)'
      : 'var(--color-text-secondary)'

  // Per-card local state (avoids cross-card re-renders)
  const [modeTooltipOpen, setModeTooltipOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemContent, setEditItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemContent, setNewItemContent] = useState('')
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())

  const { user } = useAuth()
  const { addToast } = useToast()
  const { showAchievements } = useAchievements()

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = () => setMenuOpen(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  const handleEditItem = async (item: LearningItem) => {
    if (!editItemContent.trim()) {
      setEditingItemId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('learning_items')
        .update({ content: editItemContent.trim() })
        .eq('id', item.id)

      if (error) throw error

      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map(i =>
          i.id === item.id ? { ...i, content: editItemContent.trim() } : i
        )
      }))

      addToast('success', 'Item updated successfully')
      setEditingItemId(null)
    } catch {
      addToast('error', 'Failed to update item')
    }
  }

  const handleAddItem = async () => {
    if (!newItemContent.trim() || !user) return

    try {
      const newItem = {
        topic_id: topic.id,
        user_id: user.id,
        content: newItemContent.trim(),
        learning_mode: topic.learning_mode,
        review_count: 0,
        ease_factor: 2.5,
        interval_days: 0
      }

      const { data, error } = await supabase
        .from('learning_items')
        .insert(newItem)
        .select()
        .single()

      if (error) {
        logger.error('Error adding item:', error)
        throw error
      }

      setTopicItems(prev => ({
        ...prev,
        [topic.id]: [...(prev[topic.id] || []), data]
      }))

      const allItems = [...items, data]
      const activeItems = allItems.filter(item => item.mastery_status !== 'archived')
      const archivedCount = allItems.filter(item => item.mastery_status === 'archived').length
      const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = activeItems.filter(item => item.review_count === 0).length
      const newStats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount, longestDueAt: getLongestDueAt(allItems) }

      setTopicStats(prev => ({
        ...prev,
        [topic.id]: newStats
      }))

      const cacheKey = `topic-stats-${topic.id}`
      cacheService.set(cacheKey, newStats, 60 * 1000)

      addToast('success', 'Item added successfully')
      setIsAddingItem(false)
      setNewItemContent('')

      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch {
      addToast('error', 'Failed to add item')
    }
  }

  const handleReviewItem = async (item: LearningItem) => {
    if (!user) return

    if (item.mastery_status === 'archived') {
      addToast('error', 'Cannot review archived items. Unarchive first to continue reviewing.')
      return
    }

    setProcessingItems(prev => new Set(prev).add(item.id))

    try {
      const reviewedAt = new Date()
      const reviewResult = spacedRepetitionGamified.calculateNextReview(item, topic.target_review_count ?? 5)
      const pointsBreakdown = gamificationService.calculateReviewPoints(item, reviewedAt)
      const comboBonus = gamificationService.getComboBonus()
      const totalPoints = pointsBreakdown.totalPoints + comboBonus

      const updatedItem = {
        ...item,
        review_count: item.review_count + 1,
        last_reviewed_at: reviewedAt.toISOString(),
        next_review_at: reviewResult.nextReviewAt,
        interval_days: reviewResult.intervalDays,
        ease_factor: reviewResult.easeFactor
      }

      const updateData: any = {
        review_count: updatedItem.review_count,
        last_reviewed_at: updatedItem.last_reviewed_at,
        next_review_at: updatedItem.next_review_at,
        interval_days: updatedItem.interval_days,
        ease_factor: updatedItem.ease_factor
      }

      if (item.mastery_status === 'maintenance') {
        updateData.maintenance_interval_days = Math.round(reviewResult.intervalDays)
      }

      const [itemResult, sessionResult, pointsResult] = await Promise.all([
        supabase
          .from('learning_items')
          .update(updateData)
          .eq('id', item.id),
        supabase
          .from('review_sessions')
          .insert({
            user_id: user.id,
            learning_item_id: item.id,
            reviewed_at: reviewedAt.toISOString(),
            next_review_at: updatedItem.next_review_at,
            interval_days: reviewResult.intervalDays,
            points_earned: totalPoints,
            timing_bonus: pointsBreakdown.timeBonus,
            combo_count: gamificationService.getComboBonus() > 0 ? 1 : 0
          }),
        gamificationService.updateUserPoints(user.id, totalPoints, {
          itemId: item.id,
          wasPerfectTiming: pointsBreakdown.isPerfectTiming,
          reviewCount: updatedItem.review_count,
          targetReviewCount: topic.target_review_count ?? 5
        })
      ])

      if (itemResult.error) throw itemResult.error
      if (sessionResult.error) throw sessionResult.error
      const result = pointsResult

      if (result && result.newAchievements && result.newAchievements.length > 0) {
        showAchievements(result.newAchievements)
      }

      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map(i =>
          i.id === item.id ? updatedItem : i
        )
      }))

      const updatedItems = items.map(i =>
        i.id === item.id ? updatedItem : i
      )
      const activeItems = updatedItems.filter(i => i.mastery_status !== 'archived')
      const archivedCount = updatedItems.filter(i => i.mastery_status === 'archived').length
      const dueCount = activeItems.filter(i => {
        if (i.review_count === 0) return false
        return isDue(i.id === item.id ? updatedItem : i)
      }).length
      const newCount = activeItems.filter(i => i.review_count === 0).length
      const newStats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount, longestDueAt: getLongestDueAt(updatedItems) }

      setTopicStats(prev => ({
        ...prev,
        [item.topic_id]: newStats
      }))

      const cacheKey = `topic-stats-${item.topic_id}`
      cacheService.set(cacheKey, newStats, 60 * 1000)

      const masteryStage = spacedRepetitionGamified.getMasteryStage(updatedItem.review_count, topic.target_review_count ?? 5)
      let message = `${pointsBreakdown.message} +${totalPoints} points`

      if (comboBonus > 0) {
        message += ` (Combo +${comboBonus}!)`
      }

      const shouldShowMasteryDialog = (reviewResult.isMastered || updatedItem.review_count === (topic.target_review_count ?? 5)) &&
          item.mastery_status !== 'maintenance' &&
          item.mastery_status !== ('archived' as MasteryStatus) &&
          item.mastery_status !== 'mastered'

      if (shouldShowMasteryDialog) {
        setMasteryDialogItem(updatedItem)
        addToast('success', `🎉 Item mastered! ${masteryStage.emoji} +${GAMIFICATION_CONFIG.MASTERY.bonusPoints} bonus points!`)
      } else if (item.mastery_status === 'maintenance') {
        const nextMaintenance = Math.round(reviewResult.intervalDays)
        addToast('success', `Maintenance review complete! Next review in ${nextMaintenance} days.`)
      } else {
        const hoursUntilNext = Math.round(reviewResult.intervalDays * 24)
        const minutesUntilNext = Math.round(reviewResult.intervalDays * 24 * 60)
        const timeUnit = minutesUntilNext < 60 ? `${minutesUntilNext} minute${minutesUntilNext !== 1 ? 's' : ''}` :
                        hoursUntilNext < 24 ? `${hoursUntilNext} hour${hoursUntilNext !== 1 ? 's' : ''}` :
                        `${Math.round(reviewResult.intervalDays)} day${reviewResult.intervalDays !== 1 ? 's' : ''}`
        addToast('success', `${message} | ${masteryStage.emoji} ${masteryStage.label} | Next: ${timeUnit}`)
      }

      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch {
      addToast('error', 'Failed to update review')
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  return (
    <div>
      {showArchiveSuggestion && !isArchived && (
        <AutoArchiveSuggestion
          topicId={topic.id}
          topicName={topic.name}
          onArchive={() => {
            if (onArchive) {
              onArchive(topic.id)
              setShowArchiveSuggestions(prev => {
                const newSet = new Set(prev)
                newSet.delete(topic.id)
                return newSet
              })
            }
          }}
          onDismiss={() => {
            setDismissedSuggestions(prev => {
              const newSet = new Set(prev)
              newSet.add(topic.id)
              return newSet
            })
            setShowArchiveSuggestions(prev => {
              const newSet = new Set(prev)
              newSet.delete(topic.id)
              return newSet
            })
          }}
        />
      )}

      <Card variant="bordered">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="h4">{topic.name}</h3>
            <div
              style={{ position: 'relative' }}
              tabIndex={0}
              role="button"
              aria-label={`Learning mode: ${LEARNING_MODES[topic.learning_mode]?.label || 'Steady'}`}
              onMouseEnter={() => setModeTooltipOpen(true)}
              onMouseLeave={() => setModeTooltipOpen(false)}
              onFocus={() => setModeTooltipOpen(true)}
              onBlur={() => setModeTooltipOpen(false)}
            >
              <Badge
                variant={topic.learning_mode === 'cram' || topic.learning_mode === 'ultracram' ? 'warning' : 'info'}
              >
                {LEARNING_MODES[topic.learning_mode]?.label || 'Steady'}
              </Badge>
              {modeTooltipOpen && MODE_TOOLTIP[topic.learning_mode] && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 20,
                  minWidth: '180px',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p className="caption text-secondary">Review schedule</p>
                    <p className="body-small" style={{ fontWeight: '500' }}>{MODE_TOOLTIP[topic.learning_mode].schedule}</p>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p className="caption text-secondary">Session length</p>
                    <p className="body-small" style={{ fontWeight: '500' }}>{MODE_TOOLTIP[topic.learning_mode].session}</p>
                  </div>
                  <div>
                    <p className="caption text-secondary">Content per item</p>
                    <p className="body-small" style={{ fontWeight: '500' }}>{MODE_TOOLTIP[topic.learning_mode].chunk}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <style>{TOPIC_CARD_RESPONSIVE_CSS}</style>
          <div className="topic-card-content-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="topic-card-stats" style={{ display: 'flex', gap: '2rem' }}>
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
              {(stats.archived || 0) > 0 && (
                <div>
                  <p className="body-small text-secondary">Archived</p>
                  <p className="body" style={{ color: 'var(--color-gray-400)' }}>{stats.archived}</p>
                </div>
              )}
              {longestDueText && (
                <div>
                  <p className="body-small text-secondary">Longest Due</p>
                  <p className="body" style={{ color: longestDueColor }}>{longestDueText}</p>
                </div>
              )}
            </div>

            <div className="topic-card-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="primary"
                size="small"
                onClick={() => onToggle(topic.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Collapse' : 'View Items'}
              </Button>
              <div style={{ position: 'relative', zIndex: menuOpen ? 10000 : 'auto' }}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(prev => !prev)
                  }}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <MoreVertical size={20} />
                </Button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.25rem',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                    zIndex: 10001,
                    minWidth: '120px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTopic(topic)
                        setMenuOpen(false)
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Edit
                    </button>
                    {!isArchived && onArchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()

                          const activeItemCount = stats.total
                          if (activeItemCount > 0) {
                            setArchiveConfirm({ open: true, topicId: topic.id, topicName: topic.name, activeItemCount })
                            setMenuOpen(false)
                            return
                          }

                          onArchive(topic.id)
                          setMenuOpen(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--color-warning)',
                          fontSize: 'var(--text-sm)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Archive
                      </button>
                    )}
                    {isArchived && onUnarchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnarchive(topic.id)
                          setMenuOpen(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--color-info)',
                          fontSize: 'var(--text-sm)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-gray-50)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Restore
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm({ open: true, topicId: topic.id, topicName: topic.name })
                          setMenuOpen(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--color-error)',
                          fontSize: 'var(--text-sm)'
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

          {isExpanded && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-gray-200)', paddingTop: '1.5rem' }}>
              {isLoadingItems ? (
                <p className="body-small text-secondary">Loading items...</p>
              ) : (
                <>
                  {items.length === 0 && (
                    <p className="body-small text-secondary">No items in this topic</p>
                  )}
                  {items.length > 0 && (() => {
                    const filteredItems = items.filter(item => {
                      switch (currentFilter) {
                        case 'due': return item.review_count > 0 && isDue(item)
                        case 'new': return item.review_count === 0
                        case 'upcoming': return item.review_count > 0 && !isDue(item)
                          && item.mastery_status !== 'mastered'
                          && item.mastery_status !== 'archived'
                        case 'mastered': return item.mastery_status === 'mastered'
                          || item.mastery_status === 'maintenance'
                        case 'archived': return item.mastery_status === 'archived'
                        default: return true
                      }
                    })
                    const displayedItems = filteredItems.slice(0, visibleCount)
                    const hasMore = filteredItems.length > visibleCount

                    const counts = {
                      all: items.length,
                      due: items.filter(i => i.review_count > 0 && isDue(i)).length,
                      new: items.filter(i => i.review_count === 0).length,
                      upcoming: items.filter(i => i.review_count > 0 && !isDue(i) && i.mastery_status !== 'mastered' && i.mastery_status !== 'archived').length,
                      mastered: items.filter(i =>
                        i.mastery_status === 'mastered' ||
                        i.mastery_status === 'maintenance' ||
                        (i.mastery_status === 'archived' && i.review_count >= (topic.target_review_count ?? 5))
                      ).length,
                      archived: items.filter(i =>
                        i.mastery_status === 'archived' && i.review_count < (topic.target_review_count ?? 5)
                      ).length,
                    }

                    const filterOptions = [
                      { key: 'all' as const, label: 'All' },
                      { key: 'due' as const, label: 'Due' },
                      { key: 'new' as const, label: 'New' },
                      { key: 'upcoming' as const, label: 'Upcoming' },
                      { key: 'mastered' as const, label: 'Mastered' },
                      { key: 'archived' as const, label: 'Archived' },
                    ]

                    return (
                      <>
                        {/* Filter pills */}
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          {filterOptions
                            .filter(f => f.key === 'all' || counts[f.key] > 0)
                            .map(f => (
                              <button
                                key={f.key}
                                onClick={() => {
                                  setItemFilter(prev => ({ ...prev, [topic.id]: f.key }))
                                  setItemsVisible(prev => { const next = {...prev}; delete next[topic.id]; return next })
                                }}
                                style={{
                                  padding: '0.25rem 0.625rem',
                                  fontSize: 'var(--text-xs)',
                                  fontFamily: 'var(--font-mono)',
                                  border: '1px solid',
                                  borderColor: currentFilter === f.key ? 'var(--color-primary)' : 'var(--color-gray-300)',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: currentFilter === f.key ? 'var(--color-primary)' : 'transparent',
                                  color: currentFilter === f.key ? 'white' : 'var(--color-text-secondary)',
                                  cursor: 'pointer',
                                  lineHeight: 1.4,
                                }}
                              >
                                {f.label} ({counts[f.key]})
                              </button>
                            ))}
                        </div>

                        {filteredItems.length === 0 ? (
                          <p className="body-small text-secondary" style={{ padding: '1rem 0' }}>
                            No items match this filter
                          </p>
                        ) : (
                          <>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              {displayedItems.map((item) => {
                    const isProcessing = processingItems.has(item.id)
                    const itemIsDue = isDue(item)

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          {editingItemId === item.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <Input
                                value={editItemContent}
                                onChange={(e) => setEditItemContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditItem(item)
                                  if (e.key === 'Escape') setEditingItemId(null)
                                }}
                                style={{ flex: 1 }}
                                autoFocus
                              />
                              <Button size="small" onClick={() => handleEditItem(item)}>Save</Button>
                              <Button size="small" variant="ghost" onClick={() => setEditingItemId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <p
                                className="body-small"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setEditingItemId(item.id)
                                  setEditItemContent(item.content)
                                }}
                              >
                                {item.content}
                              </p>
                              <div className="topic-card-item-meta" style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', alignItems: 'center' }}>
                                <span className="body-small text-secondary">
                                  Reviews: {item.review_count}
                                </span>
                                {item.next_review_at && item.review_count < (topic.target_review_count ?? 5) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CountdownTimer nextReviewAt={item.next_review_at} learningMode={item.learning_mode || 'steady'} />
                                          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                            <button
                                              onMouseEnter={(e) => {
                                                const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement
                                                if (tooltip) tooltip.style.display = 'block'
                                              }}
                                              onMouseLeave={(e) => {
                                                const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement
                                                if (tooltip) tooltip.style.display = 'none'
                                              }}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'help',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: 'var(--color-text-secondary)'
                                              }}
                                            >
                                              <Info size={14} />
                                              <div className="tooltip" style={{
                                                display: 'none',
                                                position: 'absolute',
                                                bottom: '100%',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                marginBottom: '8px',
                                                background: 'var(--color-surface)',
                                                border: '1px solid var(--color-gray-200)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.75rem',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                                zIndex: 100,
                                                minWidth: '300px',
                                                fontSize: '12px',
                                                whiteSpace: 'normal'
                                              }}>
                                                {(() => {
                                                  const itemMode = item.learning_mode || 'steady'
                                                  const window = getOptimalReviewWindow(itemMode)
                                                  const recommendation = getModeRecommendation(itemMode)
                                                  return (
                                                    <>
                                                      <div style={{ marginBottom: '0.75rem' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '13px' }}>
                                                          📊 Optimal Review Window ({itemMode})
                                                        </div>
                                                        <div style={{ paddingLeft: '0.5rem' }}>
                                                          <div><span style={{ color: '#22c55e', marginRight: '4px' }}>●</span> Perfect: {window.perfect}</div>
                                                          <div><span style={{ color: '#eab308', marginRight: '4px' }}>●</span> Early: {window.early}</div>
                                                          <div><span style={{ color: '#ef4444', marginRight: '4px' }}>●</span> Late: {window.late}</div>
                                                        </div>
                                                      </div>

                                                      <div style={{ marginBottom: '0.75rem' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '13px' }}>
                                                          📝 Ideal Chunk Size
                                                        </div>
                                                        <div style={{ paddingLeft: '0.5rem' }}>
                                                          <div>{recommendation.chunkSize.min}-{recommendation.chunkSize.max} sentences per item</div>
                                                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                                            {recommendation.chunkSize.description}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div style={{ marginBottom: '0.75rem' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '13px' }}>
                                                          ⏱️ Session Length
                                                        </div>
                                                        <div style={{ paddingLeft: '0.5rem' }}>
                                                          <div>{recommendation.sessionLength.chunks} ({recommendation.sessionLength.minutes} min)</div>
                                                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                                            {recommendation.sessionLength.description}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div style={{ marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '13px' }}>
                                                          ☕ Break Time
                                                        </div>
                                                        <div style={{ paddingLeft: '0.5rem' }}>
                                                          <div>{recommendation.breakTime.duration} after {recommendation.breakTime.after} min</div>
                                                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                                            {recommendation.breakTime.description}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div style={{
                                                        marginTop: '0.75rem',
                                                        paddingTop: '0.75rem',
                                                        borderTop: '1px solid var(--color-gray-200)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                      }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Cognitive Load:</span>
                                                        <span style={{
                                                          fontSize: '11px',
                                                          fontWeight: 'bold',
                                                          color: recommendation.cognitiveLoad.color,
                                                          padding: '0.125rem 0.5rem',
                                                          backgroundColor: 'var(--color-gray-50)',
                                                          borderRadius: 'var(--radius-sm)'
                                                        }}>
                                                          {recommendation.cognitiveLoad.level}
                                                        </span>
                                                      </div>
                                                    </>
                                                  )
                                                })()}
                                              </div>
                                            </button>
                                          </div>
                                  </div>
                                )}
                                {item.review_count >= (topic.target_review_count ?? 5) && item.mastery_status === 'mastered' && (
                                  <span className="body-small" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Check size={14} /> Mastered
                                  </span>
                                )}
                                {item.mastery_status === 'maintenance' && (
                                  <span className="body-small" style={{ color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <RefreshCw size={14} /> Maintenance
                                  </span>
                                )}
                                {item.mastery_status === 'archived' && (
                                  <span className="body-small" style={{ color: 'var(--color-gray-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Package size={14} /> Archived
                                  </span>
                                )}
                                <ReviewWindowIndicator item={item} />
                              </div>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {editingItemId !== item.id && (
                            <>
                              {item.mastery_status === 'archived' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span className="body-small" style={{ color: 'var(--color-gray-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Package size={14} /> Archived
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => setMasteryDialogItem(item)}
                                    style={{ padding: '0.25rem 0.5rem' }}
                                  >
                                    Manage
                                  </Button>
                                </div>
                              ) : (itemIsDue || item.review_count === 0) ? (
                                <Button
                                  variant="primary"
                                  size="small"
                                  onClick={() => handleReviewItem(item)}
                                  loading={isProcessing}
                                  disabled={isProcessing}
                                >
                                  Study
                                </Button>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span className="body-small" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {item.mastery_status === 'mastered' ? (<><Check size={14} /> Mastered</>) :
                                     item.mastery_status === 'maintenance' ? (<><RefreshCw size={14} /> {formatNextReview(item.next_review_at || '')}</>) :
                                     formatNextReview(item.next_review_at || '')}
                                  </span>
                                  {(item.mastery_status === 'mastered' || item.mastery_status === 'maintenance') && (
                                    <Button
                                      variant="ghost"
                                      size="small"
                                      onClick={() => setMasteryDialogItem(item)}
                                      style={{ padding: '0.25rem 0.5rem' }}
                                      aria-label={item.mastery_status === 'maintenance' ? 'Change maintenance status' : 'Change mastery status'}
                                    >
                                      <Settings size={14} />
                                    </Button>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="small"
                                onClick={() => setDeleteItemConfirm({ open: true, item })}
                                style={{ padding: '0.25rem 0.5rem' }}
                                aria-label={`Delete "${item.content.substring(0, 30)}"`}
                              >
                                <X size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                            </div>

                            {/* Show More / Show Less controls */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: '0.75rem',
                              padding: '0.5rem 0',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-text-secondary)',
                              fontFamily: 'var(--font-mono)',
                            }}>
                              <span>
                                Showing {Math.min(visibleCount, filteredItems.length)} of {filteredItems.length}{currentFilter !== 'all' ? ` ${currentFilter}` : ''} item{filteredItems.length !== 1 ? 's' : ''}
                              </span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {hasMore && (
                                  <button
                                    onClick={() => setItemsVisible(prev => ({ ...prev, [topic.id]: visibleCount + 10 }))}
                                    style={{
                                      background: 'none',
                                      border: '1px solid var(--color-gray-300)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.25rem 0.625rem',
                                      fontSize: 'var(--text-xs)',
                                      fontFamily: 'var(--font-mono)',
                                      color: 'var(--color-primary)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Show 10 More
                                  </button>
                                )}
                                {visibleCount > 10 && (
                                  <button
                                    onClick={() => setItemsVisible(prev => { const next = {...prev}; delete next[topic.id]; return next })}
                                    style={{
                                      background: 'none',
                                      border: '1px solid var(--color-gray-300)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.25rem 0.625rem',
                                      fontSize: 'var(--text-xs)',
                                      fontFamily: 'var(--font-mono)',
                                      color: 'var(--color-text-secondary)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Show Less
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}

                  {/* Add Item Button */}
                  <div style={{ marginTop: '1rem' }}>
                    {isAddingItem ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Input
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem()
                            if (e.key === 'Escape') {
                              setIsAddingItem(false)
                              setNewItemContent('')
                            }
                          }}
                          placeholder="Enter item content..."
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <Button size="small" onClick={() => handleAddItem()}>Add</Button>
                        <Button size="small" variant="ghost" onClick={() => {
                          setIsAddingItem(false)
                          setNewItemContent('')
                        }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => setIsAddingItem(true)}
                      >
                        + Add Item
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {isArchived && isExpanded && (
            <ArchiveInsights
              topicId={topic.id}
              topicName={topic.name}
              createdAt={topic.created_at}
              archiveDate={topic.archive_date}
              targetReviewCount={topic.target_review_count ?? 5}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}, (prev, next) => {
  // Compare only data props — state setters are stable by React guarantee
  // Value-compare topic (parent may recreate objects with same data)
  const topicEqual =
    prev.topic.id === next.topic.id &&
    prev.topic.name === next.topic.name &&
    prev.topic.learning_mode === next.topic.learning_mode &&
    prev.topic.subject_id === next.topic.subject_id &&
    prev.topic.archive_date === next.topic.archive_date

  // Value-compare stats (loadAllStats creates fresh objects each run)
  const statsEqual =
    prev.stats.total === next.stats.total &&
    prev.stats.due === next.stats.due &&
    prev.stats.new === next.stats.new &&
    (prev.stats.archived || 0) === (next.stats.archived || 0) &&
    (prev.stats.longestDueAt || null) === (next.stats.longestDueAt || null)

  return (
    topicEqual &&
    statsEqual &&
    prev.items === next.items &&
    prev.isExpanded === next.isExpanded &&
    prev.isArchived === next.isArchived &&
    prev.showArchiveSuggestion === next.showArchiveSuggestion &&
    prev.isLoadingItems === next.isLoadingItems &&
    prev.currentFilter === next.currentFilter &&
    prev.visibleCount === next.visibleCount &&
    prev.onToggle === next.onToggle &&
    prev.onArchive === next.onArchive &&
    prev.onUnarchive === next.onUnarchive &&
    prev.onDelete === next.onDelete &&
    prev.isDue === next.isDue
  )
})

export interface TopicStatsChange {
  total: number
  due: number
  new: number
  archived?: number
}

interface TopicListProps {
  topics: Topic[]
  onDelete?: (topicId: string) => void
  onArchive?: (topicId: string) => void
  onUnarchive?: (topicId: string) => void
  onTopicUpdate?: (topic: Topic) => void
  onTopicStatsChange?: (topicId: string, stats: TopicStatsChange) => void
  isArchived?: boolean
  loading?: boolean
}

function TopicListComponent({ topics, onDelete, onArchive, onUnarchive, onTopicUpdate, onTopicStatsChange, isArchived = false, loading }: TopicListProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [topicItems, setTopicItems] = useState<Record<string, LearningItem[]>>({})
  const [topicStats, setTopicStats] = useState<Record<string, TopicStats>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; topicId: string | null; topicName: string }>({ open: false, topicId: null, topicName: '' })
  const [archiveConfirm, setArchiveConfirm] = useState<{ open: boolean; topicId: string | null; topicName: string; activeItemCount: number }>({ open: false, topicId: null, topicName: '', activeItemCount: 0 })
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ open: boolean; item: LearningItem | null }>({ open: false, item: null })
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [masteryDialogItem, setMasteryDialogItem] = useState<LearningItem | null>(null)
  const [showArchiveSuggestions, setShowArchiveSuggestions] = useState<Set<string>>(new Set())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [itemsVisible, setItemsVisible] = useState<Record<string, number>>({})
  const [itemFilter, setItemFilter] = useState<Record<string, ItemFilterType>>({})
  const { addToast } = useToast()
  const { user } = useAuth()

  // Refs for stable toggleTopic callback
  const expandedTopicsRef = useRef(expandedTopics)
  expandedTopicsRef.current = expandedTopics
  const topicItemsRef = useRef(topicItems)
  topicItemsRef.current = topicItems
  const loadingItemsRef = useRef(loadingItems)
  loadingItemsRef.current = loadingItems

  // Notify parent of stats changes so it can keep its topic state in sync
  // (e.g. for subject header totals that are derived from parent state)
  const prevTopicStatsRef = useRef<Record<string, TopicStats>>({})
  useEffect(() => {
    if (!onTopicStatsChange) {
      prevTopicStatsRef.current = topicStats
      return
    }
    for (const [topicId, stats] of Object.entries(topicStats)) {
      const prev = prevTopicStatsRef.current[topicId]
      if (
        !prev ||
        prev.total !== stats.total ||
        prev.due !== stats.due ||
        prev.new !== stats.new ||
        (prev.archived || 0) !== (stats.archived || 0)
      ) {
        logger.debug('[TopicList] onTopicStatsChange', topicId, { prev, next: stats })
        onTopicStatsChange(topicId, {
          total: stats.total,
          due: stats.due,
          new: stats.new,
          archived: stats.archived,
        })
      }
    }
    prevTopicStatsRef.current = topicStats
  }, [topicStats, onTopicStatsChange])

  // Sorted topics are handled by the parent component
  // const sortedTopics = useMemo(() => {
  //   return [...topics].sort((a, b) => b.priority - a.priority)
  // }, [topics])

  // Define isDue first since it's used by other functions
  const isDue = useCallback((item: LearningItem) => {
    // New items (never studied) are not considered "due" - they're ready to learn
    if (item.review_count === 0) return false
    
    // Archived items are never due
    if (item.mastery_status === 'archived') return false
    
    const dueItems = spacedRepetitionGamified.getDueItems([item])
    return dueItems.length > 0
  }, [])

  const loadTopicStats = useCallback(async (topicId: string) => {
    // Check cache first for performance
    const cacheKey = `topic-stats-${topicId}`
    const cached = cacheService.get<TopicStats>(cacheKey)
    
    if (cached) {
      setTopicStats(prev => ({
        ...prev,
        [topicId]: cached
      }))
      return
    }
    
    try {
      const { data, error } = await topicsService.getTopicItems(topicId)
      if (error) throw error
      
      const items = data || []
      const activeItems = items.filter(item => item.mastery_status !== 'archived')
      const archivedCount = items.filter(item => item.mastery_status === 'archived').length
      const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = activeItems.filter(item => item.review_count === 0).length
      
      const stats = {
        total: activeItems.length,
        due: dueCount,
        new: newCount,
        archived: archivedCount,
        longestDueAt: getLongestDueAt(items)
      }

      // Cache for 1 minute
      cacheService.set(cacheKey, stats, 60 * 1000)
      
      setTopicStats(prev => ({
        ...prev,
        [topicId]: stats
      }))
    } catch (error) {
      logger.error('Error loading topic stats:', error)
      // Set default values on error
      setTopicStats(prev => ({
        ...prev,
        [topicId]: { total: 0, due: 0, new: 0, archived: 0, longestDueAt: null }
      }))
    }
  }, [isDue])

  const toggleTopic = useCallback(async (topicId: string) => {
    const wasExpanded = expandedTopicsRef.current.has(topicId)

    if (wasExpanded) {
      setExpandedTopics(prev => { const s = new Set(prev); s.delete(topicId); return s })
      setItemsVisible(prev => { const next = {...prev}; delete next[topicId]; return next })
      setItemFilter(prev => { const next = {...prev}; delete next[topicId]; return next })
      return
    }

    setExpandedTopics(prev => new Set(prev).add(topicId))

    // Load items if not already loaded
    if (topicItemsRef.current[topicId] || loadingItemsRef.current.has(topicId)) return

    setLoadingItems(prev => new Set(prev).add(topicId))

    try {
      const { data, error } = await topicsService.getTopicItems(topicId)
      if (error) throw error

      setTopicItems(prev => ({ ...prev, [topicId]: data || [] }))

      const items = data || []
      const activeItems = items.filter(item => item.mastery_status !== 'archived')
      const archivedCount = items.filter(item => item.mastery_status === 'archived').length
      const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = activeItems.filter(item => item.review_count === 0).length
      const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount, longestDueAt: getLongestDueAt(items) }

      const cacheKey = `topic-stats-${topicId}`
      cacheService.set(cacheKey, stats, 60 * 1000)

      setTopicStats(prev => ({
        ...prev,
        [topicId]: stats
      }))
    } catch (error) {
      addToast('error', 'Failed to load items')
      logger.error('Error loading items:', error)
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(topicId)
        return newSet
      })
    }
  }, [addToast, isDue])

  // Load stats for all topics on mount and when topics change — batched into a single state update
  // Also stores fetched items so toggleTopic doesn't re-fetch them
  useEffect(() => {
    const loadAllStats = async () => {
      const statsResults: Record<string, TopicStats> = {}
      const itemsResults: Record<string, LearningItem[]> = {}

      await Promise.all(topics.map(async (topic) => {
        const cacheKey = `topic-stats-${topic.id}`
        const cached = cacheService.get<TopicStats>(cacheKey)

        if (cached) {
          statsResults[topic.id] = cached
          return
        }

        try {
          const { data, error } = await topicsService.getTopicItems(topic.id)
          if (error) throw error

          const items = data || []
          itemsResults[topic.id] = items
          const activeItems = items.filter(item => item.mastery_status !== 'archived')
          const archivedCount = items.filter(item => item.mastery_status === 'archived').length
          const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
          const newCount = activeItems.filter(item => item.review_count === 0).length

          const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount, longestDueAt: getLongestDueAt(items) }
          cacheService.set(cacheKey, stats, 60 * 1000)
          statsResults[topic.id] = stats
        } catch (error) {
          logger.error('Error loading topic stats:', error)
          statsResults[topic.id] = { total: 0, due: 0, new: 0, archived: 0, longestDueAt: null }
        }
      }))

      // Single state update for all topics
      setTopicStats(prev => ({ ...prev, ...statsResults }))
      if (Object.keys(itemsResults).length > 0) {
        setTopicItems(prev => ({ ...prev, ...itemsResults }))
      }
    }

    if (topics.length > 0) {
      loadAllStats()
    }
  }, [topics, isDue])

  // Check for fully mastered topics that could be archived
  useEffect(() => {
    const checkForMasteredTopics = () => {
      const suggestions = new Set<string>()
      
      for (const topic of topics) {
        // Skip if already archived or suggestion dismissed
        if (isArchived || dismissedSuggestions.has(topic.id)) continue
        
        const items = topicItems[topic.id]
        if (!items || items.length === 0) continue
        
        // Check if all items are truly mastered (not just archived)
        const allMastered = items.every(item => 
          item.mastery_status === 'mastered' || 
          item.mastery_status === 'maintenance' ||
          (item.mastery_status === 'archived' && item.review_count >= (topic.target_review_count ?? 5))
        )
        
        if (allMastered && items.length > 0) {
          suggestions.add(topic.id)
        }
      }
      
      setShowArchiveSuggestions(suggestions)
    }
    
    checkForMasteredTopics()
  }, [topics, topicItems, isArchived, dismissedSuggestions])

  const handleArchiveTopic = async () => {
    if (!archiveConfirm.topicId || !onArchive) return
    onArchive(archiveConfirm.topicId)
    setArchiveConfirm({ open: false, topicId: null, topicName: '', activeItemCount: 0 })
  }

  const handleDeleteTopic = async () => {
    if (!deleteConfirm.topicId || !onDelete) return
    
    try {
      await onDelete(deleteConfirm.topicId)
      addToast('success', 'Topic deleted successfully')
      setDeleteConfirm({ open: false, topicId: null, topicName: '' })
    } catch {
      addToast('error', 'Failed to delete topic')
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemConfirm.item) return
    
    const item = deleteItemConfirm.item
    try {
const { error } = await supabase
        .from('learning_items')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].filter(i => i.id !== item.id)
      }))

      // Update stats
      const newItems = topicItems[item.topic_id].filter(i => i.id !== item.id)
      const activeItems = newItems.filter(i => i.mastery_status !== 'archived')
      const archivedCount = newItems.filter(i => i.mastery_status === 'archived').length
      const dueCount = activeItems.filter(i => i.review_count > 0 && isDue(i)).length
      const newCount = activeItems.filter(i => i.review_count === 0).length
      const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount, longestDueAt: getLongestDueAt(newItems) }
      
      setTopicStats(prev => ({
        ...prev,
        [item.topic_id]: stats
      }))
      
      // Update cache with new stats
      const cacheKey = `topic-stats-${item.topic_id}`
      cacheService.set(cacheKey, stats, 60 * 1000)

      addToast('success', 'Item deleted successfully')
      setDeleteItemConfirm({ open: false, item: null })
      
      // Invalidate global stats cache
      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch {
      addToast('error', 'Failed to delete item')
    }
  }

  const handleMasterySelect = async (status: MasteryStatus) => {
    if (!masteryDialogItem || !user) return
    
    try {
      // Calculate maintenance interval if needed
      let maintenanceInterval: number | undefined
      if (status === 'maintenance') {
        maintenanceInterval = Math.round(spacedRepetitionGamified.calculateMaintenanceInterval(masteryDialogItem))
      }
      
      // Update the item's mastery status
      const { error } = await dataService.updateItemMasteryStatus(
        masteryDialogItem.id,
        status,
        maintenanceInterval
      )
      
      if (error) throw error
      
      // Update local state based on the status
      let updatedItem: LearningItem
      
      if (status === 'repeat') {
        // Reset all review-related fields for repeat mode
        updatedItem = {
          ...masteryDialogItem,
          mastery_status: 'active', // Reset to active status
          review_count: 0,
          interval_days: 0,
          ease_factor: 2.5,
          last_reviewed_at: null,
          next_review_at: null,
          mastery_date: null,
          archive_date: null,
          maintenance_interval_days: null
        }
      } else if (status === 'archived') {
        updatedItem = {
          ...masteryDialogItem,
          mastery_status: status,
          archive_date: new Date().toISOString(),
          maintenance_interval_days: null
        }
      } else if (status === 'maintenance') {
        updatedItem = {
          ...masteryDialogItem,
          mastery_status: status,
          maintenance_interval_days: maintenanceInterval,
          next_review_at: new Date(Date.now() + (maintenanceInterval || 0) * 24 * 60 * 60 * 1000).toISOString()
        }
      } else {
        // For 'mastered' status
        updatedItem = {
          ...masteryDialogItem,
          mastery_status: status,
          mastery_date: new Date().toISOString(),
          maintenance_interval_days: null
        }
      }
      
      setTopicItems(prev => ({
        ...prev,
        [masteryDialogItem.topic_id]: prev[masteryDialogItem.topic_id].map(i => 
          i.id === masteryDialogItem.id ? updatedItem : i
        )
      }))
      
      // Show feedback
      let message = ''
      switch (status) {
        case 'archived':
          message = 'Item archived! You won\'t see it in reviews anymore.'
          break
        case 'maintenance':
          message = `Item in maintenance mode! Next review in ${maintenanceInterval} days.`
          break
        case 'repeat':
          message = 'Item reset! Starting from the beginning.'
          break
        case 'mastered':
          message = 'Item marked as mastered! You can change this anytime.'
          break
      }
      
      addToast('success', message)
      setMasteryDialogItem(null)
      
      // Refresh stats
      loadTopicStats(masteryDialogItem.topic_id)
    } catch {
      addToast('error', 'Failed to update mastery status')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="body text-secondary">Loading topics...</p>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <Card variant="bordered">
        <CardContent>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 className="h4" style={{ marginBottom: '1rem' }}>No topics yet</h3>
            <p className="body text-secondary" style={{ marginBottom: '2rem' }}>
              Create your first topic to start learning
            </p>
            <Link to="/topics/new">
              <Button variant="primary">Create Topic</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            stats={topicStats[topic.id] || DEFAULT_STATS}
            items={topicItems[topic.id] || EMPTY_ITEMS}
            isExpanded={expandedTopics.has(topic.id)}
            isArchived={isArchived}
            showArchiveSuggestion={showArchiveSuggestions.has(topic.id)}
            isLoadingItems={loadingItems.has(topic.id)}
            currentFilter={itemFilter[topic.id] || 'all'}
            visibleCount={itemsVisible[topic.id] || 10}
            onToggle={toggleTopic}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
            setEditingTopic={setEditingTopic}
            setArchiveConfirm={setArchiveConfirm}
            setDeleteConfirm={setDeleteConfirm}
            setDeleteItemConfirm={setDeleteItemConfirm}
            setMasteryDialogItem={setMasteryDialogItem}
            setTopicItems={setTopicItems}
            setTopicStats={setTopicStats}
            setItemFilter={setItemFilter}
            setItemsVisible={setItemsVisible}
            setShowArchiveSuggestions={setShowArchiveSuggestions}
            setDismissedSuggestions={setDismissedSuggestions}
            isDue={isDue}
          />
        ))}
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={archiveConfirm.open}
        onClose={() => setArchiveConfirm({ open: false, topicId: null, topicName: '', activeItemCount: 0 })}
        onConfirm={handleArchiveTopic}
        title="Archive Topic"
        message={`This topic has ${archiveConfirm.activeItemCount} active item${archiveConfirm.activeItemCount > 1 ? 's' : ''}. Archiving the topic will hide it from your main list, but the items will remain active. Continue?`}
        confirmText="Archive"
        variant="danger"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, topicId: null, topicName: '' })}
        onConfirm={handleDeleteTopic}
        title="Delete Topic"
        message={`Are you sure you want to delete "${deleteConfirm.topicName}"? This will also delete all ${topicStats[deleteConfirm.topicId || '']?.total || 0} items in this topic. This action cannot be undone.`}
        confirmText="Delete Topic"
        variant="danger"
      />

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteItemConfirm.open}
        onClose={() => setDeleteItemConfirm({ open: false, item: null })}
        onConfirm={handleDeleteItem}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteItemConfirm.item?.content}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Edit Topic Modal */}
      {editingTopic && (
        <EditTopicModal
          topic={editingTopic}
          onClose={() => setEditingTopic(null)}
          onSave={async (updatedTopic) => {
            try {
              logger.info('=== Starting topic update ===')
              logger.info('Update payload:', {
                id: updatedTopic.id,
                name: updatedTopic.name,
                oldMode: editingTopic.learning_mode,
                newMode: updatedTopic.learning_mode,
                modeChanged: updatedTopic.learning_mode !== editingTopic.learning_mode,
                subjectId: updatedTopic.subject_id
              })

              // Update the topic
              const { data: topicData, error: topicError } = await supabase
                .from('topics')
                .update({
                  name: updatedTopic.name,
                  learning_mode: updatedTopic.learning_mode,
                  subject_id: updatedTopic.subject_id,
                  target_review_count: updatedTopic.target_review_count ?? 5
                })
                .eq('id', updatedTopic.id)
                .select()

              if (topicError) {
                logger.error('Topic update failed:', {
                  error: topicError,
                  code: topicError.code,
                  message: topicError.message,
                  details: topicError.details,
                  hint: topicError.hint
                })
                addToast('error', `Failed to update topic: ${topicError.message}`)
                return
              }

              if (!topicData || topicData.length === 0) {
                logger.error('Topic update returned no data')
                addToast('error', 'Topic update failed: No data returned')
                return
              }

              logger.info('Topic updated successfully:', {
                updatedTopic: topicData[0],
                verifiedMode: topicData[0].learning_mode
              })

              // If learning mode changed, update all associated learning items
              if (updatedTopic.learning_mode !== editingTopic.learning_mode) {
                logger.info('Learning mode changed, updating all items in topic', {
                  topicId: updatedTopic.id,
                  newMode: updatedTopic.learning_mode
                })

                const { data: itemsData, error: itemsError } = await supabase
                  .from('learning_items')
                  .update({
                    learning_mode: updatedTopic.learning_mode
                  })
                  .eq('topic_id', updatedTopic.id)
                  .select('id, learning_mode')

                if (itemsError) {
                  logger.error('Items update failed:', {
                    error: itemsError,
                    code: itemsError.code,
                    message: itemsError.message
                  })
                  addToast('error', `Topic updated but failed to update items: ${itemsError.message}`)
                  // Still close modal and notify parent since topic was updated
                  setEditingTopic(null)
                  onTopicUpdate?.(topicData[0])
                  return
                }

                logger.info(`Updated ${itemsData?.length || 0} learning items:`, {
                  count: itemsData?.length,
                  sampleItem: itemsData?.[0],
                  allItemsMode: itemsData?.every(item => item.learning_mode === updatedTopic.learning_mode)
                })

                addToast('success', `Topic and ${itemsData?.length || 0} items updated successfully`)
              } else {
                addToast('success', 'Topic updated successfully')
              }

              logger.info('=== Topic update complete ===')
              setEditingTopic(null)
              // Notify parent of the update
              onTopicUpdate?.(topicData[0])
            } catch (error) {
              logger.error('Unexpected error during topic update:', error)
              addToast('error', `Failed to update topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          }}
        />
      )}

      {/* Mastery Dialog */}
      {masteryDialogItem && (
        <MasteryDialog
          isOpen={!!masteryDialogItem}
          onClose={() => setMasteryDialogItem(null)}
          onSelect={handleMasterySelect}
          itemContent={masteryDialogItem.content}
          learningMode={masteryDialogItem.learning_mode}
          currentInterval={masteryDialogItem.interval_days}
        />
      )}
    </>
  )
}

// Export with React.memo for performance optimization
export const TopicList = memo(TopicListComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props actually changed
  return (
    prevProps.topics === nextProps.topics &&
    prevProps.isArchived === nextProps.isArchived &&
    prevProps.loading === nextProps.loading &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onArchive === nextProps.onArchive &&
    prevProps.onUnarchive === nextProps.onUnarchive
  )
})

// Edit Topic Modal Component
interface EditTopicModalProps {
  topic: Topic
  onClose: () => void
  onSave: (topic: Topic) => void
}

const EditTopicModal = function EditTopicModal({ topic, onClose, onSave }: EditTopicModalProps) {
  const [name, setName] = useState(topic?.name || '')
  const [learningMode, setLearningMode] = useState<LearningMode>(topic?.learning_mode || 'steady')
  const [subjectId, setSubjectId] = useState<string | null>(topic?.subject_id || null)
  const [targetReviewCount, setTargetReviewCount] = useState<number>(topic?.target_review_count ?? 5)

  // Sync state when topic prop changes
  useEffect(() => {
    if (topic) {
      logger.info('EditTopicModal: Syncing topic prop to state', {
        topicId: topic.id,
        name: topic.name,
        mode: topic.learning_mode,
        subjectId: topic.subject_id
      })
      setName(topic.name)
      setLearningMode(topic.learning_mode)
      setSubjectId(topic.subject_id || null)
      setTargetReviewCount(topic.target_review_count ?? 5)
    }
  }, [topic])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      logger.warn('EditTopicModal: Cannot save - name is empty')
      return
    }

    // Validate learning mode
    if (!LEARNING_MODES[learningMode]) {
      logger.error('EditTopicModal: Invalid learning mode selected', { learningMode })
      return
    }

    logger.info('EditTopicModal: Submitting changes', {
      topicId: topic.id,
      oldName: topic.name,
      newName: name.trim(),
      oldMode: topic.learning_mode,
      newMode: learningMode,
      modeChanged: topic.learning_mode !== learningMode,
      subjectId
    })

    if (topic) {
      onSave({
        ...topic,
        name: name.trim(),
        learning_mode: learningMode,
        subject_id: subjectId,
        target_review_count: targetReviewCount
      })
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit Topic">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Topic Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <SubjectSelector
            userId={topic.user_id}
            selectedSubjectId={subjectId}
            onSelect={setSubjectId}
          />

          <div>
            <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Learning Mode
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(LEARNING_MODES).map(([mode, config]) => (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="learningMode"
                    value={mode}
                    checked={learningMode === mode}
                    onChange={(e) => {
                      const newMode = e.target.value as LearningMode
                      logger.info('EditTopicModal: Learning mode changed', {
                        from: learningMode,
                        to: newMode
                      })
                      setLearningMode(newMode)
                    }}
                  />
                  <span className="body">{config.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Reviews to Master
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[3, 5].map((count) => (
                <label key={count} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="targetReviewCount"
                    value={count}
                    checked={targetReviewCount === count}
                    onChange={() => setTargetReviewCount(count)}
                  />
                  <span className="body">{count} reviews</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}