import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardHeader, CardContent } from '../ui'
import {
  Target,
  Clock,
  Zap,
  GraduationCap,
  FlaskConical,
  Timer,
  Activity,
  BrainCircuit,
} from 'lucide-react'
import { LEARNING_MODE_EXAMPLES } from '../../utils/learningScience'
import type { LearningMode } from '../../types/database'

interface GettingStartedGuideProps {
  isLoggedIn: boolean
  totalDueItems: number
  isExpanded: boolean
  onToggle: () => void
}

// --- Internal reusable components ---

function ModeCard({
  icon,
  color,
  colorLight,
  mode,
}: {
  icon: ReactNode
  color: string
  colorLight: string
  mode: LearningMode
}) {
  const data = LEARNING_MODE_EXAMPLES[mode]
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--color-gray-50)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-gray-200)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        {icon}
        <h4 className="h4" style={{ color }}>{data.title}</h4>
      </div>
      <p className="body" style={{ marginBottom: '1rem' }}>{data.description}</p>
      <p className="body-small" style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        <strong>Example:</strong> {data.example}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {data.idealFor.map((use, i) => (
          <span
            key={i}
            className="caption"
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: colorLight,
              borderRadius: 'var(--radius-sm)',
              color,
            }}
          >
            {use}
          </span>
        ))}
      </div>
    </div>
  )
}

function ScienceCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)' }}>
      <h4 className="h4" style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}>{title}</h4>
      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
    </div>
  )
}

function InfoCard({ bgColor, title, children }: { bgColor: string; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '1.5rem', backgroundColor: bgColor, borderRadius: 'var(--radius-md)' }}>
      <h4 className="h4" style={{ marginBottom: '0.75rem' }}>{title}</h4>
      <p className="body" style={{ marginBottom: '0.5rem' }}>{children}</p>
    </div>
  )
}

function SessionModeItem({ color, title, children }: { color: string; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
        <strong className="body-small">{title}</strong>
      </div>
      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>{children}</p>
    </div>
  )
}

const sectionHeadingStyle: React.CSSProperties = {
  marginBottom: '2rem',
  color: 'var(--color-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

// --- Main component ---

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
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Learning Modes */}
            <section style={{ marginTop: '3rem' }}>
              <h3 className="h3" style={sectionHeadingStyle}>
                <FlaskConical size={24} />
                The Science of Learning Modes
              </h3>
              <p className="body" style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                Understanding the cognitive research behind our spaced repetition system
              </p>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <ModeCard icon={<Zap size={20} color="var(--color-error)" />} color="var(--color-error)" colorLight="var(--color-error-light)" mode="ultracram" />
                <ModeCard icon={<Clock size={20} color="var(--color-warning)" />} color="var(--color-warning)" colorLight="var(--color-warning-light)" mode="cram" />
                <ModeCard icon={<Target size={20} color="var(--color-success)" />} color="var(--color-success)" colorLight="var(--color-success-light)" mode="steady" />
                <ModeCard icon={<GraduationCap size={20} color="var(--color-info)" />} color="var(--color-info)" colorLight="var(--color-info-light)" mode="extended" />
              </div>
            </section>

            {/* Content Recommendations */}
            <section style={{ marginTop: '3rem' }}>
              <h3 className="h3" style={sectionHeadingStyle}>
                <BrainCircuit size={24} />
                The Science Behind Our Content Recommendations
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                <ScienceCard title="Cognitive Processing Limits">
                  Research shows we can only actively process 3-5 meaningful units at once.
                  Each sentence contains 1-2 key ideas, so 4-8 sentences hits the sweet spot
                  of our working memory&rsquo;s processing capacity.
                </ScienceCard>
                <ScienceCard title="The 20-Second Rule">
                  Most people can read and process 4-8 sentences in about 20-30 seconds, which
                  aligns with working memory&rsquo;s time limits before information starts degrading
                  without rehearsal.
                </ScienceCard>
                <ScienceCard title="Rapid Review Optimization">
                  Ultra-Cram and Cram modes use shorter chunks (4-6 sentences) to prevent
                  cognitive overload during frequent reviews. When seeing material multiple
                  times per day, each exposure must be digestible.
                </ScienceCard>
                <ScienceCard title="Long-Term Retention">
                  Steady mode&rsquo;s 5-8 sentence range matches research on optimal chunk sizes for
                  long-term retention. Extended mode allows 7-10 sentences with more context,
                  as longer gaps between reviews allow deeper processing.
                </ScienceCard>
              </div>
            </section>

            {/* Session Limits */}
            <section style={{ marginTop: '3rem' }}>
              <h3 className="h3" style={sectionHeadingStyle}>
                <Timer size={24} />
                Why Study Session Limits Matter
              </h3>
              <div style={{ display: 'grid', gap: '2rem' }}>
                <InfoCard bgColor="var(--color-warning-light)" title="The 30-Minute Wall">
                  Research consistently shows cognitive performance degrades sharply after
                  25-30 minutes of focused learning. Your encoding efficiency drops by about
                  40% after this point.
                </InfoCard>
                <InfoCard bgColor="var(--color-info-light)" title="Working Memory Saturation">
                  Your brain can actively process 4&plusmn;1 chunks simultaneously. Once you hit 5-6
                  chunks, earlier material starts getting pushed out before it&rsquo;s properly
                  encoded to long-term memory.
                </InfoCard>
                <InfoCard bgColor="var(--color-success-light)" title="The Spacing Paradox">
                  Three focused 20-minute sessions outperform one exhausting 60-minute
                  marathon by about 74% for long-term retention. Less is literally more when
                  spaced properly.
                </InfoCard>

                <div
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-gray-200)',
                  }}
                >
                  <h4 className="h4" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
                    Mode-Specific Session Design
                  </h4>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <SessionModeItem color="var(--color-error)" title="Ultra-Cram/Cram:">
                      Shorter sessions (3-4 chunks) since you&rsquo;ll have multiple reviews per
                      day. Prevents burnout while maintaining high frequency.
                    </SessionModeItem>
                    <SessionModeItem color="var(--color-success)" title="Steady:">
                      The optimal 4-6 chunks matches the research sweet spot for sustained
                      daily practice without cognitive fatigue.
                    </SessionModeItem>
                    <SessionModeItem color="var(--color-info)" title="Extended:">
                      Can push to 5-7 chunks since you have days to consolidate between
                      sessions, allowing for deeper processing.
                    </SessionModeItem>
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-gray-100)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Activity size={16} />
                        <strong className="body-small">Break Requirements:</strong>
                      </div>
                      <p className="body-small" style={{ color: 'var(--color-text-secondary)' }}>
                        5-10 min breaks for sessions under 25 min, 10-15 min for 30+ min
                        sessions. This resets working memory and prevents interference.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <p className="body" style={{ marginBottom: '1rem', fontWeight: '500' }}>
                Ready to supercharge your learning?
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {isLoggedIn ? (
                  <>
                    <Link to="/topics">
                      <Button variant="primary" size="large">
                        View Topics
                      </Button>
                    </Link>
                    <Link to="/topics/new">
                      <Button variant="secondary" size="large">
                        Create Your First Topic
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to="/login">
                    <Button variant="primary" size="large">
                      Sign Up Free
                    </Button>
                  </Link>
                )}
              </div>
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
                <a href="https://retentive-learning-app.vercel.app/" target="_blank" rel="noopener noreferrer">
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
