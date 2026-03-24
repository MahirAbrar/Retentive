import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent } from '../ui'
import {
  Target,
  Clock,
  Zap,
  GraduationCap,
} from 'lucide-react'

interface GettingStartedGuideProps {
  isLoggedIn: boolean
  totalDueItems: number
  isExpanded: boolean
  onToggle: () => void
}

// --- Main component ---

const GUIDE_RESPONSIVE_CSS = `
  @media (max-width: 1024px) {
    .guide-section {
      margin-top: 1.5rem !important;
    }
    .guide-section-heading {
      font-size: var(--text-lg) !important;
      margin-bottom: 1rem !important;
    }
    .guide-mode-card,
    .guide-science-card,
    .guide-info-card {
      padding: 1rem !important;
    }
    .guide-mode-card h4,
    .guide-science-card h4,
    .guide-info-card h4 {
      font-size: var(--text-base) !important;
    }
    .guide-mode-card p,
    .guide-info-card p {
      font-size: var(--text-sm) !important;
    }
    .guide-science-grid {
      grid-template-columns: 1fr !important;
      gap: 0.75rem !important;
    }
    .guide-content-grid {
      gap: 1rem !important;
    }
    .guide-cta {
      padding: 1rem !important;
    }
  }
`

export function GettingStartedGuide({ isLoggedIn, totalDueItems, isExpanded, onToggle }: GettingStartedGuideProps) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="h3">Getting Started</h2>
          <Button
            variant="ghost"
            size="small"
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse guide' : 'Expand guide'}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            {isExpanded ? '\u2212' : '+'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isExpanded ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <style>{GUIDE_RESPONSIVE_CSS}</style>

            {/* How it works */}
            <div>
              <h3 className="body" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>How it works</h3>
              <ol className="body-small text-secondary" style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                <li>Create a topic and add items you want to learn</li>
                <li>Review items when they become due</li>
                <li>The app schedules reviews at optimal intervals</li>
                <li>After 3 or 5 reviews, an item is mastered</li>
              </ol>
            </div>

            {/* Learning Modes - compact */}
            <div>
              <h3 className="body" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Learning Modes</h3>
              <div className="guide-science-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {([
                  { icon: <Zap size={16} color="var(--color-error)" />, mode: 'ultracram' as const, label: 'Ultra-Cram', desc: '30s to 7 days — last-minute cramming' },
                  { icon: <Clock size={16} color="var(--color-warning)" />, mode: 'cram' as const, label: 'Cram', desc: '2h to 14 days — presentations & interviews' },
                  { icon: <Target size={16} color="var(--color-success)" />, mode: 'steady' as const, label: 'Steady', desc: '1d to 30 days — regular coursework' },
                  { icon: <GraduationCap size={16} color="var(--color-info)" />, mode: 'extended' as const, label: 'Extended', desc: '3d to 60 days — long-term knowledge' },
                ] as const).map(({ icon, label, desc }) => (
                  <div key={label} style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      {icon}
                      <span className="body-small" style={{ fontWeight: 600 }}>{label}</span>
                    </div>
                    <p className="caption text-secondary" style={{ margin: 0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick tip */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-info-light)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-info)',
            }}>
              <p className="body-small" style={{ margin: 0 }}>
                <strong>Tip:</strong> Short, frequent sessions (20-30 min) beat long marathons. Take breaks to let your brain consolidate.
              </p>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isLoggedIn ? (
                <>
                  <Link to="/topics">
                    <Button variant="primary">View Topics</Button>
                  </Link>
                  <Link to="/topics/new">
                    <Button variant="secondary">Create Your First Topic</Button>
                  </Link>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="primary">Sign Up Free</Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="body" style={{ marginBottom: '1.5rem' }}>
              Master anything with scientifically-proven spaced repetition learning.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {isLoggedIn ? (
                <>
                  {totalDueItems > 0 && (
                    <Link to="/topics">
                      <Button variant="primary" size="large">
                        Review {totalDueItems} Due Items
                      </Button>
                    </Link>
                  )}
                  <Link to="/topics/new">
                    <Button variant="secondary" size="large">
                      Add New Topic
                    </Button>
                  </Link>
                  <Link to="/topics">
                    <Button variant="ghost" size="large">
                      View All Topics
                    </Button>
                  </Link>
                </>
              ) : (
                <a href={`https://${import.meta.env.VITE_MARKET_LINK}/`} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="large">
                    Get Started
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
