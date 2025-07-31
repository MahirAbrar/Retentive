import { TopicForm } from '@/components/topics/TopicForm'

export function NewTopicPage() {
  return (
    <div>
      <h1 className="h2" style={{ marginBottom: 'var(--space-6)' }}>
        Create New Topic
      </h1>
      <TopicForm />
    </div>
  )
}