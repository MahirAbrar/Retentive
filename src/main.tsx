import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: StrictMode disabled to prevent double rendering in development
// Re-enable for production builds if needed
createRoot(document.getElementById('root')!).render(
  <App />
)
