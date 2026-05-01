# Quintave — Deployment Guide

## What's in this folder

```
quintave/
├── index.html          ← App entry point
├── vite.config.js      ← Build config
├── package.json        ← Dependencies
├── public/
│   └── icon.svg        ← App icon
└── src/
    ├── main.jsx        ← React entry
    └── App.jsx         ← Full app (all components + logic)
```

---

## Option A — Deploy to Vercel (Recommended, Free, 5 minutes)

### Step 1 — Create a GitHub repo

1. Go to github.com and sign in (or create a free account)
2. Click **New repository**
3. Name it `quintave`, set to Public, click **Create repository**
4. Upload all files in this folder to the repo (drag and drop in the GitHub UI)

### Step 2 — Deploy on Vercel

1. Go to **vercel.com** and sign in with your GitHub account
2. Click **Add New Project**
3. Select your `quintave` repo
4. Vercel will auto-detect it as a Vite project
5. Click **Deploy**

That's it. You'll get a live URL like:
```
https://quintave.vercel.app
```

### Step 3 — Install on your phone

**iPhone:** Open the URL in Safari → tap the Share icon → "Add to Home Screen"
**Android:** Open in Chrome → tap the 3-dot menu → "Add to Home Screen"

This makes it feel like a native app with your own icon on the home screen.

---

## Option B — Run locally (Development)

```bash
# Install dependencies (one time)
npm install

# Start local server
npm run dev

# Open in browser
http://localhost:5173
```

---

## Option C — Build for production (manual hosting)

```bash
npm install
npm run build
```

This creates a `dist/` folder you can upload to any static hosting service
(Netlify, GitHub Pages, Cloudflare Pages, etc.)

---

## Data storage

Your data is currently stored in **browser localStorage**.
This means:
- ✅ Works offline
- ✅ Completely private (never leaves your device)
- ⚠️ Data is tied to the browser/device you use
- ⚠️ Clearing browser data will erase it (use the Export feature regularly)

### To add cloud sync (next step)

When you're ready to sync data across devices or add user accounts,
the recommended stack is **Supabase** (free tier):

1. Create a free account at supabase.com
2. Create a `practices` table with columns: user_id, date, domain, practice_key, completed, rating, note
3. Install the Supabase client: `npm install @supabase/supabase-js`
4. Replace the localStorage calls in App.jsx with Supabase queries

This unlocks: multi-device sync, user accounts, data backup, and the
practitioner dashboard feature described in the product concept document.

---

## Custom domain

Once deployed on Vercel:
1. Go to your project settings → Domains
2. Add your own domain (e.g. quintave.app, myapp.com)
3. Follow Vercel's DNS instructions (takes ~10 minutes)

---

## Support

Built with React 18 + Vite 4. No external dependencies beyond React.
All data stays in your browser unless you add Supabase.
