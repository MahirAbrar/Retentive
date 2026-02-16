import './App.css'
import React, { useEffect, useState, Suspense } from 'react'
import { Analytics } from "@vercel/analytics/react"
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './hooks/useAuthFixed'
import { ThemeProvider } from './contexts/ThemeContext'
import { AchievementProvider } from './hooks/useAchievements'
import { networkRecovery } from './services/networkRecovery'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import { FocusGoalNotifier } from './components/FocusGoalNotifier'
import { OfflineDisclaimer } from './components/OfflineDisclaimer'
import { HeaderFixed } from './components/layout/HeaderFixed'
import { TrialBanner } from './components/TrialBanner'
import { AccessGuard } from './components/AccessGuard'
import { clearAuthCache } from './utils/clearAuthCache'
import { getSupabase } from './services/supabase'
import { lazyWithRetry } from './utils/lazyWithRetry'

// Lazy load all pages with retry logic for deployment cache mismatches
const HomePage = lazyWithRetry(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const TopicsPage = lazyWithRetry(() => import('./pages/TopicsPage').then(m => ({ default: m.TopicsPage })))
const NewTopicPage = lazyWithRetry(() => import('./pages/NewTopicPage').then(m => ({ default: m.NewTopicPage })))
const TopicDetailView = lazyWithRetry(() => import('./pages/TopicDetailView').then(m => ({ default: m.TopicDetailView })))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const StatsPage = lazyWithRetry(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })))
const TestGamificationPage = lazyWithRetry(() => import('./pages/TestGamificationPage').then(m => ({ default: m.TestGamificationPage })))
const DarkModeTest = lazyWithRetry(() => import('./pages/DarkModeTest').then(m => ({ default: m.DarkModeTest })))
const TestGamificationPersistence = lazyWithRetry(() => import('./pages/TestGamificationPersistence').then(m => ({ default: m.TestGamificationPersistence })))
const TestAchievements = lazyWithRetry(() => import('./pages/TestAchievements').then(m => ({ default: m.TestAchievements })))
const PaywallPage = lazyWithRetry(() => import('./pages/PaywallPage').then(m => ({ default: m.PaywallPage })))
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })))

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
  const [supabaseReady, setSupabaseReady] = useState(false)

  // Initialize Supabase BEFORE rendering AuthProvider
  useEffect(() => {
    getSupabase()
      .then(() => {
        setSupabaseReady(true)
      })
      .catch((error) => {
        console.error('Failed to initialize Supabase:', error)
        // Still set ready to true to show error in UI
        setSupabaseReady(true)
      })
  }, [])

  // Initialize services on app load
  useEffect(() => {
    // Initialize network recovery service (sets up listeners automatically)
    // This ensures auth tokens are refreshed when coming back online
    void networkRecovery // Service initializes on import

    // Make clearAuthCache available globally for debugging
    if (typeof window !== 'undefined') {
      (window as Window & { clearAuthCache?: () => void }).clearAuthCache = clearAuthCache
    }

    // Cleanup on unmount
    return () => {
      networkRecovery.cleanup()
    }
  }, [])

  // Wait for Supabase to initialize before rendering AuthProvider
  if (!supabaseReady) {
    return <PageLoader />
  }

  return (
    <>
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <ToastProvider>
            <AuthProvider>
              <AchievementProvider>
                <FocusGoalNotifier />
                <div style={{ minHeight: '100vh' }}>
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
    <Analytics />
    </>
  )
}

export default App
