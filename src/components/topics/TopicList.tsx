import { Link } from 'react-router-dom'
import { Card, CardHeader, CardContent, Button, Badge } from '../ui'
import type { Topic } from '../../types/database'
import { LEARNING_MODES, PRIORITY_LABELS } from '../../constants/learning'

interface TopicListProps {
  topics: Topic[]
  onDelete?: (topicId: string) => void
  loading?: boolean
}

export function TopicList({ topics, onDelete, loading }: TopicListProps) {
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
    <div style={{ display: 'grid', gap: '1rem' }}>
      {topics.map((topic) => (
        <Card key={topic.id} variant="bordered">
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
                  <p className="body">0</p>
                </div>
                <div>
                  <p className="body-small text-secondary">Due</p>
                  <p className="body">0</p>
                </div>
                <div>
                  <p className="body-small text-secondary">Overdue</p>
                  <p className="body">0</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/topics/${topic.id}`}>
                  <Button variant="ghost" size="small">View</Button>
                </Link>
                <Link to={`/topics/${topic.id}/study`}>
                  <Button variant="primary" size="small">Study</Button>
                </Link>
                {onDelete && (
                  <Button 
                    variant="ghost" 
                    size="small"
                    onClick={() => onDelete(topic.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}