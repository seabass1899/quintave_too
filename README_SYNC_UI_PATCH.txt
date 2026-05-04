Quintave Supabase Sync UI Patch

Files included:
- src/app/App.jsx
- src/features/auth/AuthBox.jsx
- src/features/sync/SyncControls.jsx
- src/app/services/syncService.js

Install/verify before deploying:
1. npm install @supabase/supabase-js
2. Ensure src/app/supabaseClient.js exists.
3. Ensure .env.local and Vercel env vars contain:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
4. Ensure Supabase tables and RLS policies exist:
   user_state, user_events, feedback

What changed:
- Added non-blocking Supabase session detection.
- Added Cloud Sync button to the topbar.
- If not signed in, Cloud Sync opens AuthBox.
- If signed in, Cloud Sync shows Sync Progress, Load Cloud Backup, Sign Out.
- Does not change Today Engine, frequency engine, streak, recovery, or feedback logic.

Recommended test:
1. Deploy to dev.
2. Open app with no session: app still loads; Cloud Sync button appears.
3. Click Cloud Sync and sign in with magic link.
4. Confirm Cloud ✓ appears.
5. Click Sync Progress and verify user_state row in Supabase.
6. Clear localStorage, reload, sign in, click Load Cloud Backup.
