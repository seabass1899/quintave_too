# Security & UX Audit — 2026-11-03

Scope: everything in this repository (React/Vite client, `public/landing.html`,
`vercel.json`, CI, lockfiles). **Not in scope because it is not in the repo:**
Supabase SQL / Row-Level-Security policies, the `delete-account` and billing
Edge Functions, and the Stripe webhook. Those hold the real security boundary
for this app and should be reviewed next (see "Still to do").

## Fixed in this change

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | High (supply chain / build) | `package-lock.json` resolved all 82 packages from a private, unreachable registry (`packages.applied-caas-gateway1.internal.api.openai.org`). Installs hang or fail outside that sandbox, and the lock was also out of sync with `package.json` (`npm ci` failed). | Lockfile regenerated against `registry.npmjs.org`; `npm ci` now succeeds. |
| 2 | Medium | Two lockfiles (`package-lock.json` + `pnpm-lock.yaml`) pinning different versions (e.g. supabase-js 2.105 vs 2.118). The host may build with either one. | Removed `pnpm-lock.yaml`; npm is the single package manager. |
| 3 | Medium | No HTTP security headers (no CSP, HSTS, framing protection). | `vercel.json` now sends CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP. Verified in Chromium: landing + app render with zero CSP violations. |
| 4 | Medium | Share-card feature injected `html2canvas` from cdnjs at runtime with no Subresource Integrity — a CDN compromise would run arbitrary JS with access to the Supabase session token in localStorage. | `html2canvas@1.4.1` bundled as a dependency and lazy-loaded via `import()` (own 48 KB gz chunk). No third-party scripts remain. |
| 5 | Low | Stripe checkout opened with `window.open(url, '_blank')` without `noopener`. | Added `'noopener,noreferrer'`. |
| 6 | Low (availability) | App crashed to the error screen when Supabase env vars are missing (`null.auth` in `useCloudSync.js`). | Guarded; app runs in local-only mode. |
| 7 | Low (hygiene) | No `.gitignore` — `node_modules/`, `dist/`, `.env*` could be committed (repo is uploaded via the GitHub web UI). | Added `.gitignore`. |

## Reviewed, no issue found

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` in app code; user text (notes, feedback) is rendered through React escaping.
- No secrets in the repo. Only the Supabase **anon** key and Stripe Payment Link URLs are exposed via `VITE_*`, which is by design.
- Auth uses email OTP; `detectSessionInUrl` off.
- Premium entitlement is read from a server-written `subscriptions` table and fails closed to `free`.
- Production dependencies: `npm audit --omit=dev` → 0 vulnerabilities.

## Accepted / informational

- **Client-side premium gating.** Premium analytics are computed in the browser from the user's own local data, so a technical user can unlock them in devtools (the hidden Ctrl+Alt+T "tester mode" also exposes some extra tools). That's an entitlement leak, not a data leak. If it matters, move premium computation server-side.
- **Session token in localStorage** (Supabase default). Acceptable given the CSP and the lack of third-party scripts; keep it that way.
- **Dev-only advisories** (8: Vite 4, esbuild, postcss, nanoid, …) affect the local dev server/build only, not shipped code. Fix by upgrading to Vite 6+ and `@vitejs/plugin-react` 4.3+.

## Still to do (needs code that isn't in this repo)

1. Confirm RLS on `user_state`, `subscriptions`, `feedback`, `user_events`: users may only read/write rows where `user_id = auth.uid()`; `subscriptions` must have **no** client insert/update policy.
2. `delete-account` Edge Function: derive the user from the JWT, never from the request body.
3. Stripe webhook: verify the signature; treat `client_reference_id` as untrusted and map it against the Stripe customer/email.
4. The CSP `connect-src` is pinned to the project host `kwuplcrwzlpgbpzsnzgs.supabase.co`. If the Supabase project or domain ever changes, update it in `vercel.json`.

## UI / UX check (headless Chromium, 1366×900 and 390×844)

- No horizontal scrolling, no unlabeled buttons or inputs, no undersized tap targets detected on either page.
- Copy is inconsistent: landing/onboarding say "four bodies" in some places and "five frequencies" in others, and the onboarding says 25 questions while the README says 15.
- Landing page has no `<meta name="description">` or Open Graph tags (bad link previews when shared). The app shell has no `<h1>`.
- Main JS bundle is 1.05 MB (298 KB gz); code-splitting the tabs would speed up first load on mobile.
