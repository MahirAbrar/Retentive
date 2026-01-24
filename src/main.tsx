import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StartupCheck } from './components/StartupCheck'

// Note: StrictMode disabled to prevent double rendering in development
// Re-enable for production builds if needed
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
createRoot(rootElement).render(
  <StartupCheck>
    <App />
  </StartupCheck>
)
