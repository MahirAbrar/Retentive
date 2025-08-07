import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardContent, Button, Badge, useToast, ConfirmDialog, Input, Modal } from '../ui'
import type { Topic, LearningItem, LearningMode } from '../../types/database'
import { LEARNING_MODES, PRIORITY_LABELS } from '../../constants/learning'
import { topicsService } from '../../services/topicsFixed'
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
  loading?: boolean
}

export function TopicList({ topics, onDelete, loading }: TopicListProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [topicItems, setTopicItems] = useState<Record<string, LearningItem[]>>({})
  const [topicStats, setTopicStats] = useState<Record<string, { total: number; due: number; new: number }>>({})
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
  const { addToast } = useToast()
  const { user } = useAuth()
  const { showAchievements } = useAchievements()

  // Load item counts for all topics on mount
  useEffect(() => {
    topics.forEach(topic => {
      loadTopicStats(topic.id)
    })
  }, [topics])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenuId])

  const loadTopicStats = async (topicId: string) => {
    try {
      const { data, error } = await topicsService.getTopicItems(topicId)
      if (error) throw error
      
      const items = data || []
      const dueCount = items.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = items.filter(item => item.review_count === 0).length
      
      setTopicStats(prev => ({
        ...prev,
        [topicId]: { total: items.length, due: dueCount, new: newCount }
      }))
    } catch (error) {
      console.error('Error loading topic stats:', error)
    }
  }

  const toggleTopic = async (topicId: string) => {
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
          
          // Update stats after loading items
          const items = data || []
          const dueCount = items.filter(item => item.review_count > 0 && isDue(item)).length
          const newCount = items.filter(item => item.review_count === 0).length
          setTopicStats(prev => ({
            ...prev,
            [topicId]: { total: items.length, due: dueCount, new: newCount }
          }))
        } catch (error) {
          addToast('error', 'Failed to load items')
          console.error('Error loading items:', error)
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
  }


  const formatNextReview = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMinutes < 60) return `${diffMinutes} minutes`
    if (diffHours < 24) return `${diffHours} hours`
    if (diffDays === 1) return 'tomorrow'
    if (diffDays < 7) return `in ${diffDays} days`
    return date.toLocaleDateString()
  }

  const getItemStatus = (item: LearningItem) => {
    // For items that have never been studied, show "Ready to learn" instead of due dates
    if (item.review_count === 0) {
      return { label: 'Ready to learn', color: 'var(--color-info)' }
    }
    
    if (!item.next_review_at) return { label: 'New', color: 'var(--color-info)' }
    
    const now = new Date()
    const reviewDate = new Date(item.next_review_at)
    
    if (reviewDate < now) return { label: 'Overdue', color: 'var(--color-error)' }
    if (reviewDate.toDateString() === now.toDateString()) return { label: 'Due today', color: 'var(--color-warning)' }
    return { label: formatNextReview(item.next_review_at), color: 'var(--color-success)' }
  }

  const isDue = (item: LearningItem) => {
    // New items (never studied) are not considered "due" - they're ready to learn
    if (item.review_count === 0) return false
    
    const dueItems = spacedRepetitionGamified.getDueItems([item])
    return dueItems.length > 0
  }

  // Removed unused function

  const handleDeleteTopic = async () => {
    if (!deleteConfirm.topicId || !onDelete) return
    
    try {
      await onDelete(deleteConfirm.topicId)
      addToast('success', 'Topic deleted successfully')
      setDeleteConfirm({ open: false, topicId: null, topicName: '' })
    } catch (error) {
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
    } catch (error) {
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
        priority: topic.priority, // Inherit priority from topic
        learning_mode: topic.learning_mode, // Inherit learning mode from topic
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
        console.error('Error adding item:', error)
        throw error
      }

      // Update local state
      setTopicItems(prev => ({
        ...prev,
        [topicId]: [...(prev[topicId] || []), data]
      }))

      // Update stats
      const items = [...(topicItems[topicId] || []), data]
      const dueCount = items.filter(item => item.review_count > 0 && isDue(item)).length
      const newCount = items.filter(item => item.review_count === 0).length
      setTopicStats(prev => ({
        ...prev,
        [topicId]: { total: items.length, due: dueCount, new: newCount }
      }))

      addToast('success', 'Item added successfully')
      setAddingItemToTopic(null)
      setNewItemContent('')
      
      // Invalidate stats cache
      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch (error) {
      addToast('error', 'Failed to add item')
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemConfirm.item) return
    
    const item = deleteItemConfirm.item
    try {
      // Cancel any scheduled notification for this item
      if (window.electronAPI?.notifications) {
        await window.electronAPI.notifications.cancel('item', { itemId: item.id })
      }
      
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
      const dueCount = newItems.filter(i => i.review_count > 0 && isDue(i)).length
      const newCount = newItems.filter(i => i.review_count === 0).length
      setTopicStats(prev => ({
        ...prev,
        [item.topic_id]: { total: newItems.length, due: dueCount, new: newCount }
      }))

      addToast('success', 'Item deleted successfully')
      setDeleteItemConfirm({ open: false, item: null })
      
      // Invalidate stats cache
      if (user) cacheService.invalidate(`stats:${user.id}`)
    } catch (error) {
      addToast('error', 'Failed to delete item')
    }
  }

  const handleReviewItem = async (item: LearningItem) => {
    if (!user) return
    
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
      
      // Cancel any existing notification for this item (in case it was reviewed early)
      if (window.electronAPI?.notifications) {
        await window.electronAPI.notifications.cancel('item', { itemId: item.id })
      }
      
      // Schedule notification for next review if not mastered
      if (updatedItem.next_review_at && updatedItem.review_count < GAMIFICATION_CONFIG.MASTERY.reviewsRequired) {
        const topic = topics.find(t => t.id === item.topic_id)
        if (topic && window.electronAPI?.notifications) {
          await window.electronAPI.notifications.schedule('item-due', {
            userId: user.id,
            itemId: item.id,
            itemContent: item.content,
            topicName: topic.name,
            topicId: topic.id,
            dueAt: updatedItem.next_review_at
          })
          console.log(`Scheduled notification for item ${item.id} at ${updatedItem.next_review_at}`)
        }
      }
      
      const { error } = await supabase
        .from('learning_items')
        .update({
          review_count: updatedItem.review_count,
          last_reviewed_at: updatedItem.last_reviewed_at,
          next_review_at: updatedItem.next_review_at,
          interval_days: updatedItem.interval_days,
          ease_factor: updatedItem.ease_factor
        })
        .eq('id', item.id)
      
      if (error) throw error

      // Record the review session with points
      const { error: sessionError } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          learning_item_id: item.id,
          difficulty: 'good',
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
      const dueCount = updatedItems.filter(i => {
        if (i.review_count === 0) return false
        // For the item we just reviewed, check using the updated version
        return isDue(i.id === item.id ? updatedItem : i)
      }).length
      const newCount = updatedItems.filter(i => i.review_count === 0).length
      setTopicStats(prev => ({
        ...prev,
        [item.topic_id]: { total: updatedItems.length, due: dueCount, new: newCount }
      }))
      
      // Show feedback
      const masteryStage = spacedRepetitionGamified.getMasteryStage(updatedItem.review_count)
      let message = `${pointsBreakdown.message} +${totalPoints} points`
      
      if (comboBonus > 0) {
        message += ` (Combo +${comboBonus}!)`
      }
      
      if (reviewResult.isMastered) {
        addToast('success', `🎉 Item mastered! ${masteryStage.emoji} +${GAMIFICATION_CONFIG.MASTERY.bonusPoints} bonus points!`)
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
    } catch (error) {
      addToast('error', 'Failed to update review')
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
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
        const stats = topicStats[topic.id] || { total: 0, due: 0, new: 0 }
        
        return (
          <Card 
            key={topic.id} 
            variant="bordered"
            style={{ 
              animationDelay: `${index * 0.05}s`,
            }}
            className="animate-fade-in"
          >
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="h4">{topic.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Badge variant={topic.learning_mode === 'cram' ? 'warning' : 'info'}>
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
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {isExpanded ? 'Collapse' : 'View Items'}
                  </Button>
                  <div style={{ position: 'relative' }}>
                    <Button 
                      variant="ghost" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === topic.id ? null : topic.id)
                      }}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '1.2rem' }}
                    >
                      ⋮
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
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 10,
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
                        const status = getItemStatus(item)
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
                                    <span className="body-small" style={{ color: status.color }}>
                                      {status.label}
                                    </span>
                                    <span className="body-small text-secondary">
                                      {spacedRepetitionGamified.getMasteryStage(item.review_count).emoji} {spacedRepetitionGamified.getMasteryStage(item.review_count).label}
                                    </span>
                                    <span className="body-small text-secondary" style={{ opacity: 0.7 }}>
                                      {item.review_count > 0 && `${item.review_count} review${item.review_count !== 1 ? 's' : ''}`}
                                      {item.review_count === 0 && 'Never reviewed'}
                                    </span>
                                    <ReviewWindowIndicator item={item} />
                                  </div>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {editingItem !== item.id && (
                                <>
                                  {(itemIsDue || item.review_count === 0) ? (
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
                                    <span className="body-small" style={{ color: 'var(--color-success)' }}>
                                      {item.review_count >= GAMIFICATION_CONFIG.MASTERY.reviewsRequired ? '✓ Mastered' : formatNextReview(item.next_review_at || '')}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => setDeleteItemConfirm({ open: true, item })}
                                    style={{ padding: '0.25rem 0.5rem' }}
                                  >
                                    ×
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
                              placeholder="Enter subtopic content..."
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
                            + Add Subtopic
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
        title="Delete Subtopic"
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
              const { error } = await supabase
                .from('topics')
                .update({
                  name: updatedTopic.name,
                  learning_mode: updatedTopic.learning_mode,
                  priority: updatedTopic.priority
                })
                .eq('id', updatedTopic.id)

              if (error) throw error

              addToast('success', 'Topic updated successfully')
              setEditingTopic(null)
              // Refresh topics list
              window.location.reload()
            } catch (error) {
              addToast('error', 'Failed to update topic')
            }
          }}
        />
      )}
    </>
  )
}

// Edit Topic Modal Component
interface EditTopicModalProps {
  topic: Topic
  onClose: () => void
  onSave: (topic: Topic) => void
}

function EditTopicModal({ topic, onClose, onSave }: EditTopicModalProps) {
  const [name, setName] = useState(topic?.name || '')
  const [learningMode, setLearningMode] = useState<LearningMode>(topic?.learning_mode || 'steady')
  const [priority, setPriority] = useState(topic?.priority || 5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (topic) {
      onSave({
        ...topic,
        name: name.trim(),
        learning_mode: learningMode,
        priority
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

          <div>
            <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Learning Mode
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {Object.entries(LEARNING_MODES).map(([mode, config]) => (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="learningMode"
                    value={mode}
                    checked={learningMode === mode}
                    onChange={(e) => setLearningMode(e.target.value as LearningMode)}
                  />
                  <span className="body">{config.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="body" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Priority: {priority} - {PRIORITY_LABELS[priority]}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{ width: '100%' }}
            />
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