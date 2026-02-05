# Retentive App - Complete Feature Documentation

---

# Part 1: Supabase Backend

## Authentication

| Action | Method |
|--------|--------|
| Sign Up | `supabase.auth.signUp({ email, password })` |
| Sign In | `supabase.auth.signInWithPassword({ email, password })` |
| Sign Out | `supabase.auth.signOut()` |
| Get User | `supabase.auth.getUser()` |
| Get Session | `supabase.auth.getSession()` |
| Refresh Session | `supabase.auth.refreshSession()` |
| Reset Password | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` |
| Update Password | `supabase.auth.updateUser({ password })` |
| Auth State Listener | `supabase.auth.onAuthStateChange(callback)` |

## Database Tables & Operations

### topics
| Operation | Query |
|-----------|-------|
| Create | `.from('topics').insert(data).select().single()` |
| Get All | `.from('topics').select('*').eq('user_id', userId)` |
| Get One | `.from('topics').select('*').eq('id', topicId).single()` |
| Update | `.from('topics').update(data).eq('id', topicId).select().single()` |
| Delete | `.from('topics').delete().eq('id', topicId)` |
| Get Archived | `.from('topics').select('*').eq('archive_status', 'archived')` |

### learning_items
| Operation | Query |
|-----------|-------|
| Create | `.from('learning_items').insert(data).select().single()` |
| Create Bulk | `.from('learning_items').insert(items).select()` |
| Get by Topic | `.from('learning_items').select('*').eq('topic_id', topicId)` |
| Get by User | `.from('learning_items').select('*').eq('user_id', userId)` |
| Get One | `.from('learning_items').select('*').eq('id', itemId).single()` |
| Update | `.from('learning_items').update(data).eq('id', itemId).select().single()` |
| Delete | `.from('learning_items').delete().eq('id', itemId)` |
| Bulk Update | `.from('learning_items').update(data).in('id', itemIds).select()` |
| Count Overdue | `.from('learning_items').select('*', { count: 'exact', head: true }).lt('next_review_at', now)` |
| Count Due Today | `.from('learning_items').select('*', { count: 'exact', head: true }).gte('next_review_at', now).lte('next_review_at', todayEnd)` |
| Count Mastered | `.from('learning_items').select('*', { count: 'exact', head: true }).gte('review_count', 5)` |

### review_sessions
| Operation | Query |
|-----------|-------|
| Create | `.from('review_sessions').insert(data).select().single()` |
| Get Recent | `.from('review_sessions').select('*').eq('user_id', userId).order('reviewed_at', { ascending: false })` |
| Count Total | `.from('review_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId)` |

### focus_sessions
| Operation | Query |
|-----------|-------|
| Create | `.from('focus_sessions').insert({ user_id, goal_minutes, is_active: true }).select().single()` |
| Get Active | `.from('focus_sessions').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle()` |
| Update | `.from('focus_sessions').update(data).eq('id', sessionId).eq('user_id', userId).select().single()` |
| End Session | `.from('focus_sessions').update({ ended_at, is_active: false, ... }).eq('id', sessionId)` |
| Get History | `.from('focus_sessions').select('*').eq('user_id', userId).eq('is_active', false).order('created_at')` |
| Get by Date Range | `.from('focus_sessions').select('*').gte('created_at', startDate).lte('created_at', endDate)` |

### focus_segments
| Operation | Query |
|-----------|-------|
| Create | `.from('focus_segments').insert({ session_id, user_id, segment_type, started_at }).select().single()` |
| Get Active | `.from('focus_segments').select('*').eq('session_id', sessionId).is('ended_at', null).maybeSingle()` |
| End Segment | `.from('focus_segments').update({ ended_at, duration_minutes }).eq('id', segmentId)` |
| Get by Session | `.from('focus_segments').select('*').eq('session_id', sessionId).order('started_at')` |

### user_gamification_stats
| Operation | Query |
|-----------|-------|
| Get | `.from('user_gamification_stats').select('*').eq('user_id', userId).single()` |
| Create | `.from('user_gamification_stats').insert({ user_id, total_points: 0, ... }).select().single()` |
| Update | `.from('user_gamification_stats').update({ total_points, current_level, ... }).eq('user_id', userId)` |

### daily_stats
| Operation | Query |
|-----------|-------|
| Get Today | `.from('daily_stats').select('*').eq('user_id', userId).eq('date', todayStr).maybeSingle()` |
| Create | `.from('daily_stats').insert({ user_id, date, points_earned, reviews_completed, ... })` |
| Update | `.from('daily_stats').update({ points_earned, reviews_completed, ... }).eq('user_id', userId).eq('date', date)` |

### achievements
| Operation | Query |
|-----------|-------|
| Get All | `.from('achievements').select('achievement_id').eq('user_id', userId)` |
| Unlock | `.from('achievements').insert({ user_id, achievement_id, points_awarded, unlocked_at })` |

### user_settings
| Operation | Query |
|-----------|-------|
| Get | `.from('user_settings').select('*').eq('user_id', userId).single()` |
| Create | `.from('user_settings').insert({ user_id, default_learning_mode, ... }).select().single()` |
| Update | `.from('user_settings').update({ ... }).eq('user_id', userId)` |

### user_focus_preferences
| Operation | Query |
|-----------|-------|
| Get | `.from('user_focus_preferences').select('*').eq('user_id', userId).maybeSingle()` |
| Upsert | `.from('user_focus_preferences').upsert({ user_id, ... }).select().single()` |

## RPC Functions

| Function | Purpose |
|----------|---------|
| `supabase.rpc('ensure_user_settings', { p_user_id })` | Create user settings on signup |
| `supabase.rpc('has_app_access', { user_id })` | Check subscription/trial access |
| `supabase.rpc('activate_subscription', { user_id, subscription_type, stripe_customer_id, stripe_subscription_id, duration_days })` | Activate paid subscription |
| `supabase.rpc('check_and_expire_subscriptions')` | Expire outdated subscriptions |
| `supabase.rpc('start_user_trial', { p_user_id })` | Start 14-day trial |
| `supabase.rpc('delete_user_account')` | Delete user and all data |

## Edge Functions

| Function | Purpose |
|----------|---------|
| `supabase.functions.invoke('cancel-subscription', { body: { subscriptionId } })` | Cancel Stripe subscription |

## Session Management
- Auto token refresh 5 minutes before expiry
- Session cached to localStorage (7 days TTL)
- Auth state events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED
- Offline session restoration from cache

---

# Part 2: Topics & Learning

## Topics
- Create topics with name, learning mode, and items
- Four learning modes (in order): Ultra-Cram, Cram, Steady, Extended
- Start date scheduling for future reviews
- Auto-save drafts every 2 seconds
- Archive/unarchive topics
- Delete topics
- Search topics by name or item content
- Filter topics (All, Has Due Items, Has New Items, Upcoming, Has Mastered Items)
- Sort topics (Name, Due Items, Last Studied)
- Pagination with customizable items per page
- **Learning mode tooltip on hover** - Shows review schedule, session length, and content per item

## Topic Creation Guidance
- Simplified guidance panel showing:
  - Review schedule (e.g., 1d → 3d → 7d → 14d)
  - Session length (e.g., 25-30 min)
  - Content per item (word count)
- Mode-specific examples in reference format
- Word counts by mode:
  | Mode | Content per item |
  |------|------------------|
  | Ultra-Cram | ~50-75 words |
  | Cram | ~50-75 words |
  | Steady | ~75-125 words |
  | Extended | ~100-150 words |

## Learning Items
- Add items to topics
- Inline edit item content
- Delete items
- View next review date
- View review count
- View mastery status
- Review window indicator (optimal timing display)
- Study individual items

## Spaced Repetition System
- Simple "Mark as Reviewed" action
- Automatic interval calculation based on learning mode
- Next review scheduling
- Review count tracking

## Mastery System (at 5+ reviews)
- Archive: Stop reviews permanently
- Maintenance: Extended interval reviews
- Repeat: Reset and start over
- Keep Mastered: Default state

---

# Part 3: Focus Timer & Adherence

## Focus Timer
- Customizable goal duration (default 25 min)
- Work/break session tracking
- Progress bar toward goal
- Session recovery for interrupted sessions
- Session summary with points breakdown
- Edit session duration after completion
- Break activity suggestions (stretching, walk, etc.)
- Break activity timer
- Goal reached notification
- Max duration warning
- **Session length guide (idle state)** - Shows recommended session lengths by mode for 100% adherence:
  | Mode | Recommended Duration |
  |------|---------------------|
  | Ultra-Cram / Cram | 15-30 min |
  | Steady | 25-30 min |
  | Extended | 30-45 min |

## Adherence System
- Adherence percentage calculation: `(work_time / (work_time + break_time)) * 100`
- Color-coded adherence status:
  - Green (95%+): Excellent
  - Light Green (80-94%): Good
  - Yellow (70-79%): Moderate
  - Orange (60-69%): Low
  - Red (<60%): Very Low
- Points penalty based on adherence:
  - 80%+: No penalty
  - 60-79%: 25% penalty
  - 40-59%: 50% penalty, session marked incomplete
  - <40%: 75% penalty, session marked incomplete
- Session edit with reason tracking
- Adjusted session badge display

---

# Part 4: Statistics & Analytics

## Home Dashboard Stats
- Quick stats cards (Overdue, Due Today, Upcoming, Mastered)
- Review status (Next Review, New Items)
- Study progress cards (Total Topics, Total Items, Streak)

## Statistics Page
- Date range selector (Last Week, Last Month, All Time)
- Total reviews count
- Current day streak with warning (<4 hours remaining)
- Mastered items count
- Average completion rate
- Daily activity chart (7 days)
- Learning velocity metrics (avg reviews/day, peak day)
- Study patterns analysis (active topics, items per topic, retention rate)
- Topic performance bar chart (top 5 topics)
- Topic completion percentages

## Recent Activity Feed
- Combined reviews + focus sessions
- Session edit history with reasons
- Edit/incomplete badges
- Load more pagination

## Timing Performance
- Perfect timing count
- On-time percentage
- Early/late review tracking

## Focus Adherence Stats
- Total focus sessions
- Total work/break minutes
- Average adherence
- Best adherence

---

# Part 5: Settings & Account

## Profile
- Display name update
- Email display (read-only)

## Security
- Password change (current + new + confirm)
- Password reset via email

## Preferences
- Theme toggle (Light/Dark mode)
- System preference detection

## Subscription
- 14-day free trial
- Trial status display
- Premium tier
- Subscription status display
- Upgrade option

## Data Management
- Export data
- Import data
- Reset all data (double confirmation required)

## Danger Zone
- Delete account (requires typing "DELETE")
- Sign out

---

# Part 6: Gamification

## Points
- Base points for reviews
- Streak bonus
- Timing bonus (perfect review timing)
- Focus session points (2 points per minute)
- Penalty for low adherence

## Leveling
- Current level display
- Progress bar to next level
- Dynamic level requirements (exponential growth)

## Streaks
- Current streak (consecutive review days)
- Longest streak tracking
- Visual indicators (fire emoji 30+ days, star emoji 7+ days)
- Streak warning when < 4 hours remaining

## Achievements
- First Review
- First Mastery
- Perfect 10 (10 perfect timing reviews)
- Week Warrior (7-day streak)
- Month Master (30-day streak)
- Points 100 / Points 1000
- Level 5 / Level 10
- Speed Demon (50 reviews in one day)
- Toast notifications on unlock

---

# Part 7: System Features

## Offline Support
- Offline mode indicator
- Operation queue when offline
- Automatic sync on reconnection
- Local storage fallback
- Network recovery handling

## Sync
- Real-time connection status
- Sync indicator in header
- Pending operations counter
- Automatic sync

## Theme
- Light mode
- Dark mode
- System preference detection
- Manual toggle in settings
- Persistence to localStorage

## Caching
- In-memory cache with TTL
- LocalStorage cache for offline
- Request deduplication
- Cache invalidation on mutations

---

# Part 8: Workflows

## Create & Study Workflow
1. Create topic (name, learning mode)
2. Add items (creates learning items)
3. Set optional start date
4. Navigate to topic detail
5. Click Study on due/new item
6. View content, mark as reviewed
7. Receive points
8. Next review scheduled automatically
9. At 5 reviews, choose mastery option

## Focus Session Workflow
1. Set goal duration
2. Start working
3. Timer tracks elapsed time
4. Take breaks as needed
5. End session at goal or manually
6. View session summary
7. Points awarded based on adherence
8. Session saved to database

## Daily Streak Workflow
1. Complete at least one review each day
2. Streak increments on consecutive days
3. Streak resets on missed day
4. Warning displayed when < 4 hours remain

## Topic Management Workflow
1. View all topics on Topics page
2. Search/filter/sort as needed
3. Click topic to view items
4. Edit items inline
5. Archive completed topics
6. Delete unused topics

## Stats Review Workflow
1. Navigate to Statistics page
2. Select date range
3. View summary cards
4. Analyze charts and patterns
5. Review recent activity feed
6. Check topic performance

## Account Management Workflow
1. Go to Settings
2. Update display name
3. Change password if needed
4. Toggle theme preference
5. Configure notifications
6. Export data for backup
7. Delete account if needed

---

# Part 9: Technical Specifications

## TypeScript Types

```typescript
// Enums
type LearningMode = 'ultracram' | 'cram' | 'steady' | 'extended'
type MasteryStatus = 'active' | 'mastered' | 'archived' | 'maintenance' | 'repeat'
type ArchiveStatus = 'active' | 'archived'
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'inactive'

// User
interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  user_metadata?: { display_name?: string }
  is_paid?: boolean
  is_trial?: boolean
  trial_started_at?: string | null
  subscription_type?: 'monthly' | 'yearly' | null
  subscription_expires_at?: string | null
  subscription_status?: SubscriptionStatus
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

// Topic
interface Topic {
  id: string
  user_id: string
  name: string
  learning_mode: LearningMode
  archive_status?: ArchiveStatus
  archive_date?: string | null
  created_at: string
  updated_at: string
}

// Learning Item
interface LearningItem {
  id: string
  topic_id: string
  user_id: string
  content: string
  learning_mode: LearningMode
  review_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  interval_days: number
  mastery_status?: MasteryStatus
  mastery_date?: string | null
  archive_date?: string | null
  maintenance_interval_days?: number | null
  created_at: string
  updated_at: string
}

// Review Session
interface ReviewSession {
  id: string
  user_id: string
  learning_item_id: string
  reviewed_at: string
  next_review_at: string
  interval_days: number
}

// Focus Session
interface FocusSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  goal_minutes: number
  total_work_minutes: number
  total_break_minutes: number
  adherence_percentage: number | null
  is_active: boolean
  is_incomplete?: boolean
  points_earned?: number
  points_penalty?: number
  was_adjusted?: boolean
  adjustment_reason?: string | null
}

// Gamification Stats
interface UserGamificationStats {
  id: string
  user_id: string
  total_points: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_review_date: string | null
}

// Daily Stats
interface DailyStats {
  id: string
  user_id: string
  date: string
  points_earned: number
  reviews_completed: number
  perfect_timing_count: number
  items_mastered: number
}

// Achievement
interface Achievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  points_awarded: number
}
```

---

## Spaced Repetition Algorithm

### Learning Mode Intervals (in hours)

| Mode | Review 1 | Review 2 | Review 3 | Review 4 | Review 5 (Mastered) |
|------|----------|----------|----------|----------|---------------------|
| Ultra-Cram | 0.00833 (30s) | 2 | 24 | 72 | 168 |
| Cram | 2 | 24 | 72 | 168 | 336 |
| Steady | 24 | 72 | 168 | 336 | 720 |
| Extended | 72 | 168 | 336 | 720 | 1440 |

### Review Windows (hours before/after due)

| Mode | Window Before | Window After |
|------|---------------|--------------|
| Ultra-Cram | 0 | 1 |
| Cram | 2 | 4 |
| Steady | 12 | 24 |
| Extended | 12 | 24 |

### Points Multipliers

| Mode | On-Time | In-Window | Late |
|------|---------|-----------|------|
| Ultra-Cram | 2.5x | 1.8x | 0.7x |
| Cram | 2.0x | 1.5x | 0.8x |
| Steady | 2.0x | 1.2x | 0.7x |
| Extended | 1.8x | 1.4x | 0.85x |

### Maintenance Mode Caps

| Mode | Max Interval |
|------|--------------|
| Ultra-Cram | 60 days |
| Cram | 90 days |
| Extended | 180 days |
| Steady | 365 days |

---

## Gamification Config

### Points System

| Action | Points |
|--------|--------|
| Base Review | 10 |
| Mastery Bonus | 100 |
| Focus Session | 2 per minute |

### Streak Milestones

| Days | Bonus Points |
|------|--------------|
| 3 | 50 |
| 7 | 150 |
| 14 | 300 |
| 30 | 700 |
| 60 | 1500 |
| 100 | 3000 |
| 365 | 10000 |

### Combo Bonus (session reviews)

| Reviews | Bonus |
|---------|-------|
| 5 | +25 |
| 10 | +75 |
| 25 | +200 |
| 50 | +500 |

### Leveling Formula

```
Level XP = 100 * (1.2 ^ (level - 1))

Level 1: 100 XP
Level 2: 120 XP
Level 3: 144 XP
...
```

### Achievements

| ID | Name | Criteria | Points |
|----|------|----------|--------|
| first_review | First Steps | Complete first review | 50 |
| first_mastery | Mastery | Master first item | 100 |
| streak_7 | Week Warrior | 7-day streak | 200 |
| streak_30 | Consistent | 30-day streak | 500 |
| perfect_10 | Perfectionist | 10 perfect timing reviews | 300 |
| speed_demon | Speed Demon | 50 reviews in one session | 400 |
| points_100 | Century | Earn 100 points | 50 |
| points_1000 | Millionaire | Earn 1000 points | 200 |
| level_5 | Level 5 | Reach level 5 | 100 |
| level_10 | Level 10 | Reach level 10 | 1000 |

---

## Design System (CSS Variables)

### Colors - Light Mode

```css
--color-primary: #2d3748        /* Dark blue-gray */
--color-secondary: #fffef9      /* Cream white */
--color-accent: #4299e1         /* Sky blue */
--color-background: #fffef9     /* Cream */
--color-surface: #ffffff        /* White cards */
--color-border: #e2e8f0         /* Light border */
--color-text-primary: #2d3748   /* Dark gray */
--color-text-secondary: #718096 /* Medium gray */
--color-success: #48bb78        /* Green */
--color-warning: #ed8936        /* Orange */
--color-error: #f56565          /* Red */
--color-info: #4299e1           /* Blue */
```

### Colors - Dark Mode

```css
--color-primary: #e2e8f0        /* Light gray */
--color-secondary: #1a202c      /* Dark blue-gray */
--color-background: #0f1419     /* Very dark */
--color-surface: #1e2732        /* Dark surface */
--color-text-primary: #e2e8f0   /* Light gray */
--color-text-secondary: #a0aec0 /* Medium gray */
```

### Typography

```css
--font-serif: 'Bree Serif', Georgia, serif
--font-sans: 'Inter', -apple-system, sans-serif
--text-xs: 0.875rem   /* 14px */
--text-sm: 1rem       /* 16px */
--text-base: 1.125rem /* 18px */
--text-lg: 1.25rem    /* 20px */
--text-xl: 1.5rem     /* 24px */
--text-2xl: 1.875rem  /* 30px */
--text-3xl: 2.25rem   /* 36px */
```

### Spacing (8px grid)

```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
```

### Other

```css
--radius-sm: 0.125rem
--radius-base: 0.25rem
--radius-lg: 0.5rem
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--transition-fast: 150ms
--transition-base: 200ms
```

---

## Dependencies

### Runtime
- @supabase/supabase-js: ^2.52.1
- react: ^18.3.1
- react-dom: ^18.3.1
- react-router-dom: ^7.7.1
- recharts: ^3.1.0
- lucide-react: ^0.543.0
- uuid: ^9.0.1

### Dev
- vite: ^7.0.4
- vite-plugin-pwa (PWA/Service Worker)
- typescript: ~5.8.3
- eslint: ^9.30.1
- prettier: ^3.6.2

---

## File Structure

```
src/
├── main.tsx                    # App entry
├── App.tsx                     # Root component + routing
├── index.css                   # Global styles
├── components/
│   ├── ui/                     # Button, Card, Input, Modal, Toast, etc.
│   ├── layout/                 # Header, Layout, Grid, SyncStatus
│   ├── focus/                  # FocusTimer, SessionSummary, modals
│   ├── gamification/           # Points, Level, Streak, Achievements
│   ├── settings/               # Subscription, DataManagement
│   └── topics/                 # TopicList, TopicCard
├── pages/
│   ├── HomePage.tsx
│   ├── TopicsPage.tsx
│   ├── TopicDetailView.tsx
│   ├── NewTopicPage.tsx
│   ├── StudyPage.tsx
│   ├── StatsPage.tsx
│   ├── SettingsPage.tsx
│   ├── LoginPage.tsx
│   └── PaywallPage.tsx
├── services/
│   ├── supabase.ts             # Supabase client
│   ├── authFixed.ts            # Auth service
│   ├── dataService.ts          # Topics/Items CRUD
│   ├── gamificationService.ts  # Points, levels, achievements
│   ├── focusTimerService.ts    # Focus sessions
│   ├── spacedRepetition.ts     # SR algorithm
│   ├── statsService.ts         # Statistics
│   ├── syncService.ts          # Offline sync
│   ├── cacheService.ts         # In-memory cache
│   └── offlineService.ts       # Offline support
├── hooks/
│   ├── useAuth.tsx
│   ├── useFocusTimer.ts
│   ├── useAchievements.tsx
│   └── useOnlineStatus.tsx
├── contexts/
│   └── ThemeContext.tsx
├── config/
│   └── gamification.ts         # All gamification constants
├── constants/
│   └── learning.ts             # Learning mode constants
├── types/
│   └── database.ts             # TypeScript interfaces
├── utils/
│   ├── validation.ts
│   ├── errors.ts
│   ├── logger.ts
│   └── supabase.ts             # Retry/error handling
└── styles/
    ├── variables.css           # CSS custom properties
    └── typography.css

```
