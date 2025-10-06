import { useState } from 'react'
import { Button, Card, CardHeader, CardContent, Input } from './ui'
import '../styles/variables-alternative.css'

type Theme = 'default' | 'swiss-blue' | 'modern-dark' | 'warm-minimal' | 'swiss-education' | 'neo-swiss'

export function ThemeShowcase() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default')

  const themes = [
    { 
      id: 'default' as Theme, 
      name: 'Current (B&W)', 
      description: 'Pure minimalist black and white'
    },
    { 
      id: 'swiss-blue' as Theme, 
      name: 'Classic Swiss Blue', 
      description: 'Traditional Swiss design with blue as primary'
    },
    { 
      id: 'modern-dark' as Theme, 
      name: 'Modern Dark', 
      description: 'Dark theme with vibrant cyan and pink accents'
    },
    { 
      id: 'warm-minimal' as Theme, 
      name: 'Warm Minimalist', 
      description: 'Soft and inviting with coral and teal'
    },
    { 
      id: 'swiss-education' as Theme, 
      name: 'Swiss Education', 
      description: 'Professional learning-focused palette'
    },
    { 
      id: 'neo-swiss' as Theme, 
      name: 'Bold Neo-Swiss', 
      description: 'High contrast with bright accent colors'
    },
  ]

  const applyTheme = (theme: Theme) => {
    // Remove all theme classes
    document.body.className = ''
    
    // Apply new theme
    if (theme !== 'default') {
      document.body.className = `theme-${theme}`
    }
    
    setCurrentTheme(theme)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="h1">Color Theme Explorer</h1>
      <p className="body-large" style={{ marginBottom: '3rem' }}>
        Let&rsquo;s find a color scheme that brings life to your learning app while maintaining Swiss design principles.
      </p>

      {/* Theme Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {themes.map((theme) => (
          <Card 
            key={theme.id}
            variant={currentTheme === theme.id ? 'bordered' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={() => applyTheme(theme.id)}
          >
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="h5">{theme.name}</h3>
                {currentTheme === theme.id && <span className="label">Active</span>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="body-small">{theme.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Section */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Learning App Preview */}
        <Card variant="elevated">
          <CardHeader>
            <h2 className="h3">Learning App Preview</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-error, #ef4444)', 
                  color: 'white',
                  borderRadius: 'var(--radius-base)'
                }}>
                  <p className="h4">12</p>
                  <p className="body-small">Overdue</p>
                </div>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-warning, #f59e0b)', 
                  color: 'white',
                  borderRadius: 'var(--radius-base)'
                }}>
                  <p className="h4">8</p>
                  <p className="body-small">Due Today</p>
                </div>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-info, #3b82f6)', 
                  color: 'white',
                  borderRadius: 'var(--radius-base)'
                }}>
                  <p className="h4">24</p>
                  <p className="body-small">Upcoming</p>
                </div>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-success, #10b981)', 
                  color: 'white',
                  borderRadius: 'var(--radius-base)'
                }}>
                  <p className="h4">156</p>
                  <p className="body-small">Mastered</p>
                </div>
              </div>

              {/* Sample Topic Card */}
              <Card variant="bordered">
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="h5">JavaScript Fundamentals</h4>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      backgroundColor: 'var(--color-accent, var(--color-primary))', 
                      color: 'var(--color-secondary)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      Priority: 8
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="body-small text-secondary">32 items • 8 due today</p>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="primary">Start Studying</Button>
                <Button variant="secondary">Add New Topic</Button>
                <Button variant="ghost">View Statistics</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UI Elements */}
        <Card>
          <CardHeader>
            <h3 className="h4">UI Elements</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <Input 
                  label="Topic Name" 
                  placeholder="Enter a topic to study..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button size="small" variant="primary">Primary</Button>
                <Button size="small" variant="secondary">Secondary</Button>
                <Button size="small" variant="ghost">Ghost</Button>
                <span style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: 'var(--color-accent, var(--color-error))',
                  color: 'white',
                  borderRadius: 'var(--radius-base)'
                }}>
                  Accent Color
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Recommendation */}
        <Card variant="bordered">
          <CardContent>
            <h3 className="h4" style={{ marginBottom: '1rem' }}>My Recommendation</h3>
            <p className="body">
              For a learning app, I&rsquo;d recommend the <strong>&quot;Swiss Education&quot;</strong> theme. It maintains the clean Swiss aesthetic while adding:
            </p>
            <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
              <li>A professional blue-gray that&rsquo;s easier on the eyes than pure black</li>
              <li>Color-coded states (red for overdue, green for mastered) that help users quickly assess their progress</li>
              <li>Sufficient contrast without being harsh</li>
              <li>A slight warmth that makes long study sessions more pleasant</li>
            </ul>
            <p className="body" style={{ marginTop: '1rem' }}>
              The <strong>&quot;Neo-Swiss&quot;</strong> option is great if you want something more playful and energetic, while still maintaining the geometric clarity of Swiss design.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}