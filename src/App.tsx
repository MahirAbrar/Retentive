import './App.css'
import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './hooks/useAuthFixed'
import { ThemeProvider } from './contexts/ThemeContext'
import { AchievementProvider } from './hooks/useAchievements'
import { syncService } from './services/syncService'
import { networkRecovery } from './services/networkRecovery'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { OfflineDisclaimer } from './components/OfflineDisclaimer'
import { HeaderFixed } from './components/layout/HeaderFixed'
import { WebDisclaimer } from './components/WebDisclaimer'
import { TrialBanner } from './components/TrialBanner'
import { AccessGuard } from './components/AccessGuard'
import { clearAuthCache } from './utils/clearAuthCache'

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
const PaywallPage = lazy(() => import('./pages/PaywallPage').then(m => ({ default: m.PaywallPage })))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })))

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
  // Initialize services on app load
  useEffect(() => {
    // Initialize network recovery service (sets up listeners automatically)
    // This ensures auth tokens are refreshed when computer wakes from sleep
    networkRecovery // Service initializes on import

    // Sync pending operations if online
    if (navigator.onLine) {
      syncService.syncPendingOperations()
    }

    // Make clearAuthCache available globally for debugging
    if (typeof window !== 'undefined') {
      (window as Window & { clearAuthCache?: () => void }).clearAuthCache = clearAuthCache
    }

    // Cleanup on unmount
    return () => {
      networkRecovery.cleanup()
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
                  <TrialBanner />

                  <main style={{ padding: 'var(--space-8) var(--space-4)' }}>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                  <Route path="/" element={
                    <ProtectedRoute>
                      <AccessGuard>
                        <HomePage />
                      </AccessGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/callback" element={<ResetPasswordPage />} />
                  {/* <Route path="/components" element={<ComponentShowcase />} /> */}
                  <Route
                    path="/topics"
                    element={
                      <ProtectedRoute>
                        <AccessGuard>
                          <TopicsPage />
                        </AccessGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topics/new"
                    element={
                      <ProtectedRoute>
                        <AccessGuard>
                          <NewTopicPage />
                        </AccessGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/topics/:topicId"
                    element={
                      <ProtectedRoute>
                        <AccessGuard>
                          <TopicDetailView />
                        </AccessGuard>
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
                        <AccessGuard>
                          <StatsPage />
                        </AccessGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test-gamification"
                    element={
                      <ProtectedRoute>
                        <AccessGuard>
                          <TestGamificationPage />
                        </AccessGuard>
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
                        <AccessGuard>
                          <TestGamificationPersistence />
                        </AccessGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test-achievements"
                    element={
                      <ProtectedRoute>
                        <AccessGuard>
                          <TestAchievements />
                        </AccessGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/paywall" element={<PaywallPage />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
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
