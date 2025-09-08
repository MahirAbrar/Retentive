# Claude Development Notes

This file contains important information for Claude to remember across sessions.

## Project Context
- Building a Swiss design-inspired spaced repetition learning app
- Using Vite + React + TypeScript + Electron + Supabase
- Following the detailed plan in todolist.md

## Important Files
- `todolist.md` - Master development plan with all phases
- `human-todo.md` - Tasks requiring manual intervention
- `.env` - Environment variables (Supabase credentials)
- `.env.example` - Template for environment setup

## Development Workflow
1. Always check and update todo list when working on tasks
2. When encountering tasks that require manual intervention:
   - Add them to `human-todo.md`
   - Notify the user
   - Continue with tasks that can be automated
3. Run linting and type checking after significant code changes:
   - `npm run lint`
   - `npm run typecheck`

## Current Status (Last Updated: Phase 10 - Mastery System Complete)
- ✅ Core app infrastructure (Vite, React, TypeScript, Electron, Supabase)
- ✅ Complete authentication system with offline support
- ✅ Full CRUD operations for topics and learning items
- ✅ Spaced repetition algorithm with multiple learning modes
- ✅ Swiss design system with dark mode support
- ✅ Gamification system (points, levels, achievements, streaks)
- ✅ Notification system with desktop reminders
- ✅ Offline mode with sync capabilities
- ✅ Advanced mastery system (archive/maintenance/repeat options)
- ✅ Real-time updates and data synchronization
- ✅ Comprehensive stats and analytics dashboard
- 🔄 Next: Release preparation and documentation

## Key Commands
- `npm run dev:electron` - Run app in development mode
- `npm run build` - Build for production
- `npm run dist` - Package app for distribution
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Important User Preferences
- **DO NOT run `npm run dev` or `npm run dev:electron`** - User manages the dev server themselves
- User will tell you which port the app is running on if needed

## Architecture Decisions
- Using Supabase for:
  - Authentication (email/password)
  - Real-time database
  - Row Level Security
  - Future AI integrations via Edge Functions
- Following Swiss design principles:
  - Clean, minimal UI
  - Focus on typography
  - Functional over decorative
  - Clear visual hierarchy

## Code Quality Standards

### Must Follow
- **TypeScript**: Strict mode, all methods fully typed
- **Components**: Functional with hooks, React.memo for heavy components
- **Services**: Singleton pattern, JSDoc comments, error handling
- **Naming**: PascalCase (components), camelCase (functions/methods)
- **Imports**: External → internal → relative
- **CSS**: CSS Modules, design tokens via CSS variables
- **Security**: Input validation, sanitization, secure storage

### Key Patterns
- Services use getInstance() singleton pattern
- All async operations use try-catch with proper error handling
- Components have TypeScript interfaces for all props
- Use absolute imports with path aliases (@/*)
- Effect cleanup in useEffect hooks
- Optimistic updates for better UX

### Before Committing
- Run `npm run lint` and `npm run typecheck`
- Fix all errors and warnings
- Test critical user flows
- Update CLAUDE.md if architecture changes