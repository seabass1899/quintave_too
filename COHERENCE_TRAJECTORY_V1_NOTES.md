# Coherence Trajectory Engine v1

This patch adds a trajectory layer above the coherence/interference models.

## New file

- `src/features/frequency/coherenceTrajectoryModel.js`

## Patched file

- `src/features/today/todayEngine.js`

## What it does

The engine now reads recent daily plan snapshots, completion history, and day status to determine:

- dominant drift body
- secondary drift body
- most stable body
- recent recovery/stability trend
- recurring risk pattern
- recommendation bias

## Core principle

The app no longer reads only today. It reads direction over time.

## No UI changes required

The existing Today panel continues to work. The new values are available under:

```js
plan.decision.trajectoryState
plan.decision.trajectorySummary
```

## Testing

After deployment, clear the frozen plan:

```js
localStorage.removeItem('q_today_plan')
location.reload()
```

Then inspect:

```js
window.__QUINTAVE_DEBUG__
```

or temporarily log `plan.decision.trajectorySummary` from `DailyFocus.jsx`.
