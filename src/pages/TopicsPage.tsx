import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, useToast } from '../components/ui'
import { TopicList } from '../components/topics/TopicList'
import { useAuth } from '../hooks/useAuthFixed'
import { topicsService } from '../services/topicsFixed'
import type { Topic } from '../types/database'

export function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { addToast } = useToast()

  useEffect(() => {
    if (user) {
      loadTopics()
    }
  }, [user])

  const loadTopics = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await topicsService.getTopics(user.id)
      if (error) {
        addToast('error', 'Failed to load topics')
      } else {
        setTopics(data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This will also delete all its items.')) {
      return
    }

    const { error } = await topicsService.deleteTopic(topicId)
    if (error) {
      addToast('error', 'Failed to delete topic')
    } else {
      addToast('success', 'Topic deleted successfully')
      setTopics(topics.filter(t => t.id !== topicId))
    }
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

      <TopicList 
        topics={topics} 
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  )
}