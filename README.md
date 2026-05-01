# Quintave

**A coherence instrument for the five frequency bodies.**

Quintave is a daily tuning practice built on a framework that recognizes the human being as five distinct frequency bodies — each requiring deliberate attention, each influencing the others. When all five are in coherence with Source, the experience of life shifts fundamentally.

[![Live App](https://img.shields.io/badge/Live%20App-quintave.vercel.app-7F77DD)](https://quintave.vercel.app)
[![Landing Page](https://img.shields.io/badge/Landing%20Page-View-1D9E75)](https://quintave.vercel.app/landing.html)

---

## The five frequency bodies

| # | Body | Role | Practices |
|---|------|------|-----------|
| ✦ | **Source** | The eternal self — the tuning fork everything calibrates to | 6 |
| ♥ | **Form** | The physical vessel — the instrument the soul chose | 8 |
| ∿ | **Field** | The emotional body — resonance, charge, and release | 7 |
| ◈ | **Mind** | The conscious director — intention, belief, deliberate will | 7 |
| ☽ | **Code** | The subconscious operating system — patterns running 95% of behavior | 8 |

---

## What Quintave is

Most tools address one dimension of your experience. A fitness app for the body. A meditation app for the mind. A journal for emotions. They work in isolation — which is why results are often temporary.

Quintave is built on a different premise: your experience of life is shaped by how well all five frequency bodies are working together. Coherence is not a wellness metric — it is the degree to which your lived experience reflects your deepest nature.

The practices are not habits to be tracked. They are tuning protocols — each one with a mechanism, a 3-step sequence, a beginner version, and a measurement approach. The goal is not completion. It is alignment.

---

## Features

**Daily practice system**
- 36 tuning practices across all five frequency bodies
- Full protocol for every practice — mechanism, 3-step sequence, beginner version, measurement
- Cross-impact scoring — practices ripple across dimensions
- High-leverage badges for practices that lift 2+ frequency bodies simultaneously

**Three daily modes**
- ☀ **Morning Mode** — 7-practice sequence to set the frequency before entering the field
- ◈ **Midday Mode** — 5-practice reset to recalibrate mid-day
- ☽ **Evening Mode** — 5-practice integration to process and close the day

**Coherence intelligence**
- 15-question baseline assessment producing a personal coherence signature
- Coherence mirror — resonance signature, 30-day trajectory, mastery thresholds, primary interference
- Five coherence states: Scattered → Stirring → Grounding → Aligning → Whole
- Shareable coherence signature card with pentagon radar

**Structure and progression**
- 30-day Gentle Foundation, 60-day Full Integration, 90-day Mastery programs
- First 7-day guided path for new users
- Adaptive Schedule — surfaces priority practices based on your weakest frequency body
- Practice streaks and milestone celebrations

**Tools**
- System Map — interactive diagram of how the five bodies relate and cascade
- Domain deep-dives — 30-day trend, mastery thresholds, practice roster per body
- Daily Noise Audit — interference log that feeds into the coherence trajectory
- Practitioner / Coach View — copyable weekly resonance report for sessions
- Assessment history — tracks coherence signature evolution over retakes

**The Foundation**
- 11 expandable philosophical principles — the cosmological bedrock of the system
- Covers: what you are, the game board architecture, frequency planes, the mind as control interface, energy economy, intent as execution force

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build tool | Vite 4 |
| Styling | Inline styles — no CSS frameworks |
| Storage | Browser localStorage — nothing leaves your device |
| Hosting | Vercel |
| Dependencies | React only — no external UI libraries |

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- npm (included with Node)

### Run locally

```bash
git clone https://github.com/seabass1899/Quintave.git
cd Quintave
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

---

## Deploy to Vercel

1. Fork or clone this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) and connect your GitHub
3. Select this repo and click **Deploy**
4. Vercel auto-detects the Vite config
5. Live at your-project.vercel.app

### Install on your phone as an app

**iPhone:** Open your Vercel URL in Safari → Share → Add to Home Screen

**Android:** Open in Chrome → three-dot menu → Add to Home Screen

---

## Project structure

```
quintave/
├── public/
│   ├── icon.svg              — App icon
│   ├── landing.html          — Landing page
│   └── manifest.json         — PWA manifest
├── src/
│   ├── data.js               — Single source of truth: DOMAINS, PRACTICES, COHERENCE_STATES
│   ├── protocols.js          — Full protocol library for all 36 practices
│   ├── App.jsx               — Main application, state, tab routing
│   ├── Onboarding.jsx        — 15-question baseline assessment
│   ├── MorningMode.jsx       — Morning practice sequence
│   ├── MiddayMode.jsx        — Midday reset sequence
│   ├── EveningMode.jsx       — Evening integration sequence
│   ├── CoherenceSignature.jsx — Shareable resonance card
│   ├── SystemMap.jsx         — Interactive five-body diagram
│   ├── DomainDeepDive.jsx    — Per-domain deep-dive modal
│   ├── Foundation.jsx        — Philosophical principles tab
│   ├── Programs.jsx          — 30/60/90-day structured programs
│   ├── NoiseAudit.jsx        — Daily interference log
│   └── PractitionerView.jsx  — Coach / practitioner report
├── index.html
├── vite.config.js
└── package.json
```

---

## Data & privacy

All data — practices, scores, notes, assessments, history — is stored exclusively in your browser localStorage. Nothing is sent to any server. Use the **Save** button in the topbar regularly to export a backup file.

---

## Roadmap

- [ ] Notification system — scheduled morning, midday, and evening reminders
- [ ] Cloud sync — cross-device access
- [ ] Guided audio — voice-led practice sequences
- [ ] Wearable integration — HRV and sleep data from Oura, Whoop, Apple Health
- [ ] AI synthesis — weekly coherence insights from practice patterns
- [ ] Practitioner dashboard — multi-client view for coaches

---

## About

Quintave was built on the recognition that you are not a body with a mind. You are a Source fractal — a deathless awareness that chose a physical instrument for this experience. The five frequency bodies are not parts of you. They are dimensions of your expression.

The practices are not here to fix you. They are here to help you remember what you already are.

> *"Your best life is not built. It is revealed."*
