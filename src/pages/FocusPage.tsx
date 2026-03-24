import { FocusTimer } from '../components/focus/FocusTimer'

export function FocusPage() {
  return (
    <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2">Focus Timer</h1>
        <p className="body text-secondary">
          A pomodoro timer to use alongside your study sessions
        </p>
      </header>
      <FocusTimer />
    </div>
  )
}
