import { logger } from '../../utils/logger'
import React, { useState, useEffect, useCallback, memo } from 'react'
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
import { LEARNING_MODES } from '../../constants/learning'
import { formatDuration, formatReviewDate, getOptimalReviewWindow } from '../../utils/timeFormat'

// Mode guidance for tooltips
const MODE_TOOLTIP: Record<LearningMode, {
  schedule: string
  session: string
  chunk: string
}> = {
  ultracram: {
    schedule: '30s → 2h → 1d → 3d',
    session: '15-20 min',
    chunk: '~50-75 words'
  },
  cram: {
    schedule: '2h → 1d → 3d → 7d',
    session: '25-30 min',
    chunk: '~50-75 words'
  },
  steady: {
    schedule: '1d → 3d → 7d → 14d',
    session: '25-30 min',
    chunk: '~75-125 words'
  },
  extended: {
    schedule: '3d → 7d → 14d → 30d',
    session: '30-45 min',
    chunk: '~100-150 words'
  }
}
import { formatNextReview } from '../../utils/formatters'
import { getModeRecommendation } from '../../utils/learningScience'
// import { TopicCard } from './TopicCard' // Will integrate later
// import { LearningItemRow } from './LearningItemRow' // Will integrate later
import { topicsService } from '../../services/topicsFixed'
import { dataService } from '../../services/dataService'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../hooks/useAuthFixed'
import { cacheService } from '../../services/cacheService'
import { spacedRepetitionGamified } from '../../services/spacedRepetitionGamified'
import { gamificationService } from '../../services/gamificationService'
import { GAMIFICATION_CONFIG } from '../../config/gamification'
import { ReviewWindowIndicator } from '../gamification/ReviewWindowIndicator'
import { useAchievements } from '../../hooks/useAchievements'

interface TopicListProps {
  topics: Topic[]
  onDelete?: (topicId: string) => void
  onArchive?: (topicId: string) => void
  onUnarchive?: (topicId: string) => void
  onTopicUpdate?: (topic: Topic) => void
  isArchived?: boolean
  loading?: boolean
}

function TopicListComponent({ topics, onDelete, onArchive, onUnarchive, onTopicUpdate, isArchived = false, loading }: TopicListProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [topicItems, setTopicItems] = useState<Record<string, LearningItem[]>>({})
  const [topicStats, setTopicStats] = useState<Record<string, { total: number; due: number; new: number; archived?: number }>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; topicId: string | null; topicName: string }>({ open: false, topicId: null, topicName: '' })
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ open: boolean; item: LearningItem | null }>({ open: false, item: null })
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editItemContent, setEditItemContent] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [addingItemToTopic, setAddingItemToTopic] = useState<string | null>(null)
  const [newItemContent, setNewItemContent] = useState('')
  const [masteryDialogItem, setMasteryDialogItem] = useState<LearningItem | null>(null)
  const [showArchiveSuggestions, setShowArchiveSuggestions] = useState<Set<string>>(new Set())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [modeTooltipId, setModeTooltipId] = useState<string | null>(null)
  const { addToast } = useToast()
  const { user } = useAuth()
  const { showAchievements } = useAchievements()
  
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
    const cached = cacheService.get<{ total: number; due: number; new: number; archived: number }>(cacheKey)
    
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
        archived: archivedCount 
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
        [topicId]: { total: 0, due: 0, new: 0, archived: 0 }
      }))
    }
  }, [isDue])

  const toggleTopic = useCallback(async (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
      
      // Load items if not already loaded
      if (!topicItems[topicId] && !loadingItems.has(topicId)) {
        setLoadingItems(prev => new Set(prev).add(topicId))
        
        try {
          const { data, error } = await topicsService.getTopicItems(topicId)
          if (error) throw error
          
          setTopicItems(prev => ({ ...prev, [topicId]: data || [] }))
          
          // Update stats after loading items (invalidate cache)
          const items = data || []
          const activeItems = items.filter(item => item.mastery_status !== 'archived')
          const archivedCount = items.filter(item => item.mastery_status === 'archived').length
          const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
          const newCount = activeItems.filter(item => item.review_count === 0).length
          const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount }
          
          // Update cache with fresh data
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
      }
    }
    
    setExpandedTopics(newExpanded)
  }, [expandedTopics, topicItems, loadingItems, addToast, isDue])

  // Load stats for all topics on mount and when topics change
  useEffect(() => {
    const loadAllStats = async () => {
      // Load stats for all topics in parallel for better performance
      const statsPromises = topics.map(topic => loadTopicStats(topic.id))
      await Promise.all(statsPromises)
    }
    
    if (topics.length > 0) {
      loadAllStats()
    }
  }, [topics, loadTopicStats])

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
          (item.mastery_status === 'archived' && item.review_count >= 5) // Only count as mastered if it was reviewed 5+ times
        )
        
        if (allMastered && items.length > 0) {
          suggestions.add(topic.id)
        }
      }
      
      setShowArchiveSuggestions(suggestions)
    }
    
    checkForMasteredTopics()
  }, [topics, topicItems, isArchived, dismissedSuggestions])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      setOpenMenuId(prev => {
        if (prev !== null) {
          return null
        }
        return prev
      })
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, []) // Empty dependency array - listener is stable

  // formatNextReview is now imported from utils/formatters

  // Removed unused function

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

  const handleEditItem = async (item: LearningItem) => {
    if (!editItemContent.trim()) {
      setEditingItem(null)
      return
    }

    try {
      const { error } = await supabase
        .from('learning_items')
        .update({ content: editItemContent.trim() })
        .eq('id', item.id)

      if (error) throw error

      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map(i => 
          i.id === item.id ? { ...i, content: editItemContent.trim() } : i
        )
      }))

      addToast('success', 'Item updated successfully')
      setEditingItem(null)
    } catch {
      addToast('error', 'Failed to update item')
    }
  }

  const handleAddItem = async (topicId: string) => {
    if (!newItemContent.trim() || !user) return

    try {
      const topic = topics.find(t => t.id === topicId)
      if (!topic) return

      const newItem = {
        topic_id: topicId,
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

      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [topicId]: [...(prev[topicId] || []), data]
      }))

      // Update stats
      const items = [...(topicItems[topicId] || []), data]
      const activeItems = items.filter(item => item.mastery_status !== 'archived')
      const archivedCount = items.filter(item => item.mastery_status === 'archived').length
      const dueCount = activeItems.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = activeItems.filter(item => item.review_count === 0).length
      const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount }
      
      setTopicStats(prev => ({
        ...prev,
        [topicId]: stats
      }))
      
      // Update cache with new stats
      const cacheKey = `topic-stats-${topicId}`
      cacheService.set(cacheKey, stats, 60 * 1000)

      addToast('success', 'Item added successfully')
      setAddingItemToTopic(null)
      setNewItemContent('')
      
      // Invalidate global stats cache
      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch {
      addToast('error', 'Failed to add item')
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
      const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount }
      
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

  const handleReviewItem = async (item: LearningItem) => {
    if (!user) return
    
    // Prevent reviewing archived items
    if (item.mastery_status === 'archived') {
      addToast('error', 'Cannot review archived items. Unarchive first to continue reviewing.')
      return
    }
    
    setProcessingItems(prev => new Set(prev).add(item.id))
    
    try {
      const reviewedAt = new Date()
      
      // Calculate next review using gamified service
      const reviewResult = spacedRepetitionGamified.calculateNextReview(item)
      
      // Calculate points
      const pointsBreakdown = gamificationService.calculateReviewPoints(item, reviewedAt)
      const comboBonus = gamificationService.getComboBonus()
      const totalPoints = pointsBreakdown.totalPoints + comboBonus
      
      // Update item
      const updatedItem = {
        ...item,
        review_count: item.review_count + 1,
        last_reviewed_at: reviewedAt.toISOString(),
        next_review_at: reviewResult.nextReviewAt,
        interval_days: reviewResult.intervalDays,
        ease_factor: reviewResult.easeFactor
      }
      
// Update maintenance interval if this is a maintenance item
      const updateData: any = {
        review_count: updatedItem.review_count,
        last_reviewed_at: updatedItem.last_reviewed_at,
        next_review_at: updatedItem.next_review_at,
        interval_days: updatedItem.interval_days,
        ease_factor: updatedItem.ease_factor
      }
      
      if (item.mastery_status === 'maintenance') {
        // Update the maintenance interval for next time (ensure it's an integer)
        updateData.maintenance_interval_days = Math.round(reviewResult.intervalDays)
      }
      
      const { error } = await supabase
        .from('learning_items')
        .update(updateData)
        .eq('id', item.id)
      
      if (error) throw error

      // Record the review session with points
      const { error: sessionError } = await supabase
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
        })

      if (sessionError) throw sessionError
      
      // Update user points and check for achievements
      const result = await gamificationService.updateUserPoints(user.id, totalPoints, {
        itemId: item.id,
        wasPerfectTiming: pointsBreakdown.isPerfectTiming,
        reviewCount: updatedItem.review_count
      })
      
      // Show achievements if any were unlocked
      if (result && result.newAchievements && result.newAchievements.length > 0) {
        showAchievements(result.newAchievements)
      }
      
      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [item.topic_id]: prev[item.topic_id].map(i => 
          i.id === item.id ? updatedItem : i
        )
      }))
      
      // Update stats
      // Use the updated items from the state update above
      const updatedItems = [...(topicItems[item.topic_id] || [])].map(i => 
        i.id === item.id ? updatedItem : i
      )
      // Need to pass the updated item to isDue, not the original
      const activeItems = updatedItems.filter(i => i.mastery_status !== 'archived')
      const archivedCount = updatedItems.filter(i => i.mastery_status === 'archived').length
      const dueCount = activeItems.filter(i => {
        if (i.review_count === 0) return false
        // For the item we just reviewed, check using the updated version
        return isDue(i.id === item.id ? updatedItem : i)
      }).length
      const newCount = activeItems.filter(i => i.review_count === 0).length
      const stats = { total: activeItems.length, due: dueCount, new: newCount, archived: archivedCount }
      
      setTopicStats(prev => ({
        ...prev,
        [item.topic_id]: stats
      }))
      
      // Update cache with new stats
      const cacheKey = `topic-stats-${item.topic_id}`
      cacheService.set(cacheKey, stats, 60 * 1000)
      
      // Show feedback
      const masteryStage = spacedRepetitionGamified.getMasteryStage(updatedItem.review_count)
      let message = `${pointsBreakdown.message} +${totalPoints} points`
      
      if (comboBonus > 0) {
        message += ` (Combo +${comboBonus}!)`
      }
      
      // Only show mastery dialog if item just reached mastery (review_count === 5) and isn't already in maintenance/archived
      const shouldShowMasteryDialog = (reviewResult.isMastered || updatedItem.review_count === 5) && 
          item.mastery_status !== 'maintenance' && 
          item.mastery_status !== ('archived' as MasteryStatus) &&
          item.mastery_status !== 'mastered'
      
      if (shouldShowMasteryDialog) {
        // Show mastery dialog instead of just a toast
        setMasteryDialogItem(updatedItem)
        addToast('success', `🎉 Item mastered! ${masteryStage.emoji} +${GAMIFICATION_CONFIG.MASTERY.bonusPoints} bonus points!`)
      } else if (item.mastery_status === 'maintenance') {
        // Special message for maintenance reviews
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
      
      // Invalidate stats cache
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
        {topics.map((topic, index) => {
        const isExpanded = expandedTopics.has(topic.id)
        const items = topicItems[topic.id] || []
        const stats = topicStats[topic.id] || { total: 0, due: 0, new: 0, archived: 0 }
        
        return (
          <div key={topic.id}>
            {/* Show auto-archive suggestion if all items are mastered */}
            {showArchiveSuggestions.has(topic.id) && !isArchived && (
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
            
            <Card 
              variant="bordered"
              style={{ 
                animationDelay: `${index * 0.05}s`,
              }}
              className="animate-fade-in"
            >
              <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="h4">{topic.name}</h3>
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setModeTooltipId(topic.id)}
                  onMouseLeave={() => setModeTooltipId(null)}
                >
                  <Badge
                    variant={topic.learning_mode === 'cram' || topic.learning_mode === 'ultracram' ? 'warning' : 'info'}
                    style={{ cursor: 'help' }}
                  >
                    {LEARNING_MODES[topic.learning_mode]?.label || 'Steady'}
                  </Badge>
                  {modeTooltipId === topic.id && MODE_TOOLTIP[topic.learning_mode] && (
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
                  {(stats.archived || 0) > 0 && (
                    <div>
                      <p className="body-small text-secondary">Archived</p>
                      <p className="body" style={{ color: 'var(--color-gray-400)' }}>{stats.archived}</p>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    variant="primary" 
                    size="small"
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {isExpanded ? 'Collapse' : 'View Items'}
                  </Button>
                  <div style={{ position: 'relative', zIndex: openMenuId === topic.id ? 10000 : 'auto' }}>
                    <Button 
                      variant="ghost" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === topic.id ? null : topic.id)
                      }}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <MoreVertical size={20} />
                    </Button>
                    {openMenuId === topic.id && (
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
                            setOpenMenuId(null)
                          }}
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
                        {!isArchived && onArchive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              
                              // Check if topic has active (non-archived) items
                              const activeItemCount = stats.total
                              if (activeItemCount > 0) {
                                const confirmArchive = window.confirm(
                                  `This topic has ${activeItemCount} active item${activeItemCount > 1 ? 's' : ''}. ` +
                                  `Archiving the topic will hide it from your main list, but the items will remain active. ` +
                                  `Continue?`
                                )
                                if (!confirmArchive) {
                                  setOpenMenuId(null)
                                  return
                                }
                              }
                              
                              onArchive(topic.id)
                              setOpenMenuId(null)
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
                              setOpenMenuId(null)
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
                              setOpenMenuId(null)
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
                  {loadingItems.has(topic.id) ? (
                    <p className="body-small text-secondary">Loading items...</p>
                  ) : (
                    <>
                      {items.length === 0 && (
                        <p className="body-small text-secondary">No items in this topic</p>
                      )}
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {items.map((item) => {
                        const isProcessing = processingItems.has(item.id)
                        
                        // Check if item is due
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
                              {editingItem === item.id ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <Input
                                    value={editItemContent}
                                    onChange={(e) => setEditItemContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleEditItem(item)
                                      if (e.key === 'Escape') setEditingItem(null)
                                    }}
                                    style={{ flex: 1 }}
                                    autoFocus
                                  />
                                  <Button size="small" onClick={() => handleEditItem(item)}>Save</Button>
                                  <Button size="small" variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <>
                                  <p 
                                    className="body-small" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setEditingItem(item.id)
                                      setEditItemContent(item.content)
                                    }}
                                  >
                                    {item.content}
                                  </p>
                                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', alignItems: 'center' }}>
                                    <span className="body-small text-secondary">
                                      Reviews: {item.review_count}
                                    </span>
                                    {item.next_review_at && item.review_count < GAMIFICATION_CONFIG.MASTERY.reviewsRequired && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {(() => {
                                          const reviewDate = new Date(item.next_review_at)
                                          const now = new Date()
                                          const diffMs = reviewDate.getTime() - now.getTime()
                                          const isDueNow = diffMs <= 0
                                          const timeDisplay = isDueNow ? 'Due now' : `Due in ${formatDuration(diffMs)}`
                                          const exactDate = formatReviewDate(reviewDate)
                                          
                                          return (
                                            <>
                                              <span className="body-small text-secondary" style={{ 
                                                color: isDueNow ? 'var(--color-warning)' : 'var(--color-text-secondary)' 
                                              }}>
                                                {timeDisplay}
                                              </span>
                                              <span className="body-small text-secondary">•</span>
                                              <span className="body-small text-secondary">
                                                {exactDate}
                                              </span>
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
                                                      const mode = item.learning_mode || 'steady' // Default to steady if undefined
                                                      const window = getOptimalReviewWindow(mode)
                                                      const recommendation = getModeRecommendation(mode)
                                                      return (
                                                        <>
                                                          <div style={{ marginBottom: '0.75rem' }}>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '13px' }}>
                                                              📊 Optimal Review Window ({mode})
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
                                            </>
                                          )
                                        })()}
                                      </div>
                                    )}
                                    {item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired && item.mastery_status === 'mastered' && (
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
                              {editingItem !== item.id && (
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
                                      {item.mastery_status === 'mastered' && (
                                        <Button
                                          variant="ghost"
                                          size="small"
                                          onClick={() => setMasteryDialogItem(item)}
                                          style={{ padding: '0.25rem 0.5rem' }}
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
                      
                      {/* Add Item Button */}
                      <div style={{ marginTop: '1rem' }}>
                        {addingItemToTopic === topic.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Input
                              value={newItemContent}
                              onChange={(e) => setNewItemContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddItem(topic.id)
                                if (e.key === 'Escape') {
                                  setAddingItemToTopic(null)
                                  setNewItemContent('')
                                }
                              }}
                              placeholder="Enter item content..."
                              style={{ flex: 1 }}
                              autoFocus
                            />
                            <Button size="small" onClick={() => handleAddItem(topic.id)}>Add</Button>
                            <Button size="small" variant="ghost" onClick={() => {
                              setAddingItemToTopic(null)
                              setNewItemContent('')
                            }}>Cancel</Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => setAddingItemToTopic(topic.id)}
                          >
                            + Add Item
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Show archive insights for archived topics */}
              {isArchived && isExpanded && (
                <ArchiveInsights
                  topicId={topic.id}
                  topicName={topic.name}
                  createdAt={topic.created_at}
                  archiveDate={topic.archive_date}
                />
              )}
            </CardContent>
          </Card>
        </div>
        )
        })}
      </div>

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
                  subject_id: updatedTopic.subject_id
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
        subject_id: subjectId
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