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

### subjects
| Operation | Query |
|-----------|-------|
| Create | `.from('subjects').insert({ user_id, name, icon, color, display_order }).select().single()` |
| Get All | `.from('subjects').select('*').eq('user_id', userId).order('display_order')` |
| Get One | `.from('subjects').select('*').eq('id', subjectId).single()` |
| Update | `.from('subjects').update(data).eq('id', subjectId).select().single()` |
| Delete | `.from('subjects').delete().eq('id', subjectId)` |
| Get with Stats | `.from('subjects').select('*, topics(id, learning_items(id, review_count))')` |

### topics
| Operation | Query |
|-----------|-------|
| Create | `.from('topics').insert(data).select().single()` |
| Get All | `.from('topics').select('*').eq('user_id', userId)` |
| Get One | `.from('topics').select('*').eq('id', topicId).single()` |
| Update | `.from('topics').update(data).eq('id', topicId).select().single()` |
| Delete | `.from('topics').delete().eq('id', topicId)` |
| Get Archived | `.from('topics').select('*').eq('archive_status', 'archived')` |
| Get by Subject | `.from('topics').select('*').eq('subject_id', subjectId)` |

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

### quick_reminders
| Operation | Query |
|-----------|-------|
| Create | `.from('quick_reminders').insert({ user_id, content }).select().single()` |
| Get All | `.from('quick_reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false })` |
| Get Count | `.from('quick_reminders').select('*', { count: 'exact', head: true }).eq('user_id', userId)` |
| Update | `.from('quick_reminders').update({ completed }).eq('id', id)` |
| Delete | `.from('quick_reminders').delete().eq('id', id)` |

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

## Subjects
- Organize topics into subjects (folders)
- Subject icon and color customization (Lucide icons)
- **Subject suggestions** - Quick-pick preset subjects (Math, Science, Languages, etc.)
- Collapsible subject headers in list view
- Subject stats (topic count, item count, due count, mastered count)
- Create/edit/delete subjects
- Unassigned topics section for topics without a subject

## Topics
- Create topics with name, learning mode, and items
- Assign topics to subjects
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
- **View toggle** - Switch between List view and Mindmap view

## Mindmap View
- Visual hierarchy: Center ("My Learning") → Subjects → Topics → Items
- Radial layout (center hub with subjects radiating outward)
- **Expand/collapse interactions**:
  - Click subjects to expand and show topics
  - Click topics to expand and show items (up to 8 items shown, "+N more" for overflow)
  - Double-click topics to navigate to topic detail page
- Reuses already-loaded data from Topics page (no additional API calls)
- **Mastery visualization**:
  - Line opacity: 20% (no mastery) → 100% (fully mastered)
  - Line thickness: 1px → 4px based on mastery percentage
  - Dashed lines for < 30% mastery
  - Glow effect on nodes with > 80% mastery
- **Node types**:
  - Center: Brain icon, overall mastery progress ring
  - Subjects: Custom icon/color, progress ring, +/- expand indicator
  - Topics: Smaller nodes, progress ring, +/- expand indicator
  - Items: Smallest nodes, mastery icon (○/◐/✓), content preview on hover
- **Controls**:
  - Pan (drag canvas) and zoom (scroll/pinch)
  - Zoom in/out/reset buttons
  - Expand All / Collapse All button
  - **Fullscreen mode** - Expand mindmap to fill entire screen
  - **Show Item Labels toggle** - Display truncated item names below icons (default: icons only)
  - **Node Size slider** - Scale all nodes from 60% to 140% (affects collision physics)
  - **Spacing slider** - Scale distance/spacing between nodes from 50% to 150%
  - **Reset controls button** - Resets node size and spacing to 100% (appears when modified)
  - **Color Mode toggle** - Switch between Subject colors (default) or Mastery-based colors (green=mastered, blue=good, orange=progress, red=needs work)
  - **Filter selector** - Filter visible topics: All, Due (has due items), Mastered (fully mastered), New (has unreviewed items)
  - **Empty filter message** - Helpful message when filter returns no matching topics with "Show All" button
- **Force-directed physics** (d3-force):
  - Nodes repel each other (no overlap)
  - Connected nodes attract with spring effect
  - Drag a node and connected nodes follow elastically
  - Smooth settling animation when released
- Mastery legend
- Hover tooltips showing label and mastery percentage
- Handles unassigned topics as a pseudo-subject

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

## Archive Features
- **Auto-archive suggestion** - Prompts to archive when all items mastered
- **Archive insights** - Shows topic stats after archiving:
  - Total reviews completed
  - Days to mastery
  - Days since archived
  - Mastered item count

---

# Part 3: Focus Timer & Adherence

## Focus Timer
- Customizable goal duration (default 25 min)
- Work/break session tracking
- Progress bar toward goal
- **Focus session indicator in header** - Shows active session time, status (Working/Break), quick stop button
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

## Home Dashboard
- **Quick stats cards** (Overdue, Due Today, Upcoming, Mastered, Reviewed Today)
- **Review status cards** (Next Review, New Items)
- **Study progress cards** (Total Topics, Total Items, Streak)
- **Last Studied banner** - Shows time since last study with "Study Now" CTA
- **Getting Started Guide** - Onboarding checklist for new users (create first topic, complete first review, etc.)

## Quick Reminders
- Accessible from header (bell icon)
- Add quick text reminders
- View/delete reminders
- Reminder count badge in header
- Persisted to database per user

## Statistics Page
- **Day Streak card** - Always visible, independent of date range, with streak warning (<4 hours remaining)
- **Performance card** - Date range selector (Week, Month, All Time) with Reviews, Mastered (in period), Avg/Day, Peak Day
- Daily activity chart (7 days)
- Topic completion percentages

## Recent Activity Feed
- Combined reviews + focus sessions
- Session edit history with reasons
- Edit/incomplete badges
- Fixed count selector (5, 10, 15 items)

## Timing Performance
- Date range filter (Week, Month, Year, All Time)
- **Overall summary**: on-time rate percentage, perfect/on-time/late counts, total reviews in period
- **Per-topic cards** sorted by on-time rate (best to worst):
  - Topic name, item count, review count
  - On-time percentage with color-coded icon (trophy 90%+, check 75%+, chart 60%+, warning below)
  - Progress bar
  - Perfect/on-time/late breakdown with percentages
  - "Items needing attention" badge when items fall below 60% on-time
- **Expandable topic detail view** (lazy loaded):
  - Item-level stats: Excellent/Good/Needs Work counts
  - Per-item: review count, last review timing, on-time percentage

## Focus Adherence Stats
- Total focus sessions
- Total work/break minutes
- Average adherence
- Best adherence

## Streak Calendar
- Full-year calendar view with year navigation
- Visual calendar showing study activity
- Color-coded days based on activity level
- Current streak highlight
- Loaded independently of date range (always all-time data)

---

# Part 5: Settings & Account

## Profile
- Display name update
- Email display (read-only)

## Preferences
- Theme toggle (Light/Dark mode)
- System preference detection

## Subscription
- 14-day free trial (auto-starts on signup)
- Trial banner showing days remaining
- Trial status display in settings
- Premium tier (monthly/yearly via Stripe)
- Subscription status display
- Upgrade/manage subscription links to https://www.retentive.site/dashboard
- Cancel subscription option
- Access guard redirects to paywall when trial/subscription expires

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
- **Points popup** - Animated display when earning points
- **Header stats bar** - Shows total points, level progress, and streak in header

## Leveling
- Current level display
- Progress bar to next level
- Dynamic level requirements (exponential growth)

## Streaks
- Current streak (consecutive review days)
- Longest streak tracking
- Visual indicators (fire emoji 30+ days, star emoji 7+ days)
- Streak warning when < 4 hours remaining

## Achievements (24 total)

### Reviews (6)
| Achievement | Description | Points |
|-------------|-------------|--------|
| First Steps | Complete your first review | 10 |
| Getting Started | Complete 10 reviews | 25 |
| Dedicated Learner | Complete 50 reviews | 50 |
| Century | Complete 100 reviews | 100 |
| Knowledge Seeker | Complete 500 reviews | 250 |
| Master Scholar | Complete 1000 reviews | 500 |

### Streaks (5)
| Achievement | Description | Points |
|-------------|-------------|--------|
| Three's Company | Maintain a 3-day streak | 25 |
| Week Warrior | Maintain a 7-day streak | 50 |
| Fortnight Fighter | Maintain a 14-day streak | 100 |
| Monthly Master | Maintain a 30-day streak | 200 |
| Unstoppable | Maintain a 100-day streak | 500 |

### Mastery (4)
| Achievement | Description | Points |
|-------------|-------------|--------|
| First Mastery | Master your first item | 25 |
| Knowledge Base | Master 10 items | 75 |
| Expert | Master 50 items | 200 |
| Centurion | Master 100 items | 400 |

### Focus (4)
| Achievement | Description | Points |
|-------------|-------------|--------|
| Focused | Complete your first focus session | 10 |
| Hour of Power | Complete 1 hour of focused work | 50 |
| Deep Worker | Complete 10 hours of focused work | 150 |
| Laser Focus | Complete a session with 100% adherence | 50 |

### Milestones (5)
| Achievement | Description | Points |
|-------------|-------------|--------|
| Rising Star | Reach level 5 | 50 |
| Veteran | Reach level 10 | 100 |
| Legend | Reach level 20 | 250 |
| Point Collector | Earn 1000 total points | 50 |
| Point Master | Earn 10000 total points | 200 |

- Toast notifications on unlock

---

# Part 7: System Features

## Real-time Updates
- Supabase real-time subscriptions for data changes
- Auto-refresh when data changes on another device/tab
- Network recovery with automatic session refresh
- Connection status monitoring

## Offline Support
- Installable as app (Add to Home Screen)
- Static assets cached for fast loading
- Offline mode indicator (toast at bottom of screen)
- Offline disclaimer banner (dismissible)
- **Note:** Changes made offline will be lost

## Notifications
- Focus goal reached (browser notification, requires permission)
- Achievement unlock (toast)
- Streak warning (in-app)

## Theme
- Light mode
- Dark mode
- System preference detection
- Manual toggle in settings
- Persistence to localStorage

## Caching
- In-memory cache with TTL (clears on page refresh)
- LocalStorage cache for persistent data caching
- Request deduplication
- Cache invalidation on mutations

## UI/UX
- **Mobile responsive** - Hamburger menu on mobile, full nav on desktop
- **Sticky header** with navigation
- **Toast notifications** (success, error, warning, info) with auto-dismiss
- **Loading skeletons** for async content
- **Confirm dialogs** for destructive actions
- **Error boundaries** for graceful error handling
- **Pagination** with customizable page sizes
- **Lazy loading** with retry logic for pages (handles deployment cache mismatches)
- **Hash-based routing** (works on all static hosts)

## Analytics
- Vercel Analytics integration for usage tracking

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

// Subject
interface Subject {
  id: string
  user_id: string
  name: string
  description?: string | null
  icon: string
  color: string
  display_order: number
  created_at: string
  updated_at: string
}

// Topic
interface Topic {
  id: string
  user_id: string
  name: string
  subject_id?: string | null
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

// Quick Reminder
interface QuickReminder {
  id: string
  user_id: string
  content: string
  completed: boolean
  created_at: string
  updated_at: string
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

### Color Palette

#### Light Mode
| Color | Hex | Usage |
|-------|-----|-------|
| ![#2d3748](https://via.placeholder.com/12/2d3748/2d3748.png) Dark Blue-Gray | `#2d3748` | Primary, text |
| ![#1a202c](https://via.placeholder.com/12/1a202c/1a202c.png) Darker Blue-Gray | `#1a202c` | Primary dark |
| ![#fffef9](https://via.placeholder.com/12/fffef9/fffef9.png) Cream | `#fffef9` | Background, secondary |
| ![#f7f5f0](https://via.placeholder.com/12/f7f5f0/f7f5f0.png) Light Cream | `#f7f5f0` | Background secondary |
| ![#ffffff](https://via.placeholder.com/12/ffffff/ffffff.png) White | `#ffffff` | Surface (cards) |
| ![#4299e1](https://via.placeholder.com/12/4299e1/4299e1.png) Sky Blue | `#4299e1` | Accent, info, links |
| ![#48bb78](https://via.placeholder.com/12/48bb78/48bb78.png) Green | `#48bb78` | Success, mastered |
| ![#ed8936](https://via.placeholder.com/12/ed8936/ed8936.png) Orange | `#ed8936` | Warning, due |
| ![#f56565](https://via.placeholder.com/12/f56565/f56565.png) Red | `#f56565` | Error, overdue |
| ![#e2e8f0](https://via.placeholder.com/12/e2e8f0/e2e8f0.png) Light Gray | `#e2e8f0` | Borders |
| ![#718096](https://via.placeholder.com/12/718096/718096.png) Medium Gray | `#718096` | Secondary text |

#### Dark Mode
| Color | Hex | Usage |
|-------|-----|-------|
| ![#e2e8f0](https://via.placeholder.com/12/e2e8f0/e2e8f0.png) Light Gray | `#e2e8f0` | Primary, text |
| ![#0f1419](https://via.placeholder.com/12/0f1419/0f1419.png) Very Dark | `#0f1419` | Background |
| ![#1a202c](https://via.placeholder.com/12/1a202c/1a202c.png) Dark Blue-Gray | `#1a202c` | Secondary, background alt |
| ![#1e2732](https://via.placeholder.com/12/1e2732/1e2732.png) Dark Surface | `#1e2732` | Surface (cards) |
| ![#2d3748](https://via.placeholder.com/12/2d3748/2d3748.png) Charcoal | `#2d3748` | Borders, hover states |
| ![#63b3ed](https://via.placeholder.com/12/63b3ed/63b3ed.png) Light Sky Blue | `#63b3ed` | Accent, info |
| ![#68d391](https://via.placeholder.com/12/68d391/68d391.png) Light Green | `#68d391` | Success |
| ![#f6ad55](https://via.placeholder.com/12/f6ad55/f6ad55.png) Light Orange | `#f6ad55` | Warning |
| ![#fc8181](https://via.placeholder.com/12/fc8181/fc8181.png) Light Red | `#fc8181` | Error |
| ![#a0aec0](https://via.placeholder.com/12/a0aec0/a0aec0.png) Medium Gray | `#a0aec0` | Secondary text |

#### Gray Scale
| Color | Hex | Name |
|-------|-----|------|
| ![#f7fafc](https://via.placeholder.com/12/f7fafc/f7fafc.png) | `#f7fafc` | gray-50 |
| ![#edf2f7](https://via.placeholder.com/12/edf2f7/edf2f7.png) | `#edf2f7` | gray-100 |
| ![#e2e8f0](https://via.placeholder.com/12/e2e8f0/e2e8f0.png) | `#e2e8f0` | gray-200 |
| ![#cbd5e0](https://via.placeholder.com/12/cbd5e0/cbd5e0.png) | `#cbd5e0` | gray-300 |
| ![#a0aec0](https://via.placeholder.com/12/a0aec0/a0aec0.png) | `#a0aec0` | gray-400 |
| ![#718096](https://via.placeholder.com/12/718096/718096.png) | `#718096` | gray-500 |
| ![#4a5568](https://via.placeholder.com/12/4a5568/4a5568.png) | `#4a5568` | gray-600 |
| ![#2d3748](https://via.placeholder.com/12/2d3748/2d3748.png) | `#2d3748` | gray-700 |
| ![#1a202c](https://via.placeholder.com/12/1a202c/1a202c.png) | `#1a202c` | gray-800 |
| ![#171923](https://via.placeholder.com/12/171923/171923.png) | `#171923` | gray-900 |

---

### Colors - Light Mode

```css
/* Primary */
--color-primary: #2d3748        /* Dark blue-gray */
--color-primary-dark: #1a202c   /* Darker blue-gray */
--color-secondary: #fffef9      /* Cream white */
--color-accent: #4299e1         /* Sky blue */
--color-accent-2: #48bb78       /* Green */

/* Backgrounds & Surfaces */
--color-background: #fffef9     /* Cream background */
--color-background-secondary: #f7f5f0  /* Light cream */
--color-surface: #ffffff        /* White cards */
--color-surface-hover: #f9f9f9  /* Card hover */
--color-border: #e2e8f0         /* Light border */

/* Text */
--color-text-primary: #2d3748   /* Dark gray */
--color-text-secondary: #718096 /* Medium gray */

/* Semantic */
--color-success: #48bb78        /* Green - Mastered */
--color-warning: #ed8936        /* Orange - Due */
--color-warning-light: #fed7aa  /* Light orange */
--color-error: #f56565          /* Red - Overdue */
--color-info: #4299e1           /* Blue - Upcoming */

/* Gray Scale */
--color-gray-50: #f7fafc
--color-gray-100: #edf2f7
--color-gray-200: #e2e8f0
--color-gray-300: #cbd5e0
--color-gray-400: #a0aec0
--color-gray-500: #718096
--color-gray-600: #4a5568
--color-gray-700: #2d3748
--color-gray-800: #1a202c
--color-gray-900: #171923
```

### Colors - Dark Mode

```css
/* Primary - Inverted */
--color-primary: #e2e8f0        /* Light gray */
--color-primary-dark: #cbd5e0   /* Slightly darker */
--color-secondary: #1a202c      /* Dark blue-gray */
--color-accent: #63b3ed         /* Lighter sky blue */
--color-accent-2: #68d391       /* Lighter green */

/* Backgrounds & Surfaces */
--color-background: #0f1419     /* Very dark */
--color-background-secondary: #1a202c  /* Dark blue-gray */
--color-surface: #1e2732        /* Dark surface */
--color-surface-hover: #2d3748  /* Card hover */
--color-border: #2d3748         /* Dark border */

/* Text */
--color-text-primary: #e2e8f0   /* Light gray */
--color-text-secondary: #a0aec0 /* Medium gray */

/* Semantic - Adjusted for dark mode */
--color-success: #68d391        /* Lighter green */
--color-warning: #f6ad55        /* Lighter orange */
--color-error: #fc8181          /* Lighter red */
--color-info: #63b3ed           /* Lighter blue */
```

### Typography

```css
/* Font Families */
--font-serif: 'Bree Serif', Georgia, serif
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono: 'SF Mono', Monaco, 'Cascadia Mono', monospace

/* Font Sizes */
--text-xs: 0.875rem   /* 14px */
--text-sm: 1rem       /* 16px */
--text-base: 1.125rem /* 18px */
--text-lg: 1.25rem    /* 20px */
--text-xl: 1.5rem     /* 24px */
--text-2xl: 1.875rem  /* 30px */
--text-3xl: 2.25rem   /* 36px */
--text-4xl: 3rem      /* 48px */
--text-5xl: 3.75rem   /* 60px */

/* Font Weights */
--font-light: 300
--font-regular: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700

/* Line Heights */
--leading-tight: 1.25
--leading-normal: 1.5
--leading-relaxed: 1.75

/* Letter Spacing */
--tracking-tight: -0.025em
--tracking-normal: 0
--tracking-wide: 0.025em
```

### Typography Classes

```css
.h1 - .h6      /* Heading styles (serif font) */
.body-large    /* Large body text */
.body          /* Default body text */
.body-small    /* Small body text */
.caption       /* Caption text (smallest) */
.label         /* Uppercase label text */
```

### Spacing (8px grid)

```css
--space-0: 0
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
--space-20: 5rem     /* 80px */
--space-24: 6rem     /* 96px */
```

### Border Radius

```css
--radius-none: 0
--radius-sm: 0.125rem
--radius-small: 0.25rem
--radius-base: 0.25rem
--radius-md: 0.375rem
--radius-lg: 0.5rem
--radius-full: 9999px
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-base: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)
```

### Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Z-Index Scale

```css
--z-base: 0
--z-dropdown: 10
--z-sticky: 20
--z-fixed: 30
--z-modal-backdrop: 40
--z-modal: 50
--z-popover: 60
--z-tooltip: 70
```

### Container Widths

```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
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
- d3-force: ^3.0.0 (mindmap physics)
- uuid: ^9.0.1
- @vercel/analytics: ^1.6.1

### Dev
- vite: ^7.0.4
- vite-plugin-pwa: ^1.2.0 (PWA/Service Worker)
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
│   ├── ui/                     # Button, Card, Input, Modal, Toast, Pagination, etc.
│   ├── layout/                 # HeaderFixed, Grid, QuickRemindersPopup
│   ├── home/                   # QuickStats, ReviewStatusCards, LastStudiedBanner, StudyProgress, GettingStartedGuide
│   ├── focus/                  # FocusTimer, SessionSummary, BreakActivityModal, EditSessionModal, etc.
│   ├── gamification/           # PointsPopup, LevelProgress, StreakIndicator, AchievementNotification, etc.
│   ├── stats/                  # TimingPerformance, FocusAdherenceStats, StreakCalendar
│   ├── settings/               # SubscriptionStatus, DataManagement
│   ├── subjects/               # SubjectHeader, SubjectEditModal, SubjectCreateModal, SubjectSelector
│   ├── mindmap/                # MindmapView, MindmapCanvas, MindmapNode, useForceSimulation
│   └── topics/                 # TopicList, TopicCard, TopicForm, ArchiveInsights
├── pages/
│   ├── HomePage.tsx
│   ├── TopicsPage.tsx
│   ├── TopicDetailView.tsx
│   ├── NewTopicPage.tsx
│   ├── StatsPage.tsx
│   ├── SettingsPage.tsx
│   ├── LoginPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── PaywallPage.tsx
│   └── PaymentSuccess.tsx
├── services/
│   ├── supabase.ts             # Supabase client
│   ├── authFixed.ts            # Auth service
│   ├── dataService.ts          # Topics/Items CRUD
│   ├── subjectService.ts       # Subjects CRUD
│   ├── gamificationService.ts  # Points, levels, achievements
│   ├── focusTimerService.ts    # Focus sessions
│   ├── spacedRepetitionGamified.ts  # SR algorithm with gamification
│   ├── statsService.ts         # Statistics
│   ├── timingStatsService.ts   # Timing/adherence stats
│   ├── realtimeService.ts      # Supabase real-time subscriptions
│   ├── subscriptionService.ts  # Stripe/payment subscriptions
│   ├── trialService.ts         # Trial management
│   ├── quickRemindersService.ts # Quick reminders CRUD
│   ├── networkRecovery.ts      # Network reconnection handling
│   ├── cacheService.ts         # In-memory cache
│   └── localStorageCache.ts    # Persistent localStorage cache
├── hooks/
│   ├── useAuth.tsx             # Auth context hook
│   ├── useAuthFixed.tsx        # Fixed auth hook
│   ├── useFocusTimer.ts        # Focus timer state
│   ├── useAchievements.tsx     # Achievement notifications
│   ├── useOnlineStatus.tsx     # Online/offline detection
│   ├── useAutoSave.ts          # Auto-save for forms
│   └── usePagination.ts        # Pagination logic
├── contexts/
│   └── ThemeContext.tsx
├── config/
│   ├── gamification.ts         # Gamification constants
│   └── icons.tsx               # Icon configuration
├── constants/
│   ├── learning.ts             # Learning mode constants
│   └── subjects.ts             # Subject presets
├── types/
│   ├── database.ts             # TypeScript interfaces
│   ├── subject.ts              # Subject types
│   └── subscription.ts         # Subscription types
├── utils/
│   ├── validation.ts
│   ├── errors.ts
│   ├── logger.ts
│   ├── icons.ts                # Icon utilities
│   └── supabase.ts             # Retry/error handling
└── styles/
    ├── variables.css           # CSS custom properties
    ├── typography.css          # Typography classes
    └── animations.css          # Animation keyframes

```
