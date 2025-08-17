import './App.css'
import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './hooks/useAuthFixed'
import { ThemeProvider } from './contexts/ThemeContext'
import { AchievementProvider } from './hooks/useAchievements'
import { syncService } from './services/syncService'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { OfflineDisclaimer } from './components/OfflineDisclaimer'
import { HeaderFixed } from './components/layout/HeaderFixed'
import { WebDisclaimer } from './components/WebDisclaimer'

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('./pages/LoginPageFixed').then(m => ({ default: m.LoginPage })))
const TopicsPage = lazy(() => import('./pages/TopicsPage').then(m => ({ default: m.TopicsPage })))
const NewTopicPage = lazy(() => import('./pages/NewTopicPage').then(m => ({ default: m.NewTopicPage })))
const TopicDetailView = lazy(() => import('./pages/TopicDetailView').then(m => ({ default: m.TopicDetailView })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const TestGamificationPage = lazy(() => import('./pages/TestGamificationPage').then(m => ({ default: m.TestGamificationPage })))
const DarkModeTest = lazy(() => import('./pages/DarkModeTest').then(m => ({ default: m.DarkModeTest })))
const TestGamificationPersistence = lazy(() => import('./pages/TestGamificationPersistence').then(m => ({ default: m.TestGamificationPersistence })))
const TestAchievements = lazy(() => import('./pages/TestAchievements').then(m => ({ default: m.TestAchievements })))

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh' 
  }}>
    <div className="body">Loading...</div>
  </div>
)

function App() {
  // Initialize sync service on app load
  useEffect(() => {
    // Sync pending operations if online
    if (navigator.onLine) {
      syncService.syncPendingOperations()
    }
  }, [])
  
  // Check if running in Electron
  // In development, Electron loads from localhost but has electronAPI
  // In production, it uses file:// protocol
  // Check for Electron user agent or electronAPI availability
  // const isElectron = !!window.electronAPI || 
  //                    window.navigator.userAgent.includes('Electron') ||
  //                    window.location.protocol === 'file:'

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <ToastProvider>
            <AuthProvider>
              <AchievementProvider>
                <div style={{ minHeight: '100vh' }}>
                  <WebDisclaimer />
                  <OfflineDisclaimer />
                  <HeaderFixed />

                  <main style={{ padding: 'var(--space-8) var(--space-4)' }}>
                    <Suspense fallback={<PageLoader />}>
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
                  <Route
                    path="/test-gamification"
                    element={
                      <ProtectedRoute>
                        <TestGamificationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dark-mode-test"
                    element={<DarkModeTest />}
                  />
                  <Route
                    path="/test-persistence"
                    element={
                      <ProtectedRoute>
                        <TestGamificationPersistence />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test-achievements"
                    element={
                      <ProtectedRoute>
                        <TestAchievements />
                      </ProtectedRoute>
                    }
                  />
                      </Routes>
                    </Suspense>
                  </main>
            </div>
            <OfflineIndicator />
          </AchievementProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
    </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
