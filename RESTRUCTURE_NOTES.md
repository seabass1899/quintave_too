# Quintave Restructure Notes

## What changed

This build keeps the existing UI and feature behavior, but reorganizes the project into a cleaner Vite/React structure:

```txt
src/
  app/
    App.jsx
    ErrorBoundary.jsx
    state/
      useLocalStorage.js
    utils/
      scoring.js
  data/
    domainData.js
    protocols.js
    index.js
  features/
    analytics/
    dashboard/
    domains/
    foundation/
    history/
    modes/
    onboarding/
    practitioner/
    programs/
    progress/
    schedule/
    signature/
    system/
  main.jsx
```

## Runtime crash fixed

The previous crash was caused by this mismatch:

```txt
Onboarding expected DOMAINS[].questions
data.js did not provide questions
```

This version adds `questions` arrays to every domain and adds a defensive fallback in onboarding:

```js
(domain.questions || []).map(...)
```

## Deployment path

1. Upload this folder to GitHub.
2. Import the repo into Vercel.
3. Use these Vercel settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

## Next recommended phase

After this runs cleanly on Vercel, the next major improvement should be replacing browser-only localStorage with:

- Supabase Auth
- Supabase Postgres
- Row-level security
- A real user profile table
- Daily logs table
- Practice completions table
- Assessment history table

## 2026-05-01 update: Real assessment data integrated

- Replaced the placeholder domain assessment data in `src/data/domainData.js` with the supplied `data.js` content.
- The onboarding flow now consumes the real 15 assessment questions: 3 questions per domain across Source, Form, Field, Mind, and Code.
- Each question preserves the richer object shape: `q`, `low`, `high`, and `angle`.
- The existing onboarding UI already expects this object shape, so no additional mapping layer was required.

