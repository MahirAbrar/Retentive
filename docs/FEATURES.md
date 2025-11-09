# Retentive App Features Documentation

## Overview
Retentive is a Swiss design-inspired spaced repetition learning application that helps users memorize and retain information effectively through scientifically-proven learning techniques, gamification, and intelligent scheduling.

## Core Features

### 1. Authentication & User Management
- **Email/Password Authentication**: Secure authentication via Supabase Auth
- **Session Management**: Persistent login sessions with automatic token refresh
- **Offline Support**: Continue learning even without internet connection
- **Account Management**: 
  - Profile settings customization
  - Account deletion with confirmation
  - Data reset functionality

### 2. Learning System

#### Topics & Subtopics
- **Hierarchical Organization**: Create topics with unlimited nested subtopics
- **Custom Properties**:
  - Name and description
  - Priority levels (low, medium, high)
  - Learning modes (spaced repetition, cramming, immersive)
  - Archive functionality for completed topics
- **Batch Operations**: Add multiple subtopics at once
- **Visual Indicators**: Progress bars and mastery indicators

#### Learning Items
- **Question-Answer Format**: Traditional flashcard structure
- **Rich Content Support**:
  - Text-based questions and answers
  - Markdown formatting support
  - Code snippet highlighting
- **Metadata Tracking**:
  - Creation and update timestamps
  - Review count
  - Success rate
  - Mastery level (0-5)
  - Last review date
  - Next scheduled review

### 3. Spaced Repetition Algorithm

#### Learning Modes
- **Spaced Repetition Mode**: 
  - Optimal intervals: 1 day, 3 days, 7 days, 14 days, 30 days, 90 days
  - Adaptive scheduling based on performance
  - Time window flexibility (before/after due date)
  
- **Cramming Mode**: 
  - Compressed intervals: 1 hour, 4 hours, 12 hours, 1 day, 3 days, 7 days
  - Ideal for exam preparation
  - Tighter review windows
  
- **Immersive Mode**: 
  - Rapid intervals: 30 min, 2 hours, 6 hours, 1 day, 2 days, 5 days
  - Maximum exposure for quick learning
  - Strict timing requirements

#### Advanced Features
- **Smart Scheduling**: Algorithm considers item difficulty and past performance
- **Maintenance Mode**: For fully mastered items (90+ days retention)
- **Archive System**: Completed topics can be archived with maintenance reviews
- **Repeat Options**: Reset mastery for additional practice

### 4. Review Interface

#### Review Session
- **Keyboard Shortcuts**:
  - Space: Show answer
  - 1-5: Rate difficulty
  - Enter: Next item
  - R: Repeat current item
  - P: Previous item
- **Visual Feedback**: Color-coded difficulty ratings
- **Progress Tracking**: Real-time session statistics
- **Audio Feedback**: Optional sound effects for actions

#### Review Modes
- **Standard Review**: All due items
- **Topic-Specific**: Focus on single topic
- **Priority-Based**: High-priority items first
- **Mixed Review**: Combination of all topics

### 5. Gamification System

#### Points & Levels
- **Experience Points (XP)**:
  - Base points per review: 10 XP
  - Time bonuses for on-time reviews
  - Priority multipliers (1.5x for high priority)
  - Perfect timing bonuses
- **Level System**:
  - 50 levels with exponential XP requirements
  - Visual progress bars
  - Level-up animations and notifications

#### Achievements
- **Categories**:
  - First Steps (complete first reviews)
  - Consistency (maintain streaks)
  - Mastery (perfect reviews)
  - Volume (total items reviewed)
  - Dedication (daily goals)
- **Unlock Conditions**: Progressive difficulty
- **Point Rewards**: 50-500 XP per achievement

#### Streaks & Daily Goals
- **Daily Streaks**: Consecutive days of learning
- **Streak Recovery**: Grace period for missed days
- **Daily Targets**: Customizable review goals
- **Perfect Days**: Complete all due reviews

### 6. Statistics & Analytics

#### Dashboard
- **Overview Cards**:
  - Total items learned
  - Current streak
  - Items due today
  - Mastery distribution
- **Charts & Graphs**:
  - 7-day activity heatmap
  - Learning progress over time
  - Topic distribution pie chart
  - Mastery level distribution

#### Detailed Analytics
- **Per-Topic Statistics**:
  - Average mastery level
  - Review frequency
  - Success rate
  - Time investment
- **Historical Data**:
  - Daily review counts
  - Points earned over time
  - Streak history
  - Achievement timeline

### 7. Notification System

#### Desktop Notifications
- **Daily Reminders**: Customizable time
- **Review Due Alerts**: When items need review
- **Achievement Unlocked**: Real-time celebration
- **Streak Warnings**: Prevent streak loss

#### In-App Notifications
- **Toast Messages**: Success/error feedback
- **Progress Updates**: Level-ups and milestones
- **System Messages**: Sync status and updates

### 8. Offline Mode

#### Capabilities
- **Full Functionality**: All features work offline
- **Local Storage**: IndexedDB for data persistence
- **Queue System**: Actions queued for sync
- **Conflict Resolution**: Smart merge on reconnection

#### Sync Features
- **Automatic Sync**: On connection restore
- **Manual Sync**: Force sync option
- **Sync Status**: Visual indicators
- **Offline Banner**: Connection status display

### 9. Data Management

#### Import/Export
- **JSON Export**: Full data backup
- **CSV Export**: Spreadsheet compatible
- **Selective Export**: Choose specific topics
- **Import Validation**: Data integrity checks

#### Archive System
- **Archive Topics**: Hide completed topics
- **Archive View**: Separate archived items view
- **Restore Function**: Unarchive when needed
- **Maintenance Reviews**: Keep knowledge fresh

### 10. User Interface

#### Design System
- **Swiss Design Principles**:
  - Clean, minimal interface
  - Typography-focused
  - Functional over decorative
  - Clear visual hierarchy
- **Responsive Layout**: Desktop and tablet optimized
- **Keyboard Navigation**: Full keyboard support
- **Accessibility**: ARIA labels and semantic HTML

#### Theme Support
- **Light Mode**: Default bright theme
- **Dark Mode**: Eye-friendly dark theme
- **System Preference**: Auto-detect OS setting
- **Smooth Transitions**: Animated theme switching

### 11. Settings & Preferences

#### Customization Options
- **Notification Settings**:
  - Enable/disable notifications
  - Set reminder times
  - Sound preferences
- **Display Settings**:
  - Theme selection
  - Animation preferences
  - Keyboard shortcut display
- **Learning Settings**:
  - Default learning mode
  - Review session length
  - Auto-play audio

#### Account Settings
- **Profile Management**: Update email and password
- **Data Management**: Export, import, reset
- **Privacy Settings**: Data sharing preferences
- **Subscription Management**: Plan and billing

### 12. Performance Features

#### Optimization
- **Lazy Loading**: Components load on demand
- **Code Splitting**: Reduced initial bundle
- **Caching Strategy**: Smart cache management
- **Debounced Updates**: Prevent excessive renders

#### Database
- **Row-Level Security**: Supabase RLS
- **Optimistic Updates**: Instant UI feedback
- **Batch Operations**: Efficient bulk actions
- **Indexed Queries**: Fast data retrieval

### 13. Keyboard Shortcuts

#### Global Shortcuts
- **Cmd/Ctrl + K**: Quick search
- **Cmd/Ctrl + N**: New topic
- **Cmd/Ctrl + R**: Start review
- **Cmd/Ctrl + S**: Save changes
- **Escape**: Close modals

#### Review Shortcuts
- **Space**: Show/hide answer
- **1-5**: Rate difficulty
- **Enter**: Next item
- **R**: Repeat item
- **P**: Previous item
- **Q**: Quit review

### 14. Advanced Features

#### AI Integration (Planned)
- **Smart Content Generation**: AI-generated questions
- **Difficulty Assessment**: Automatic rating
- **Learning Path Optimization**: Personalized schedules
- **Content Suggestions**: Related topics

#### Collaboration (Planned)
- **Shared Topics**: Learn with others
- **Public Library**: Community content
- **Study Groups**: Collaborative learning
- **Progress Sharing**: Social features

### 15. Technical Features

#### Architecture
- **Frontend**: React 18 with TypeScript
- **State Management**: React Context + Hooks
- **Backend**: Supabase (PostgreSQL)
- **Desktop**: Electron wrapper
- **Build Tool**: Vite

#### Security
- **Authentication**: JWT tokens
- **Data Encryption**: HTTPS/TLS
- **Input Validation**: Client and server-side
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization

## Platform Support

### Desktop Application
- **macOS**: Native .dmg installer
- **Windows**: .exe installer (planned)
- **Linux**: AppImage (planned)
- **Auto-Updates**: Built-in updater

### Web Application
- **Progressive Web App**: Installable
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Tablet and desktop
- **Offline Support**: Service worker caching

## Subscription Features (Phase 11)

### Free Tier
- **Limited Topics**: Up to 3 active topics
- **Basic Features**: Core learning functionality
- **7-Day Trial**: Full access trial period

### Premium Tier ($3/month or $30/year)
- **Unlimited Topics**: No restrictions
- **Advanced Analytics**: Detailed insights
- **Priority Support**: Faster response times
- **Cloud Backup**: Automatic backups
- **AI Features**: When available
- **Early Access**: Beta features

## Version Information
- **Current Version**: 0.1.0
- **Release Date**: 2024
- **License**: Proprietary
- **Support**: support@retentive-app.com