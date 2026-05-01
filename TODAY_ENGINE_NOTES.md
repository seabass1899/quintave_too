# Quintave Today Engine Update

This build converts the previous passive "Today's focus" recommendation list into a 3-phase daily execution loop.

## User choices implemented

- Strictness: Structured but flexible
- Daily minimum: 4 required actions
- Selection style: Directed
- Feedback tone: Hybrid identity + analytic feedback
- Phase locking: Enabled

## New file

`src/features/today/todayEngine.js`

Exports:

- `generateTodayPlan()`
- `getCurrentPhase()`
- `PHASES`
- `DAILY_MINIMUM`

## Updated file

`src/features/dashboard/DailyFocus.jsx`

The card now shows:

- Morning / Midday / Evening phase progression
- Daily minimum progress bar
- Critical / Required / Adaptive / Optional labels
- Soft phase execution logic
- Locking rule:
  - Midday requires at least 1 Morning action complete
  - Evening requires at least 1 Midday action complete
- Completion feedback:
  - Identity-level reinforcement
  - Analytic domain/cross-domain signal

## Daily structure

Morning = Initialize
- 2 required actions
- Anchors identity, direction, and signal

Midday = Correct
- 1 required action
- Corrects drift and interrupts automatic loops

Evening = Integrate
- 1 required action
- Closes the weakest open loop and prepares the next day

## Deployment

Upload this folder to GitHub and redeploy on Vercel as before.
