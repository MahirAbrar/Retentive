# Offline Testing Guide

This app now includes comprehensive offline support with SQLite database and bi-directional sync.

## How to Test Offline Functionality

### 1. Start the App
```bash
npm run dev:electron
```

### 2. Create Some Data While Online
- Sign in to your account
- Create a few topics
- Add some learning items
- Complete some reviews to generate points and streaks

### 3. Go Offline
- Turn off your WiFi or disconnect from the internet
- Notice the sync status indicator in the header changes from "Online" to "Offline"

### 4. Test Offline Operations
While offline, try these operations:
- Create new topics
- Add learning items
- Complete reviews
- Check that your points and streaks still update
- Navigate between pages

### 5. Monitor Pending Operations
- The sync status will show the number of pending operations
- All changes are queued locally in SQLite

### 6. Go Back Online
- Reconnect to the internet
- The sync status will change back to "Online"
- Click the "Sync" button to manually sync, or wait for auto-sync
- Watch as pending operations count goes to 0

## Features Included

### Local Database (SQLite)
- Complete mirror of Supabase schema
- All data stored locally for instant access
- Works completely offline

### Bi-directional Sync
- Pull changes from server
- Push local changes to server
- Automatic conflict resolution

### Conflict Resolution Strategy
- **Topics**: Last write wins based on updated_at
- **Learning Items**: Content uses last write wins, review data merges
- **Gamification Stats**: Takes higher values (points, levels, streaks)
- **Daily Stats**: Sums the values
- **Review Sessions**: Append-only (no conflicts)
- **Achievements**: Append-only (no conflicts)

### Visual Indicators
- Online/Offline status dot (green/red)
- Pending operations count
- Manual sync button when needed

## Architecture

### Services Updated for Offline
- `offlineService.ts` - Main offline data service
- `dataServiceOffline.ts` - Offline-first data service
- `gamificationServiceOffline.ts` - Offline-first gamification
- `authFixed.ts` - Updates offline service on auth changes

### Electron Components
- `localDatabase.ts` - SQLite database setup
- `offlineDataService.ts` - CRUD operations for offline data
- `syncEngine.ts` - Bi-directional sync logic
- `conflictResolver.ts` - Conflict resolution strategies
- `databaseHandlers.ts` - IPC handlers for database ops

### React Components
- `SyncStatus.tsx` - Visual sync status indicator
- `useOnlineStatus.tsx` - Hook for online/offline state

## Testing Checklist

- [ ] App works fully offline
- [ ] All CRUD operations work offline
- [ ] Gamification (points, streaks, achievements) work offline
- [ ] Data persists between app restarts
- [ ] Sync works when going back online
- [ ] Conflicts are resolved correctly
- [ ] No data loss during sync
- [ ] Visual indicators show correct status