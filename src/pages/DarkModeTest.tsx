import { useTheme } from '../contexts/ThemeContext'
import { Button, Card, CardHeader, CardContent, Input, useToast } from '../components/ui'

export function DarkModeTest() {
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="h1" style={{ marginBottom: '2rem' }}>Dark Mode Test Page</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p className="body">Current theme: <strong>{theme}</strong></p>
        <Button onClick={toggleTheme} variant="primary" style={{ marginTop: '1rem' }}>
          Toggle Theme (currently {theme})
        </Button>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <Card>
          <CardHeader>
            <h3 className="h3">Typography Test</h3>
          </CardHeader>
          <CardContent>
            <h1 className="h1">Heading 1</h1>
            <h2 className="h2">Heading 2</h2>
            <h3 className="h3">Heading 3</h3>
            <h4 className="h4">Heading 4</h4>
            <p className="body">Regular body text</p>
            <p className="body-small text-secondary">Secondary small text</p>
            <p className="caption text-muted">Muted caption text</p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <h3 className="h3">Color Test</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-primary)', color: 'var(--color-secondary)' }}>
                Primary Color
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-accent)', color: 'white' }}>
                Accent Color
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-success)', color: 'white' }}>
                Success Color
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-warning)', color: 'white' }}>
                Warning Color
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-error)', color: 'white' }}>
                Error Color
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="h3">Form Elements</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Text Input" placeholder="Enter some text" />
              <Input label="Email Input" type="email" placeholder="email@example.com" />
              <Input label="Password Input" type="password" placeholder="••••••••" />
              <div>
                <label className="body">Select Dropdown</label>
                <select style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  marginTop: '0.5rem'
                }}>
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="h3">Button Variants</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Button variant="primary" onClick={() => addToast('success', 'Primary button clicked')}>
                Primary
              </Button>
              <Button variant="secondary" onClick={() => addToast('info', 'Secondary button clicked')}>
                Secondary
              </Button>
              <Button variant="ghost" onClick={() => addToast('warning', 'Ghost button clicked')}>
                Ghost
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="h3">Background & Surface Test</h3>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-background)' }}>
                Background Color
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-background-secondary)' }}>
                Background Secondary
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                Surface Color
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}