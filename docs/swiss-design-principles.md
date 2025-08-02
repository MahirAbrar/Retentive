# Swiss Design Principles

This document outlines the Swiss design principles implemented in the Retentive app to ensure consistency and visual hierarchy across all components.

## Core Principles

### 1. Grid System
- **12-column grid**: Base layout structure
- **Consistent spacing**: 8px base unit (0.5rem)
- **Responsive breakpoints**:
  - Mobile: < 640px (1 column)
  - Tablet: 640-1024px (2 columns)
  - Desktop: > 1024px (3-4 columns)

### 2. Typography
- **Primary font**: Bree Serif (headings, important text)
- **Secondary font**: System font stack (body text)
- **Type scale**:
  - H1: 2.5rem (40px)
  - H2: 2rem (32px)
  - H3: 1.5rem (24px)
  - H4: 1.25rem (20px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

### 3. Color Palette
- **Background**: #FFF8E7 (Cream)
- **Primary**: #2C3E50 (Dark Blue)
- **Secondary**: #E74C3C (Red accent)
- **Success**: #27AE60
- **Warning**: #F39C12
- **Error**: #E74C3C
- **Text**: #2C3E50
- **Muted**: #7F8C8D

### 4. Spacing & Layout
- **Base unit**: 8px (0.5rem)
- **Common spacings**:
  - xs: 0.25rem (4px)
  - sm: 0.5rem (8px)
  - md: 1rem (16px)
  - lg: 1.5rem (24px)
  - xl: 2rem (32px)
  - 2xl: 3rem (48px)

### 5. Visual Hierarchy

#### Component Hierarchy
1. **Primary Actions**: Full width buttons with primary color
2. **Secondary Actions**: Outlined buttons or text links
3. **Content Cards**: White background with subtle shadow
4. **Headers**: Bree Serif font, larger size, dark color
5. **Body Text**: System font, regular size, slightly lighter

#### Page Layout Hierarchy
1. **Header**: Fixed position, contains logo and navigation
2. **Main Content**: Max-width container, centered
3. **Cards/Sections**: Clear separation with spacing
4. **Footer**: Minimal, functional information only

### 6. Component Standards

#### Buttons
- **Height**: 48px (touch-friendly)
- **Padding**: 16px horizontal
- **Border radius**: 4px
- **Font weight**: 500
- **States**: Default, hover, active, disabled

#### Cards
- **Background**: White (#FFFFFF)
- **Padding**: 24px
- **Border radius**: 8px
- **Shadow**: 0 1px 3px rgba(0,0,0,0.1)
- **Hover shadow**: 0 4px 6px rgba(0,0,0,0.1)

#### Forms
- **Input height**: 48px
- **Label spacing**: 8px below label
- **Field spacing**: 16px between fields
- **Border**: 1px solid #E0E0E0
- **Focus border**: 2px solid primary color

#### Modals
- **Max width**: 600px
- **Padding**: 32px
- **Overlay**: rgba(0,0,0,0.5)
- **Border radius**: 8px

### 7. Interaction Patterns

#### Transitions
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Properties**: transform, opacity, box-shadow

#### Loading States
- **Skeleton screens**: For content loading
- **Spinners**: For actions (centered, 24px)
- **Progress bars**: For multi-step processes

#### Feedback
- **Toast notifications**: Top-right, auto-dismiss
- **Form validation**: Inline, immediate
- **Success states**: Green check icons
- **Error states**: Red with clear messages

### 8. Responsive Design

#### Mobile First
- Base styles for mobile
- Progressive enhancement for larger screens
- Touch-friendly tap targets (min 44px)

#### Breakpoint Behavior
- **Mobile**: Stack vertically, full width
- **Tablet**: 2-column layouts where appropriate
- **Desktop**: Multi-column grids, sidebars

### 9. Accessibility
- **Color contrast**: WCAG AA compliant
- **Focus indicators**: Visible for keyboard navigation
- **Alt text**: For all images and icons
- **ARIA labels**: For interactive elements

### 10. Implementation Checklist

For each component, verify:
- [ ] Uses grid system for layout
- [ ] Follows typography scale
- [ ] Uses correct color from palette
- [ ] Implements proper spacing
- [ ] Has defined hover/active states
- [ ] Includes transition animations
- [ ] Is keyboard accessible
- [ ] Follows responsive patterns
- [ ] Maintains visual hierarchy
- [ ] Aligns with Swiss design aesthetics

## Component Audit Status

| Component | Grid | Typography | Colors | Spacing | States | Responsive |
|-----------|------|------------|---------|----------|---------|------------|
| Button | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Card | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Input | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Modal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Toast | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Header | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Grid | ✓ | N/A | N/A | ✓ | N/A | ✓ |
| Layout | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
| TopicCard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TopicList | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

All components have been verified to follow Swiss design principles with consistent visual hierarchy.