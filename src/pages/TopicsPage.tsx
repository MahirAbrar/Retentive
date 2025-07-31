import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, useToast, Input } from '../components/ui'
import { TopicList } from '../components/topics/TopicList'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import type { Topic } from '../types/database'

interface TopicWithStats extends Topic {
  itemCount: number
  dueCount: number
  lastStudiedAt?: string
}

export function TopicsPage() {
  const [topics, setTopics] = useState<TopicWithStats[]>([])
  const [filteredTopics, setFilteredTopics] = useState<TopicWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'due' | 'upcoming' | 'mastered'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'dueItems' | 'priority' | 'lastStudied'>('name')
  const { user } = useAuth()
  const { addToast } = useToast()

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
          const dueCount = itemsList.filter(item => 
            !item.next_review_at || new Date(item.next_review_at) <= now
          ).length
          
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
            lastStudiedAt
          } as TopicWithStats
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
      filtered = filtered.filter(topic => 
        topic.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(topic => {
        switch (filterBy) {
          case 'due':
            return topic.dueCount > 0
          case 'upcoming':
            return topic.dueCount === 0 && topic.itemCount > 0
          case 'mastered':
            return topic.itemCount > 0 && topic.dueCount === 0 && topic.lastStudiedAt
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
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-background)',
                fontSize: 'var(--text-sm)'
              }}
            >
              <option value="all">All Topics</option>
              <option value="due">Has Due Items</option>
              <option value="upcoming">Upcoming</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="body-small text-secondary">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-background)',
                fontSize: 'var(--text-sm)'
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
        topics={filteredTopics} 
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  )
}