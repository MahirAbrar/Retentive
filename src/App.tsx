import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './hooks/useAuthFixed'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPageFixed'
// import { ComponentShowcase } from './components/ComponentShowcase'
import { TopicsPage } from './pages/TopicsPage'
import { NewTopicPage } from './pages/NewTopicPage'
import { TopicDetailView } from './pages/TopicDetailView'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { HeaderFixed } from './components/layout/HeaderFixed'

function App() {
  // Check if running in Electron
  // In development, Electron loads from localhost but has electronAPI
  // In production, it uses file:// protocol
  // Check for Electron user agent or electronAPI availability
  const isElectron = !!window.electronAPI || 
                     window.navigator.userAgent.includes('Electron') ||
                     window.location.protocol === 'file:'
  
  // Only show the warning if we're definitely in a web browser
  if (!isElectron && !window.navigator.userAgent.includes('Electron')) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 className="h1" style={{ marginBottom: '1rem' }}>Desktop App Required</h1>
          <p className="body" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
            Retentive is a desktop application for spaced repetition learning. 
            Please download and install the desktop app to use all features.
          </p>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--color-gray-100)', 
            borderRadius: 'var(--radius-md)',
            marginTop: '2rem'
          }}>
            <p className="body-small text-secondary">
              Features available only in the desktop app:
            </p>
            <ul style={{ textAlign: 'left', marginTop: '0.5rem' }} className="body-small">
              <li>Study reminders and notifications</li>
              <li>Secure offline storage</li>
              <li>Background sync</li>
              <li>System integration</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <div style={{ minHeight: '100vh' }}>
              <HeaderFixed />

              <main style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/callback" element={<ResetPasswordPage />} />
                  {/* <Route path="/components" element={<ComponentShowcase />} /> */}
                  <Route
                    path="/topics"
                    element={
                      <ProtectedRoute>
                        <TopicsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topics/new"
                    element={
                      <ProtectedRoute>
                        <NewTopicPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topics/:topicId"
                    element={
                      <ProtectedRoute>
                        <TopicDetailView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stats"
                    element={
                      <ProtectedRoute>
                        <StatsPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
            <OfflineIndicator />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
