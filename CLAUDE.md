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

## Current Status (Last Updated: Phase 4 Complete)
- ✅ Project initialized with Vite + React + TypeScript + Electron
- ✅ Git repository configured with comprehensive .gitignore
- ✅ Supabase client library installed and configured
- ✅ Environment files created (.env, .env.example)
- ✅ Supabase credentials added and connection verified
- ✅ Prettier installed and configured for code formatting
- ✅ Project folder structure created (src/components, services, hooks, utils, styles)
- ✅ ESLint configured with React and Electron rules
- ✅ TypeScript interfaces for all data models created
- ✅ Constants for learning modes and spaced repetition defined
- ✅ AuthService class implemented with full authentication flow
- ✅ DataService class implemented with CRUD operations
- ✅ SpacedRepetitionService class with algorithm implementation
- ✅ Utility functions created (date, validation, format)
- ✅ Database schema created in Supabase
- ✅ Swiss design system with Bree Serif font and cream background
- ✅ Base UI components created (Button, Input, Card, Modal, Loading, Toast)
- ✅ React Router installed and configured
- ✅ Authentication hooks (useAuth, useUser) created
- ✅ Login/Register page with form validation
- ✅ Layout components (Header, Layout) created
- ✅ TopicForm component for creating new topics
- ✅ Protected routes for authenticated users
- ✅ TopicList with inline review functionality (single Study button)
- ✅ Search includes both topics and subtopics
- ✅ Mastery system (items marked as mastered after 5 reviews)
- ✅ Dashboard with real-time stats and progress metrics
- ✅ Stats page with charts and analytics
- 🔄 Next: Phase 5.1 - Settings Management

## Key Commands
- `npm run dev:electron` - Run app in development mode
- `npm run build` - Build for production
- `npm run dist` - Package app for distribution
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

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

## Code Standards
- No comments unless requested
- TypeScript strict mode
- Functional React components with hooks
- CSS Modules for styling
- Follow existing code patterns