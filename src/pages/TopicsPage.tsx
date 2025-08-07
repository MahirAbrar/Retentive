import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, useToast, Input, Pagination, PaginationInfo } from '../components/ui'
import { TopicList } from '../components/topics/TopicList'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import { usePagination } from '../hooks/usePagination'
import type { Topic, LearningItem } from '../types/database'

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
  const [filteredTopics, setFilteredTopics] = useState<TopicWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'due' | 'new' | 'upcoming' | 'mastered'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'dueItems' | 'priority' | 'lastStudied'>('name')
  const { user } = useAuth()
  const { addToast } = useToast()
  
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

  useEffect(() => {
    if (user) {
      loadTopics()
    }
  }, [user])

  useEffect(() => {
    filterAndSortTopics()
  }, [topics, searchQuery, filterBy, sortBy])

  const loadTopics = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: topicsData, error: topicsError } = await topicsService.getTopics(user.id)
      if (topicsError) {
        addToast('error', 'Failed to load topics')
        return
      }

      // Load stats for each topic
      const topicsWithStats = await Promise.all(
        (topicsData || []).map(async (topic) => {
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
            .sort((a, b) => 
              new Date(b.last_reviewed_at!).getTime() - new Date(a.last_reviewed_at!).getTime()
            )[0]?.last_reviewed_at
          
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
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (topicId: string) => {
    const { error } = await topicsService.deleteTopic(topicId)
    if (error) {
      addToast('error', 'Failed to delete topic')
    } else {
      setTopics(topics.filter(t => t.id !== topicId))
    }
  }

  const filterAndSortTopics = () => {
    let filtered = [...topics]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(topic => 
        // Search in topic name
        topic.name.toLowerCase().includes(query) ||
        // Search in subtopic content
        (topic.items && topic.items.some(item => 
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
        case 'priority':
          return b.priority - a.priority
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
  }

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

      {/* Search and Filter Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              <option value="priority">Priority</option>
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
            Showing {filteredTopics.length} of {topics.length} topics
          </p>
        )}
      </div>

      <TopicList 
        topics={currentItems} 
        onDelete={handleDelete}
        loading={loading}
      />
      
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