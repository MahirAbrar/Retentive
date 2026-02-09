# Claude Development Notes

This file contains important information for Claude to remember across sessions.

## Project Context
- Building a Swiss design-inspired spaced repetition learning app
- Using Vite + React + TypeScript + Supabase as a Progressive Web App (PWA)
- Following the detailed plan in todolist.md

## Important Files
- `todolist.md` - Master development plan with all phases
- `human-todo.md` - Tasks requiring manual intervention
- `docs/BaseFeatures.md` - Feature documentation (MUST be updated when adding/removing features)
- `.env` - Environment variables (Supabase credentials with VITE_ prefix)
- `.env.example` - Template for environment setup

## Feature Documentation
**IMPORTANT:** When adding or removing any feature, you MUST update `docs/BaseFeatures.md` to reflect the change. This file serves as the source of truth for all app features.

## Development Workflow
1. Always check and update todo list when working on tasks
2. When encountering tasks that require manual intervention:
   - Add them to `human-todo.md`
   - Notify the user
   - Continue with tasks that can be automated
3. Run linting and type checking after significant code changes:
   - `npm run lint`
   - `npm run typecheck`

## Current Status (Last Updated: PWA Migration Complete)
- ✅ Core app infrastructure (Vite, React, TypeScript, Supabase)
- ✅ Complete authentication system
- ✅ Full CRUD operations for topics and learning items
- ✅ Spaced repetition algorithm with multiple learning modes
- ✅ Swiss design system with dark mode support
- ✅ Gamification system (points, levels, achievements, streaks)
- ✅ Web Notification API integration
- ✅ PWA with offline caching via Workbox
- ✅ Advanced mastery system (archive/maintenance/repeat options)
- ✅ Real-time updates and data synchronization
- ✅ Comprehensive stats and analytics dashboard
- ✅ Migrated from Electron to PWA

## Important User Preferences
- **DO NOT run `npm run dev`** - User manages the dev server themselves
- User will tell you which port the app is running on if needed

## Testing Protocol
**IMPORTANT:** When user says "run tests", ONLY run these commands:
- `npm run lint`
- `npm run build`

Keep running them repeatedly and fixing ALL errors until both commands pass completely with zero errors.
Do NOT run other test commands unless explicitly asked.

## Architecture Decisions
- **PWA Architecture**: Progressive Web App with service worker caching
- Using Supabase for:
  - Authentication (email/password)
  - Real-time database
  - Row Level Security
  - Future AI integrations via Edge Functions
- Using vite-plugin-pwa for:
  - Service worker generation (Workbox)
  - App manifest
  - Offline caching
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
- **Security**: Input validation, sanitization

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

## Supabase Migrations
**IMPORTANT:** Always create migration files for ANY SQL changes!
- Location: `supabase-migrations/` (NOT `supabase/migrations/`)
- Naming: `XXX_description.sql` (e.g., `025_fix_has_app_access.sql`)
- Never just give SQL to run - always create the file first
- Include comments explaining what the migration does

## Deployment
Deploy to any static hosting with HTTPS:
- Vercel (recommended)
- Netlify
- Cloudflare Pages

Environment variables needed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
