import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { ToastProvider, Button } from './components/ui'
import { AuthProvider, useAuth } from './hooks/useAuthFixed'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPageFixed'
import { ComponentShowcase } from './components/ComponentShowcase'
import { TopicsPage } from './pages/TopicsPage'
import { NewTopicPage } from './pages/NewTopicPage'
import { TopicDetailView } from './pages/TopicDetailView'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function Header() {
  const { user, signOut } = useAuth()
  
  return (
    <header style={{ 
      borderBottom: '1px solid var(--color-gray-200)', 
      padding: 'var(--space-4)',
      backgroundColor: 'var(--color-surface)'
    }}>
      <div style={{ 
        maxWidth: 'var(--container-xl)', 
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 className="h4" style={{ margin: 0 }}>Retentive</h1>
        </Link>
        <nav style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>Home</Link>
          <Link to="/components" style={{ textDecoration: 'none' }}>Components</Link>
          {user ? (
            <>
              <Link to="/topics" style={{ textDecoration: 'none' }}>Topics</Link>
              <Link to="/stats" style={{ textDecoration: 'none' }}>Stats</Link>
              <Link to="/settings" style={{ textDecoration: 'none' }}>Settings</Link>
              <span className="body-small text-secondary">{user.email}</span>
              <Button variant="ghost" size="small" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="small">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div style={{ minHeight: '100vh' }}>
            <Header />
        
        <main style={{ padding: 'var(--space-8) var(--space-4)' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/components" element={<ComponentShowcase />} />
            <Route path="/topics" element={
              <ProtectedRoute>
                <TopicsPage />
              </ProtectedRoute>
            } />
            <Route path="/topics/new" element={
              <ProtectedRoute>
                <NewTopicPage />
              </ProtectedRoute>
            } />
            <Route path="/topics/:topicId" element={
              <ProtectedRoute>
                <TopicDetailView />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/stats" element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App