import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Button, useToast, Input, Pagination, PaginationInfo, Loading } from '../components/ui'
import { useAuth } from '../hooks/useAuthFixed'

// Lazy load TopicList - it's a large component (~50KB)
const TopicList = lazy(() => import('../components/topics/TopicList').then(m => ({ default: m.TopicList })))
import { topicsService } from '../services/topicsFixed'
import { dataService } from '../services/dataService'
import { usePagination } from '../hooks/usePagination'
import { cacheService } from '../services/cacheService'
import { realtimeService } from '../services/realtimeService'
import type { Topic, LearningItem } from '../types/database'
import { RefreshCw } from 'lucide-react'

interface TopicWithStats extends Topic {
  itemCount: number
  dueCount: number
  newCount: number
  masteredCount: number
  lastStudiedAt?: string
  items?: LearningItem[]
}

export function TopicsPage() {
  const [topics, setTopics] = useState<TopicWithStats[]>([])
  const [archivedTopics, setArchivedTopics] = useState<TopicWithStats[]>([])
  const [filteredTopics, setFilteredTopics] = useState<TopicWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'due' | 'new' | 'upcoming' | 'mastered'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'dueItems' | 'lastStudied'>('name')
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const { user } = useAuth()
  const { addToast } = useToast()
  const initialLoadDone = useRef(false)
  
  // Pagination
  const {
    currentPage,
    totalPages,
    currentItems,
    isFirstPage,
    isLastPage,
    nextPage,
    previousPage,
    goToPage,
    setItemsPerPage,
    itemsPerPage,
    startIndex,
    endIndex
  } = usePagination(filteredTopics, { itemsPerPage: 10 })

  const loadTopics = useCallback(async (forceRefresh = false) => {
    if (!user) return

    const cacheKey = `topics:${user.id}`

    // Stale-while-revalidate: Get cached data even if stale
    const { data: cached, isStale } = cacheService.getWithMeta<TopicWithStats[]>(cacheKey)

    // If we have cached data, show it immediately (unless forcing refresh)
    if (cached && !forceRefresh) {
      setTopics(cached)
      setLoading(false)

      // If data is fresh, we're done - no need to refetch
      if (!isStale) return

      // If stale, continue to fetch fresh data silently (no loading spinner)
    } else {
      // No cache or force refresh - show loading spinner
      setLoading(true)
    }

    try {
      const { data: topicsData, error: topicsError } = await topicsService.getTopics(user.id)
      if (topicsError) {
        addToast('error', 'Failed to load topics')
        return
      }

      // Load stats for each topic
      // Filter out archived topics for active tab
      const activeTopics = (topicsData || []).filter(topic => 
        !topic.archive_status || topic.archive_status === 'active'
      )
      
      const topicsWithStats = await Promise.all(
        activeTopics.map(async (topic) => {
          const { data: items } = await topicsService.getTopicItems(topic.id)
          const itemsList = items || []
          
          // Calculate stats
          const now = new Date()
          
          // New items: never reviewed (review_count = 0)
          const newCount = itemsList.filter(item => item.review_count === 0).length
          
          // Due items: have been reviewed at least once AND are due now (excluding new items)
          const dueCount = itemsList.filter(item => 
            item.review_count > 0 && 
            item.next_review_at && 
            new Date(item.next_review_at) <= now
          ).length
          
          // Mastered items: review_count >= 5 (based on GAMIFICATION_CONFIG)
          const masteredCount = itemsList.filter(item => item.review_count >= 5).length

          // Find last studied date
          const lastStudiedAt = itemsList
            .filter(item => item.last_reviewed_at)
            .sort((a, b) => {
              const aTime = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0
              const bTime = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0
              return bTime - aTime
            })[0]?.last_reviewed_at
          
          return {
            ...topic,
            itemCount: itemsList.length,
            dueCount,
            newCount,
            masteredCount,
            lastStudiedAt,
            items: itemsList // Store items for search
          } as TopicWithStats & { items: typeof itemsList }
        })
      )
      
      setTopics(topicsWithStats)
      
      // Cache the results for 5 minutes
      cacheService.set(cacheKey, topicsWithStats, 5 * 60 * 1000)
    } finally {
      setLoading(false)
    }
  }, [user, addToast])

  const loadArchivedTopics = useCallback(async (forceRefresh = false) => {
    if (!user) return

    const cacheKey = `archived_topics:${user.id}`

    // Stale-while-revalidate: Get cached data even if stale
    const { data: cached, isStale } = cacheService.getWithMeta<TopicWithStats[]>(cacheKey)

    // If we have cached data, show it immediately (unless forcing refresh)
    if (cached && !forceRefresh) {
      setArchivedTopics(cached)
      setLoading(false)

      // If data is fresh, we're done
      if (!isStale) return

      // If stale, continue to fetch fresh data silently
    } else {
      setLoading(true)
    }

    try {
      const { data: topicsData, error: topicsError } = await dataService.getArchivedTopics(user.id)
      if (topicsError) {
        addToast('error', 'Failed to load archived topics')
        return
      }

      // Load stats for each archived topic
      const topicsWithStats = await Promise.all(
        (topicsData || []).map(async (topic) => {
          const { data: items } = await topicsService.getTopicItems(topic.id)
          const itemsList = items || []
          
          // Calculate stats for archived topics
          const masteredCount = itemsList.filter(item => 
            item.mastery_status === 'mastered' || 
            item.mastery_status === 'maintenance' ||
            item.review_count >= 5
          ).length
          
          const archivedCount = itemsList.filter(item => 
            item.mastery_status === 'archived'
          ).length
          
          // Find last studied date
          const lastStudiedAt = itemsList
            .filter(item => item.last_reviewed_at)
            .sort((a, b) => {
              const aTime = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0
              const bTime = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0
              return bTime - aTime
            })[0]?.last_reviewed_at
          
          return {
            ...topic,
            itemCount: itemsList.length,
            dueCount: 0, // Archived topics don't have due items
            newCount: 0,
            masteredCount,
            archivedCount,
            lastStudiedAt,
            items: itemsList
          } as TopicWithStats & { items: typeof itemsList; archivedCount: number }
        })
      )
      
      setArchivedTopics(topicsWithStats)
      
      // Cache the results for 5 minutes
      cacheService.set(cacheKey, topicsWithStats, 5 * 60 * 1000)
    } finally {
      setLoading(false)
    }
  }, [user, addToast])

  const handleDelete = useCallback(async (topicId: string) => {
    const { error } = await topicsService.deleteTopic(topicId)
    if (error) {
      addToast('error', 'Failed to delete topic')
    } else {
      setTopics(topics.filter((t: any) => t.id !== topicId))
      setArchivedTopics(archivedTopics.filter((t: any) => t.id !== topicId))
      // Invalidate cache when topic is deleted
      if (user) {
        cacheService.invalidate(`topics:${user.id}`)
        cacheService.invalidate(`archived_topics:${user.id}`)
      }
    }
  }, [topics, archivedTopics, user, addToast])

  const handleArchive = useCallback(async (topicId: string) => {
    const { error } = await dataService.archiveTopic(topicId)
    if (error) {
      addToast('error', 'Failed to archive topic')
    } else {
      addToast('success', 'Topic archived successfully')
      // Small delay to ensure database is updated
      setTimeout(() => {
        // Refresh both lists with force refresh
        loadTopics(true)
        loadArchivedTopics(true)
      }, 100)
    }
  }, [addToast, loadTopics, loadArchivedTopics])

  const handleUnarchive = useCallback(async (topicId: string) => {
    const { error } = await dataService.unarchiveTopic(topicId)
    if (error) {
      addToast('error', 'Failed to restore topic')
    } else {
      addToast('success', 'Topic restored successfully')
      // Small delay to ensure database is updated
      setTimeout(() => {
        // Refresh both lists with force refresh
        loadTopics(true)
        loadArchivedTopics(true)
      }, 100)
    }
  }, [addToast, loadTopics, loadArchivedTopics])

  const filterAndSortTopics = useCallback(() => {
    // Use appropriate topics based on active tab
    let filtered = activeTab === 'active' ? [...topics] : [...archivedTopics]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(topic => 
        // Search in topic name
        topic.name.toLowerCase().includes(query) ||
        // Search in subtopic content
        (topic.items && topic.items.some((item: any) =>
          item.content.toLowerCase().includes(query)
        ))
      )
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(topic => {
        switch (filterBy) {
          case 'due':
            return topic.dueCount > 0  // Only shows topics with actually due items (not new)
          case 'new':
            return topic.newCount > 0  // Shows topics with new items
          case 'upcoming':
            return topic.dueCount === 0 && topic.itemCount > 0 && topic.newCount < topic.itemCount
          case 'mastered':
            return topic.masteredCount > 0  // Shows topics with at least one mastered item
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'dueItems':
          return b.dueCount - a.dueCount
        case 'lastStudied':
          // Sort by last studied date (most recent first)
          if (!a.lastStudiedAt && !b.lastStudiedAt) return 0
          if (!a.lastStudiedAt) return 1
          if (!b.lastStudiedAt) return -1
          return new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime()
        default:
          return 0
      }
    })

    setFilteredTopics(filtered)
  }, [activeTab, topics, archivedTopics, searchQuery, filterBy, sortBy])

  // Initial load - only runs once per user session
  useEffect(() => {
    if (!user) return

    // Only load on initial mount, not on every dependency change
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      loadTopics()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load archived topics when tab changes to archived
  useEffect(() => {
    if (user && activeTab === 'archived') {
      loadArchivedTopics()
    }
  }, [user, activeTab, loadArchivedTopics])

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!user) return

    const unsubscribe = realtimeService.subscribeToTopics(user.id, {
      onInsert: () => {
        // New topic added - invalidate cache and refresh
        cacheService.delete(`topics:${user.id}`)
        loadTopics(true)
      },
      onUpdate: (topic) => {
        // Update the specific topic in state
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, ...topic } : t))
        // Also invalidate cache so next load gets fresh data
        cacheService.delete(`topics:${user.id}`)
      },
      onDelete: (topic) => {
        // Remove topic from state
        setTopics(prev => prev.filter(t => t.id !== topic.id))
        cacheService.delete(`topics:${user.id}`)
      },
      onError: (error) => {
        console.error('Realtime topics error:', error)
      }
    })

    return () => unsubscribe()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterAndSortTopics()
  }, [filterAndSortTopics])

  return (
    <div style={{ maxWidth: 'var(--container-lg)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="h2">My Topics</h1>
          <Link to="/topics/new">
            <Button variant="primary">New Topic</Button>
          </Link>
        </div>
        <p className="body text-secondary" style={{ marginTop: '0.5rem' }}>
          Organize your learning into topics and track progress
        </p>
      </header>

      {/* Active/Archived Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid var(--color-border)'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'active' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'active' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'active' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="body"
        >
          Active Topics
          <span style={{ 
            marginLeft: '0.5rem',
            fontSize: '0.875rem',
            opacity: 0.7
          }}>
            ({topics.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'archived' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
            color: activeTab === 'archived' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'archived' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          className="body"
        >
          Archived
          <span style={{ 
            marginLeft: '0.5rem',
            fontSize: '0.875rem',
            opacity: 0.7
          }}>
            ({archivedTopics.length})
          </span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            style={{ flex: '1', minWidth: '200px' }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="body-small text-secondary">Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Topics</option>
              <option value="due">Has Due Items</option>
              <option value="new">Has New Items</option>
              <option value="upcoming">Upcoming</option>
              <option value="mastered">Has Mastered Items</option>
            </select>
          </div>

          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              if (activeTab === 'active') {
                loadTopics(true)
              } else {
                loadArchivedTopics(true)
              }
            }}
            disabled={loading}
            style={{ padding: '0.5rem 1rem' }}
            title="Refresh topics"
          >
            <RefreshCw size={16} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
            Refresh
          </Button>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="body-small text-secondary">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer'
              }}
            >
              <option value="name">Name</option>
              <option value="dueItems">Due Items</option>
              <option value="lastStudied">Last Studied</option>
            </select>
          </div>

          {(searchQuery || filterBy !== 'all') && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                setSearchQuery('')
                setFilterBy('all')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        
        {/* Results count */}
        {(searchQuery || filterBy !== 'all') && (
          <p className="body-small text-secondary" style={{ marginTop: '0.5rem' }}>
            Showing {filteredTopics.length} of {activeTab === 'active' ? topics.length : archivedTopics.length} topics
          </p>
        )}
      </div>

      <Suspense fallback={<Loading text="Loading topics..." />}>
        <TopicList
          topics={currentItems}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          isArchived={activeTab === 'archived'}
          loading={loading}
        />
      </Suspense>
      
      {/* Pagination Controls */}
      {filteredTopics.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <PaginationInfo 
            startIndex={startIndex} 
            endIndex={endIndex} 
            totalItems={filteredTopics.length} 
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            isFirstPage={isFirstPage}
            isLastPage={isLastPage}
            onNext={nextPage}
            onPrevious={previousPage}
          />
          
          {/* Items per page selector */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginTop: '1rem'
          }}>
            <label className="body-small text-secondary">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer'
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}