import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './hooks/useAuthFixed'
import { HeaderFixed } from './components/layout/HeaderFixed'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPageFixed'
import { ComponentShowcase } from './components/ComponentShowcase'
import { TopicsPage } from './pages/TopicsPage'

function AppTest() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div style={{ minHeight: '100vh' }}>
            <HeaderFixed />
            
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
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default AppTest