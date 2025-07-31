import { Outlet } from 'react-router-dom'
import { HeaderFixed } from './HeaderFixed'

export function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderFixed />
      <main style={{ flex: 1, padding: 'var(--space-8) var(--space-4)' }}>
        <Outlet />
      </main>
    </div>
  )
}