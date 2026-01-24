# Production Failure Checklist

Quick reference for diagnosing why your app isn't working in production.

---

## Blank Page (Nothing Renders)

### Missing Environment Variables
- **Symptom**: Completely blank page, error only in browser console
- **Check**: Open browser DevTools → Console → Look for "env" or "undefined" errors
- **Fix**: Add env vars in hosting platform (Vercel, Netlify, etc.)
- **Prevention**: Add startup validation that shows friendly error UI

### JavaScript Failed to Load
- **Symptom**: Blank page, network errors in DevTools
- **Check**: DevTools → Network tab → Look for failed .js requests
- **Fix**: Check build output, verify deployment includes all chunks

### Module Export Errors
- **Symptom**: Blank page, "Export X is not defined" in console
- **Check**: DevTools → Console
- **Fix**: Check for `as const` issues, circular dependencies, code splitting race conditions

---

## App Loads But Features Broken

### CORS Errors
- **Symptom**: API calls fail, "CORS policy" errors in console
- **Check**: DevTools → Console → Network tab
- **Fix**: Configure backend/Supabase to allow your domain

### API/Database Connection Failed
- **Symptom**: App loads but data doesn't appear, loading spinners forever
- **Check**: DevTools → Network tab → Look for failed API requests
- **Fix**: Verify API URL env vars, check Supabase dashboard for issues

### Wrong Environment Variables
- **Symptom**: App works but connects to wrong database/API
- **Check**: Verify env vars point to production, not development
- **Fix**: Update env vars in hosting platform

---

## Build Succeeds, Runtime Fails

### Development-Only Code in Production
- **Symptom**: Works in dev, breaks in prod
- **Check**: Look for `process.env.NODE_ENV` checks, dev-only imports
- **Fix**: Ensure all code paths work in production mode

### Minification Issues
- **Symptom**: Build passes, runtime errors about undefined
- **Check**: Try building with `minify: false` to isolate
- **Fix**: Check for issues with `as const`, unusual export patterns

---

## Quick Debugging Steps

1. **Open DevTools Console** - Most errors show here first
2. **Check Network Tab** - See if resources loaded, API calls succeeded
3. **Try Incognito Mode** - Rules out cache/extension issues
4. **Check Hosting Logs** - Vercel/Netlify have deployment logs
5. **Compare with Local Build** - Run `npm run build && npm run preview`

---

## Prevention Checklist

- [ ] Add startup validation component (catches missing config)
- [ ] Add HTML fallback content (visible if JS fails)
- [ ] Use ErrorBoundary components (catches React errors)
- [ ] Log errors to monitoring service (Sentry, etc.)
- [ ] Test production build locally before deploying
