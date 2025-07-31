import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Modal,
  Loading,
  LoadingSpinner,
  useToast,
} from './ui'

export function ComponentShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSize, setModalSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [inputValues, setInputValues] = useState({
    text: '',
    email: '',
    password: '',
    number: '',
    search: '',
  })
  const { addToast } = useToast()

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="h1">Component Showcase</h1>
          <Link to="/">
            <Button variant="ghost">← Back to Home</Button>
          </Link>
        </div>
        <p className="body-large text-secondary">
          Swiss Design System - Reference for all UI components
        </p>
      </header>

      {/* Typography Section */}
      <section id="typography" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Typography</h2>
        <Card>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <code className="caption text-muted">className="h1"</code>
                <h1 className="h1">Heading 1 - Bold 48px</h1>
              </div>
              <div>
                <code className="caption text-muted">className="h2"</code>
                <h2 className="h2">Heading 2 - Semibold 36px</h2>
              </div>
              <div>
                <code className="caption text-muted">className="h3"</code>
                <h3 className="h3">Heading 3 - Semibold 30px</h3>
              </div>
              <div>
                <code className="caption text-muted">className="h4"</code>
                <h4 className="h4">Heading 4 - Medium 24px</h4>
              </div>
              <div>
                <code className="caption text-muted">className="h5"</code>
                <h5 className="h5">Heading 5 - Medium 20px</h5>
              </div>
              <div>
                <code className="caption text-muted">className="h6"</code>
                <h6 className="h6">Heading 6 - Medium 18px</h6>
              </div>
              <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />
              <div>
                <code className="caption text-muted">className="body-large"</code>
                <p className="body-large">Body Large - Regular 18px with relaxed line height</p>
              </div>
              <div>
                <code className="caption text-muted">className="body"</code>
                <p className="body">Body Regular - Regular 16px with normal line height</p>
              </div>
              <div>
                <code className="caption text-muted">className="body-small"</code>
                <p className="body-small">Body Small - Regular 14px with normal line height</p>
              </div>
              <div>
                <code className="caption text-muted">className="caption"</code>
                <p className="caption">Caption - Regular 12px with wide letter spacing</p>
              </div>
              <div>
                <code className="caption text-muted">className="label"</code>
                <p className="label">Label - Medium 14px uppercase with wide spacing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Colors Section */}
      <section id="colors" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Colors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Card>
            <CardHeader>Primary Colors</CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-primary)', border: '1px solid var(--color-gray-200)' }} />
                  <div>
                    <p className="body-small font-medium">Primary</p>
                    <code className="caption">--color-primary</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-secondary)', border: '1px solid var(--color-gray-200)' }} />
                  <div>
                    <p className="body-small font-medium">Secondary</p>
                    <code className="caption">--color-secondary</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-accent)' }} />
                  <div>
                    <p className="body-small font-medium">Accent</p>
                    <code className="caption">--color-accent</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>Semantic Colors</CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-success)' }} />
                  <div>
                    <p className="body-small font-medium text-success">Success</p>
                    <code className="caption">--color-success</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-warning)' }} />
                  <div>
                    <p className="body-small font-medium text-warning">Warning</p>
                    <code className="caption">--color-warning</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-error)' }} />
                  <div>
                    <p className="body-small font-medium text-error">Error</p>
                    <code className="caption">--color-error</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-info)' }} />
                  <div>
                    <p className="body-small font-medium text-info">Info</p>
                    <code className="caption">--color-info</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Buttons Section */}
      <section id="buttons" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Buttons</h2>
        
        <Card style={{ marginBottom: '1rem' }}>
          <CardHeader>Button Variants</CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div>
                <p className="label" style={{ marginBottom: '0.5rem' }}>Primary</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button variant="primary" size="small">Small</Button>
                  <Button variant="primary" size="medium">Medium</Button>
                  <Button variant="primary" size="large">Large</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" loading>Loading</Button>
                </div>
              </div>
              
              <div>
                <p className="label" style={{ marginBottom: '0.5rem' }}>Secondary</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="small">Small</Button>
                  <Button variant="secondary" size="medium">Medium</Button>
                  <Button variant="secondary" size="large">Large</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                  <Button variant="secondary" loading>Loading</Button>
                </div>
              </div>
              
              <div>
                <p className="label" style={{ marginBottom: '0.5rem' }}>Ghost</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button variant="ghost" size="small">Small</Button>
                  <Button variant="ghost" size="medium">Medium</Button>
                  <Button variant="ghost" size="large">Large</Button>
                  <Button variant="ghost" disabled>Disabled</Button>
                  <Button variant="ghost" loading>Loading</Button>
                </div>
              </div>

              <div>
                <p className="label" style={{ marginBottom: '0.5rem' }}>Full Width</p>
                <Button fullWidth>Full Width Button</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Inputs Section */}
      <section id="inputs" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Inputs</h2>
        
        <Card>
          <CardHeader>Input States & Types</CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>Basic Inputs</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    label="Text Input"
                    placeholder="Enter text..."
                    value={inputValues.text}
                    onChange={(e) => setInputValues({ ...inputValues, text: e.target.value })}
                  />
                  <Input
                    label="Email Input"
                    type="email"
                    placeholder="email@example.com"
                    value={inputValues.email}
                    onChange={(e) => setInputValues({ ...inputValues, email: e.target.value })}
                    helperText="We'll never share your email"
                  />
                  <Input
                    label="Password Input"
                    type="password"
                    placeholder="Enter password..."
                    value={inputValues.password}
                    onChange={(e) => setInputValues({ ...inputValues, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>Special Types</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    label="Number Input"
                    type="number"
                    placeholder="0"
                    value={inputValues.number}
                    onChange={(e) => setInputValues({ ...inputValues, number: e.target.value })}
                  />
                  <Input
                    label="Search Input"
                    type="search"
                    placeholder="Search..."
                    value={inputValues.search}
                    onChange={(e) => setInputValues({ ...inputValues, search: e.target.value })}
                  />
                  <Input
                    label="Full Width Input"
                    placeholder="This spans full width"
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>States</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    label="With Error"
                    placeholder="Invalid input"
                    error="This field is required"
                  />
                  <Input
                    label="Disabled"
                    placeholder="Cannot edit"
                    disabled
                    value="Disabled value"
                  />
                  <Input
                    placeholder="No label"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cards Section */}
      <section id="cards" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Cards</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <Card variant="default">
            <CardHeader>Default Card</CardHeader>
            <CardContent>
              <p className="body">Standard card with subtle border. Perfect for most use cases.</p>
              <code className="caption text-muted">variant="default"</code>
            </CardContent>
            <CardFooter>
              <Button size="small" variant="ghost">Cancel</Button>
              <Button size="small">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="bordered">
            <CardHeader>Bordered Card</CardHeader>
            <CardContent>
              <p className="body">Prominent 2px border for emphasis and visual hierarchy.</p>
              <code className="caption text-muted">variant="bordered"</code>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>Elevated Card</CardHeader>
            <CardContent>
              <p className="body">Shadow creates depth and draws attention. Hover for effect.</p>
              <code className="caption text-muted">variant="elevated"</code>
            </CardContent>
          </Card>

          <Card variant="default" padding="none">
            <CardHeader>No Padding Card</CardHeader>
            <CardContent>
              <p className="body" style={{ padding: '1rem' }}>Custom padding control</p>
              <code className="caption text-muted" style={{ padding: '1rem' }}>padding="none"</code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Loading States Section */}
      <section id="loading" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Loading States</h2>
        
        <Card>
          <CardHeader>Loading Components</CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>Dot Loading Animation</p>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <Loading size="small" />
                  <Loading size="medium" />
                  <Loading size="large" />
                  <Loading size="medium" text="Loading content..." />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />

              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>Spinner Animation</p>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <LoadingSpinner size="small" />
                  <LoadingSpinner size="medium" />
                  <LoadingSpinner size="large" />
                </div>
              </div>

              <div>
                <p className="label" style={{ marginBottom: '1rem' }}>Button with Loading</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button loading>Saving...</Button>
                  <Button variant="secondary" loading>Processing</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Modal Section */}
      <section id="modal" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Modals</h2>
        
        <Card>
          <CardHeader>Modal Dialogs</CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button onClick={() => { setModalSize('small'); setIsModalOpen(true); }}>
                Small Modal
              </Button>
              <Button onClick={() => { setModalSize('medium'); setIsModalOpen(true); }}>
                Medium Modal
              </Button>
              <Button onClick={() => { setModalSize('large'); setIsModalOpen(true); }}>
                Large Modal
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Toast Section */}
      <section id="toasts" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Toast Notifications</h2>
        
        <Card>
          <CardHeader>Toast Types</CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button 
                variant="secondary" 
                onClick={() => addToast('success', 'Operation completed successfully!')}
              >
                Success Toast
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => addToast('error', 'An error occurred. Please try again.')}
              >
                Error Toast
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => addToast('warning', 'Please review your input before continuing.')}
              >
                Warning Toast
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => addToast('info', 'New features are available in settings.')}
              >
                Info Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Spacing Reference */}
      <section id="spacing" style={{ marginBottom: '4rem' }}>
        <h2 className="h2" style={{ marginBottom: '2rem' }}>Spacing Scale</h2>
        
        <Card>
          <CardContent>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((space) => (
                <div key={space} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <code className="caption" style={{ width: '100px' }}>--space-{space}</code>
                  <div 
                    style={{ 
                      height: '24px', 
                      width: `var(--space-${space})`,
                      backgroundColor: 'var(--color-primary)'
                    }} 
                  />
                  <span className="caption text-muted">{space * 4}px</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${modalSize.charAt(0).toUpperCase() + modalSize.slice(1)} Modal Example`}
        size={modalSize}
      >
        <div style={{ minHeight: '100px' }}>
          <p className="body" style={{ marginBottom: '1rem' }}>
            This is a {modalSize} modal dialog. It includes:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>Keyboard navigation (Tab, Shift+Tab)</li>
            <li>Escape key to close</li>
            <li>Click outside to close</li>
            <li>Focus trap</li>
            <li>Smooth animations</li>
          </ul>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsModalOpen(false);
              addToast('success', 'Modal action completed!');
            }}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}