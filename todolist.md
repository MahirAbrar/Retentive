# Active Learning App - Complete Development TODO

## Project Overview

Build a clean, Swiss design-inspired spaced repetition learning app using Vite + React + Electron. Focus on simplicity, functionality, and code quality.

---

## PHASE 1: PROJECT SETUP & FOUNDATION

### 1.1 Environment Setup

- [ ] Install Node.js (LTS version)
- [ ] Set up Git repository with proper `.gitignore`
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Electron
- [ ] Install development dependencies (ESLint, Prettier, etc.)
- [ ] Set up package.json scripts for dev/build/package
- [ ] Configure Electron main process entry point
- [ ] Test basic Electron + React + TypeScript integration

### 1.2 Supabase Project Setup

- [ ] Create new Supabase project
- [ ] Obtain project URL and anon key
- [ ] Configure authentication settings
  - [ ] Enable email/password authentication
  - [ ] Set up email templates for verification
  - [ ] Configure password reset flow
  - [ ] Set session timeout preferences
- [ ] Set up environment variables for Supabase credentials
- [ ] Test basic Supabase connection from Electron
- [ ] Create folder structure following separation of concerns
- [ ] Set up `src/` directory with components, services, hooks, utils
- [ ] Create `electron/` directory for main process code
- [ ] Set up `assets/` directory for icons and images
- [ ] Create `styles/` directory for CSS modules/files
- [ ] Add `public/` directory for static assets

### 1.3 Project Structure

- [ ] Create folder structure following separation of concerns
- [ ] Set up `src/` directory with components, services, hooks, utils
- [ ] Create `electron/` directory for main process code
- [ ] Set up `assets/` directory for icons and images
- [ ] Create `styles/` directory for CSS modules/files
- [ ] Add `public/` directory for static assets

### 1.4 Development Tooling

- [ ] Configure ESLint with React and Electron rules
- [ ] Set up Prettier for code formatting
- [ ] Configure Vite for Electron development
- [ ] Set up hot reloading for both React and Electron
- [ ] Add development scripts (start, build, test)
- [ ] Configure build process for packaging

### 1.5 Environment & Security Setup

- [ ] Set up environment variables (.env files)
- [ ] Configure Supabase Row Level Security policies
- [ ] Set up proper CORS settings for Electron
- [ ] Configure Supabase API rate limiting
- [ ] Set up proper error boundary components
- [ ] Add input sanitization for all user inputs
- [ ] Configure secure storage for sensitive data

---

## PHASE 2: CORE ARCHITECTURE

### 2.1 Data Models & Types (Supabase Schema Enhanced)

- [ ] Design enhanced Supabase database schema
  - [ ] Define topics table structure with priority field
  - [ ] Define learning_items table structure with independent timers
  - [ ] Add priority field (integer 1-10) to both topics and items
  - [ ] Set up proper foreign key relationships with cascade options
  - [ ] Configure Row Level Security policies
  - [ ] Add database indexes for performance (priority, due_date, user_id)
- [ ] Create TypeScript interfaces matching database schema
  - [ ] Topic interface with priority and default settings
  - [ ] LearningItem interface with independent scheduling
  - [ ] User profile interface/type
  - [ ] Settings interface/type
  - [ ] Review session interface/type
- [ ] Define constants for learning modes (cram/steady)
- [ ] Define spaced repetition intervals configuration with priority modifiers
- [ ] Set up Supabase database migrations for schema changes
- [ ] Design priority-based algorithm parameters

### 2.2 Supabase Setup & Configuration

- [ ] Create Supabase project and obtain credentials
- [ ] Configure Supabase client for Electron environment
  - [ ] Set proper auth configuration (persistSession, detectSessionInUrl: false)
  - [ ] Configure PKCE flow for desktop app security
  - [ ] Set up proper storage mechanism for tokens
- [ ] Design and create database schema
  - [ ] Create users table (or use Supabase auth.users)
  - [ ] Create topics table with proper relationships
  - [ ] Create learning_items table with foreign keys
  - [ ] Set up Row Level Security (RLS) policies
  - [ ] Create database indexes for performance

### 2.3 Services Layer (Backend Logic)

- [ ] Create SupabaseService class (main integration point)
  - [ ] Initialize Supabase client with proper config
  - [ ] Set up auth state change listeners
  - [ ] Implement auto-refresh handling for desktop
  - [ ] Add connection status monitoring
  - [ ] Handle offline/online state transitions
- [ ] Create AuthService class
  - [ ] Implement login/register with Supabase Auth
  - [ ] Handle email verification flow
  - [ ] Implement password reset functionality
  - [ ] Manage user session state
  - [ ] Add logout and session cleanup
- [ ] Create DataService class
  - [ ] Implement CRUD operations for topics
  - [ ] Implement CRUD operations for learning items
  - [ ] Add data validation before database operations
  - [ ] Handle optimistic updates with rollback
  - [ ] Implement local caching strategy
- [ ] Create RealtimeService class
  - [ ] Set up real-time subscriptions for topics
  - [ ] Handle real-time updates for learning items
  - [ ] Manage subscription lifecycle
  - [ ] Handle connection drops and reconnection
- [ ] Create SpacedRepetitionService class
  - [ ] Implement calculateNextReview method
  - [ ] Implement getDueItems method
  - [ ] Implement interval calculation logic
  - [ ] Add support for both cram and steady modes
  - [ ] Implement difficulty adjustment algorithms

### 2.5 Database Migrations & Versioning

- [ ] Set up Supabase migration workflow
- [ ] Create seed data for development and testing
- [ ] Plan schema versioning strategy for updates
- [ ] Add data migration scripts for schema changes
- [ ] Test migration rollback procedures
- [ ] Document database schema changes

### 2.6 Utility Functions

- [ ] Create date helper functions
- [ ] Create data validation utilities
- [ ] Create ID generation utilities (or use Supabase UUIDs)
- [ ] Create format/display utilities
- [ ] Add error handling utilities
- [ ] Create Supabase response handlers
- [ ] Add retry logic for network operations

---

## PHASE 3: UI FOUNDATION

### 3.1 Swiss Design System

- [ ] Create base CSS variables for colors, fonts, spacing
- [ ] Define typography scale following Swiss design principles
- [ ] Create grid system for layouts
- [ ] Design button component styles
- [ ] Create form input styles
- [ ] Define card/container styles
- [ ] Create utility classes for spacing, alignment
- [ ] Ensure consistent visual hierarchy

### 3.2 Base Components

- [ ] Create Button component with variants (primary, secondary)
- [ ] Create Input component with validation states
- [ ] Create Card component for consistent containers
- [ ] Create Modal/Dialog component
- [ ] Create Loading component
- [ ] Create Toast/Notification component
- [ ] Ensure all components follow Swiss design principles

### 3.3 Layout Components

- [ ] Create Header component
- [ ] Create Sidebar/Navigation component
- [ ] Create Main layout wrapper
- [ ] Create responsive grid containers
- [ ] Implement consistent spacing and alignment

---

## PHASE 4: CORE FEATURES

### 4.1 Topic Management (Enhanced)

- [ ] Create TopicForm component for adding new topics
  - [ ] Topic name input with validation
  - [ ] Learning mode selection (cram/steady)
  - [ ] Priority selection (1-10, default 5)
  - [ ] Subtopics textarea with line-by-line parsing
  - [ ] Form validation and error display
  - [ ] Save functionality integration
- [ ] Create TopicDetailView component
  - [ ] Display topic information (name, mode, priority, created date)
  - [ ] Show all subtopics with their individual statuses
  - [ ] Individual subtopic management (edit/delete)
  - [ ] Topic-level edit functionality
  - [ ] Navigation back to main list
- [ ] Create TopicCard component for displaying topics
  - [ ] Topic name and stats display
  - [ ] Due items count for the topic
  - [ ] Last studied date
  - [ ] Quick action buttons
  - [ ] Click to open detail view
- [ ] Create TopicList component
  - [ ] Display all topics in clean grid
  - [ ] Filter and search functionality
  - [ ] Sort by name, due items, last studied, priority
- [ ] Implement topic deletion with confirmation
  - [ ] Cascade delete all subtopics
  - [ ] Clean up review history data
  - [ ] Confirmation dialog with impact summary

### 4.2 Subtopic Management (New)

- [ ] Create SubtopicForm component for adding subtopics
  - [ ] Subtopic name input with validation
  - [ ] Priority selection (inherit from topic or custom)
  - [ ] Learning mode selection (inherit or custom)
  - [ ] Integration with parent topic
  - [ ] Form validation and guidelines display
- [ ] Create SubtopicEditForm component
  - [ ] Edit subtopic name, priority, mode
  - [ ] Display review history and statistics
  - [ ] Option to reset review progress
  - [ ] Delete subtopic functionality
  - [ ] Save changes with validation
- [ ] Create SubtopicListItem component
  - [ ] Display subtopic with status indicators
  - [ ] Show next review date and review count
  - [ ] Priority display and visual indicators
  - [ ] Individual action buttons (Done, Skip, Edit, Delete)
  - [ ] Status color coding (due, upcoming, completed)
- [ ] Implement subtopic CRUD operations
  - [ ] Add new subtopic to existing topic
  - [ ] Edit existing subtopic properties
  - [ ] Delete subtopic with confirmation
  - [ ] Handle data consistency during operations
- [ ] Create bulk subtopic management
  - [ ] Apply priority changes to multiple subtopics
  - [ ] Apply mode changes to multiple subtopics
  - [ ] Batch delete subtopics
  - [ ] Bulk status updates

### 4.3 Priority System Implementation

- [ ] Design priority-based scheduling algorithm
  - [ ] High priority (8-10): Shorter intervals when struggling
  - [ ] Normal priority (4-6): Standard intervals
  - [ ] Low priority (1-3): Longer intervals
  - [ ] Priority-based queue ordering
- [ ] Create priority visual indicators
  - [ ] Color coding for different priority levels
  - [ ] Priority badges and labels
  - [ ] Sorting and filtering by priority
- [ ] Implement priority impact on algorithms
  - [ ] Modify spaced repetition intervals based on priority
  - [ ] Queue management with priority weighting
  - [ ] Daily limit handling with priority consideration
- [ ] Store priority metadata for future AI features
  - [ ] Track priority usage patterns
  - [ ] Prepare data structure for AI suggestions
  - [ ] Analytics on priority effectiveness

### 4.4 Enhanced List View & Study Management

- [ ] Create comprehensive ItemListView component
  - [ ] Display all subtopics across all topics
  - [ ] Independent timer display for each item
  - [ ] Due status indicators (overdue, due now, upcoming)
  - [ ] Priority-based sorting and filtering
  - [ ] Topic grouping option
- [ ] Implement individual item study flow
  - [ ] "Done" action per subtopic
  - [ ] Independent timer updates
  - [ ] Difficulty rating system (Again/Hard/Good/Easy)
  - [ ] Immediate scheduling feedback
  - [ ] Progress tracking per item
- [ ] Create filtering and sorting options
  - [ ] Filter by due status (overdue, due, upcoming)
  - [ ] Filter by priority level
  - [ ] Filter by topic
  - [ ] Sort by due date, priority, or creation date
  - [ ] Search functionality across all items
- [ ] Implement batch study options
  - [ ] "Study All Due" functionality
  - [ ] Queue management for study sessions
  - [ ] Progress tracking across multiple items
  - [ ] Session completion summary

### 4.5 Study Session Flow (Enhanced)

- [ ] Create individual StudySession component
  - [ ] Display single subtopic for focused study
  - [ ] Question/prompt display with clean typography
  - [ ] "Show Answer" functionality
  - [ ] Difficulty rating buttons (Again, Hard, Good, Easy)
  - [ ] Skip functionality for when not ready
  - [ ] Session completion with immediate scheduling
- [ ] Implement independent timer updates
  - [ ] Update only the current item being studied
  - [ ] Calculate next review based on rating and priority
  - [ ] Immediate feedback on next review date
  - [ ] Return to list with updated status
- [ ] Create study completion feedback
  - [ ] Show next review date for completed item
  - [ ] Display priority impact on scheduling
  - [ ] Progress celebration for milestones
  - [ ] Option to continue with next due item

### 4.6 Dashboard (Enhanced)

- [ ] Create enhanced Dashboard component
  - [ ] Today's review count with priority breakdown
  - [ ] Priority-based item distribution display
  - [ ] Study streak tracking with visual indicators
  - [ ] Quick stats (total topics, mastered items, etc.)
  - [ ] Study mode indicator for mixed-mode topics
- [ ] Implement today's review calculations
  - [ ] Count due items by priority level
  - [ ] Show overdue items prominently
  - [ ] Display upcoming items for planning
- [ ] Add study streak tracking and motivation
  - [ ] Daily completion tracking
  - [ ] Streak milestone celebrations
  - [ ] Progress visualization
- [ ] Create quick action buttons
  - [ ] Start studying (highest priority first)
  - [ ] Add new topic
  - [ ] View all items
  - [ ] Access settings

---

## PHASE 5: SETTINGS & CONFIGURATION

### 5.1 Settings Management

- [ ] Create Settings component with clean form design
  - [ ] Default learning mode selection
  - [ ] Daily item limits configuration
  - [ ] Notification preferences
  - [ ] Preferred study time setting
  - [ ] Account/Login section
- [ ] Implement settings persistence
- [ ] Add settings validation
- [ ] Create settings reset functionality

### 5.2 Authentication System

- [ ] Create Login/Register modal components
  - [ ] Email/password login form
  - [ ] Registration form with validation
  - [ ] Password reset functionality
  - [ ] Clean, Swiss design-inspired auth UI
- [ ] Implement authentication service
  - [ ] JWT token management
  - [ ] Secure token storage
  - [ ] Auto-refresh token logic
  - [ ] Logout functionality
- [ ] Add authentication state management
  - [ ] User context/state
  - [ ] Login status tracking
  - [ ] User profile management
- [ ] Create account management UI
  - [ ] Profile settings
  - [ ] Change password
  - [ ] Delete account option

### 5.2 Authentication System

- [ ] Create Login/Register modal components
  - [ ] Email/password login form
  - [ ] Registration form with validation
  - [ ] Password reset functionality
  - [ ] Clean, Swiss design-inspired auth UI
- [ ] Implement authentication service
  - [ ] JWT token management
  - [ ] Secure token storage
  - [ ] Auto-refresh token logic
  - [ ] Logout functionality
- [ ] Add authentication state management
  - [ ] User context/state
  - [ ] Login status tracking
  - [ ] User profile management
- [ ] Create account management UI
  - [ ] Profile settings
  - [ ] Change password
  - [ ] Delete account option

### 5.3 Cloud Sync System

- [ ] Create sync service layer
  - [ ] Upload local data to cloud
  - [ ] Download cloud data to local
  - [ ] Merge conflict resolution
  - [ ] Incremental sync (only changed data)
  - [ ] Sync status tracking
- [ ] Implement sync UI components
  - [ ] Sync status indicator in settings
  - [ ] Manual sync trigger button
  - [ ] Sync progress display
  - [ ] Last sync timestamp
  - [ ] Sync conflict resolution UI
- [ ] Add automatic sync triggers
  - [ ] Sync on login
  - [ ] Sync on data changes (debounced)
  - [ ] Periodic background sync
  - [ ] Sync on app startup/shutdown
- [ ] Handle offline/online scenarios
  - [ ] Queue changes when offline
  - [ ] Sync queued changes when online
  - [ ] Offline mode indicators
  - [ ] Connection status monitoring

### 5.4 Data Management (Enhanced)

- [ ] Implement data export functionality (JSON format)
- [ ] Implement data import functionality with validation
- [ ] Create data backup/restore features
- [ ] Add data reset functionality with confirmation
- [ ] Implement data migration for future versions
- [ ] Add cloud backup/restore options
- [ ] Create data conflict resolution tools

---

## PHASE 6: ADVANCED FEATURES

### 6.1 Notifications System

- [ ] Implement daily study reminders using Electron notifications
- [ ] Create streak maintenance alerts
- [ ] Add milestone celebration notifications
- [ ] Implement notification scheduling based on user preferences
- [ ] Add notification permission handling

### 6.2 Statistics & Analytics

- [ ] Create Statistics component
  - [ ] Learning progress charts
  - [ ] Retention rate tracking
  - [ ] Time spent studying graphs
  - [ ] Topic-wise performance metrics
- [ ] Implement data visualization (simple charts)
- [ ] Add historical performance tracking
- [ ] Create learning insights and recommendations

### 6.3 Study Session Enhancements

- [ ] Add session types (quick review, deep study)
- [ ] Implement study session customization
- [ ] Add keyboard shortcuts for efficiency
- [ ] Create session pause/resume functionality
- [ ] Add session scheduling features

### 6.4 Real-time Features (Supabase)

- [ ] Implement live study session sync across devices
- [ ] Add real-time progress updates
- [ ] Create live study statistics
- [ ] Add real-time notifications for achievements
- [ ] Implement presence indicators (user online status)
- [ ] Create real-time study session sharing (future collaborative feature)

### 7.4 Supabase Performance Optimization

- [ ] Implement proper database indexing strategy
- [ ] Add query optimization for large datasets
- [ ] Implement pagination for topic/item lists
- [ ] Optimize real-time subscription usage
- [ ] Add caching strategy for frequently accessed data
- [ ] Monitor and optimize database query performance

### 7.5 Monitoring & Analytics

- [ ] Set up Supabase analytics tracking
- [ ] Add custom event tracking for user behavior
- [ ] Implement error logging and monitoring
- [ ] Add performance metrics collection
- [ ] Create usage analytics for improvement insights
- [ ] Set up automated health checks

---

## PHASE 8: TESTING & QUALITY ASSURANCE

### 7.1 Performance Optimization

- [ ] Implement lazy loading for large topic lists
- [ ] Optimize data loading and saving operations
- [ ] Add memory usage optimization
- [ ] Implement efficient re-rendering strategies
- [ ] Add background data processing

### 7.2 User Experience Enhancements

- [ ] Add loading states for all async operations
- [ ] Implement proper error boundaries
- [ ] Add offline functionality indicators
- [ ] Create smooth transitions and animations (subtle)
- [ ] Implement auto-save functionality

### 7.3 Error Handling & Recovery

- [ ] Add comprehensive error handling throughout app
- [ ] Implement graceful degradation for file system errors
- [ ] Create data corruption recovery mechanisms
- [ ] Add user-friendly error messages
- [ ] Implement crash reporting and recovery

---

## PHASE 8: TESTING & QUALITY ASSURANCE

### 8.1 Testing Setup

- [ ] Set up Jest for unit testing
- [ ] Configure React Testing Library
- [ ] Set up Electron testing environment
- [ ] Create test utilities and helpers
- [ ] Add test coverage reporting

### 8.2 Unit Testing

- [ ] Test all service layer functions
- [ ] Test Supabase integration functions
- [ ] Test utility functions
- [ ] Test React hooks
- [ ] Test spaced repetition algorithms
- [ ] Test data validation functions
- [ ] Mock Supabase client for testing

### 8.3 Integration Testing

- [ ] Test component integration with Supabase services
- [ ] Test Electron main process integration
- [ ] Test authentication flows end-to-end
- [ ] Test real-time subscription handling
- [ ] Test offline/online scenarios
- [ ] Test study session end-to-end flows

### 8.4 User Acceptance Testing

- [ ] Test complete user workflows
- [ ] Validate Swiss design consistency
- [ ] Test performance under load
- [ ] Verify cross-platform compatibility

---

## PHASE 9: BUILD & DEPLOYMENT

### 9.1 Build Configuration

- [ ] Configure Electron Builder for packaging
- [ ] Set up build scripts for different platforms
- [ ] Configure app icons and metadata
- [ ] Set up code signing (if applicable)
- [ ] Create installer configurations

### 9.2 Distribution Preparation

- [ ] Create application documentation
- [ ] Prepare release notes template
- [ ] Set up version management system
- [ ] Create update mechanism foundation
- [ ] Test installation on clean systems

---

## FUTURE IMPLEMENTATION SECTION

### AI Integration (Future Phase)

- [ ] Design AI service integration points with Supabase
- [ ] Plan Supabase Edge Functions for AI processing
- [ ] Design AI-powered topic generation using database context
- [ ] Plan intelligent subtopic suggestions based on user history
- [ ] Design AI content recommendations using Supabase analytics
- [ ] Plan AI-based difficulty assessment using review data
- [ ] Design natural language query processing with vector search
- [ ] Plan AI study path optimization using user performance data
- [ ] Design integration with external AI APIs via Edge Functions
- [ ] Plan vector embeddings storage in Supabase for semantic search

### Advanced Features (Future)

- [ ] Multi-language support with Supabase internationalization
- [ ] Enhanced real-time collaboration features
- [ ] Advanced analytics dashboard using Supabase functions
- [ ] Mobile companion app with shared Supabase backend
- [ ] Integration with external learning platforms via API
- [ ] Advanced spaced repetition algorithms with ML
- [ ] Content recommendation engine using Supabase vector search
- [ ] Team/organization features with RLS policies

---

## CODE QUALITY STANDARDS

### Architecture Principles

- [ ] **Single Responsibility**: Each component/service has one clear purpose
- [ ] **Separation of Concerns**: UI, business logic, and data access are separated
- [ ] **Dependency Injection**: Services are injected rather than instantiated
- [ ] **Interface Segregation**: Small, focused interfaces/types
- [ ] **Open/Closed Principle**: Code open for extension, closed for modification

### File Organization Standards

- [ ] **Consistent naming**: PascalCase for components, camelCase for functions
- [ ] **File structure**: One component per file, clear folder hierarchy
- [ ] **Import organization**: External imports first, then internal, then relative
- [ ] **Export consistency**: Default exports for components, named for utilities
- [ ] **Path consistency**: Use absolute imports with path mapping

### React Best Practices (TypeScript)

- [ ] **Functional components with TypeScript**: Use hooks with proper typing
- [ ] **Custom hooks with TypeScript**: Extract reusable logic with type safety
- [ ] **Prop validation with TypeScript**: Use interfaces for all component props
- [ ] **State management with TypeScript**: Use appropriate state management with strict typing
- [ ] **Effect cleanup**: Always clean up effects and subscriptions
- [ ] **Memoization with TypeScript**: Use useMemo/useCallback with proper type inference
- [ ] **Error boundaries**: Implement proper error handling with TypeScript
- [ ] **Strict TypeScript configuration**: Enable strict mode and proper compiler options

### Service Layer Standards

- [ ] **Pure functions**: Business logic functions are pure and testable
- [ ] **Error handling**: Consistent error handling patterns
- [ ] **Async patterns**: Proper Promise handling and async/await usage
- [ ] **Type safety**: Strong typing for all service methods
- [ ] **Documentation**: JSDoc comments for all public methods
- [ ] **Validation**: Input validation for all service methods

### CSS/Styling Standards

- [ ] **CSS Modules**: Use CSS modules for component styling
- [ ] **Design tokens**: Use CSS variables for consistent theming
- [ ] **Naming convention**: BEM methodology for CSS classes
- [ ] **Responsive design**: Mobile-first approach
- [ ] **Performance**: Minimize CSS bundle size
- [ ] **Accessibility**: Proper ARIA labels and semantic HTML

### Testing Standards

- [ ] **Test coverage**: Minimum 80% code coverage
- [ ] **Test organization**: Arrange-Act-Assert pattern
- [ ] **Mock strategy**: Mock external dependencies consistently
- [ ] **Test naming**: Descriptive test names following "should X when Y" pattern
- [ ] **Integration tests**: Test user workflows end-to-end

### Performance Standards

- [ ] **Bundle optimization**: Code splitting and lazy loading
- [ ] **Memory management**: Proper cleanup and garbage collection
- [ ] **Rendering optimization**: Minimize unnecessary re-renders
- [ ] **Data loading**: Efficient data fetching and caching
- [ ] **Startup time**: App should start within 3 seconds

### Documentation Standards

- [ ] **README**: Comprehensive setup and usage instructions
- [ ] **API documentation**: Document all service methods
- [ ] **Component documentation**: Props and usage examples
- [ ] **Architecture documentation**: High-level system design
- [ ] **Changelog**: Maintain version history

### Version Control Standards

- [ ] **Commit messages**: Follow conventional commit format
- [ ] **Branch strategy**: Feature branches with descriptive names
- [ ] **Code review**: All changes reviewed before merge
- [ ] **Release tagging**: Semantic versioning for releases

### Security Standards

- [ ] **Input validation**: Sanitize all user inputs
- [ ] **File system security**: Validate file paths and permissions
- [ ] **Dependency security**: Regular security audits
- [ ] **Data encryption**: Encrypt sensitive data at rest

### Accessibility Standards

- [ ] **Keyboard navigation**: Full app usable with keyboard only
- [ ] **Screen reader support**: Proper ARIA labels and roles
- [ ] **Color contrast**: Meet WCAG AA standards
- [ ] **Focus management**: Logical focus order and visible indicators
