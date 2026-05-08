# Quintave Drift & Interference System v1

This patch adds the first interference simulation layer under the existing coherence-state engine.

## Files

- `src/features/frequency/interferenceStateModel.js` — new model layer
- `src/features/frequency/coherenceStateModel.js` — now consumes interference state
- `src/features/today/todayEngine.js` — decision logic now considers drift pressure, recovery state, overload risk, and adaptation bias

## What it models

- missed-day drift pressure
- recovery-first state
- stabilization momentum
- overload risk from repeated skipped assignments
- per-body interference pressure for Form / Field / Mind / Code
- adaptation bias: baseline, lower-friction, reinforce-momentum, or increase-depth

## What it does not model yet

- meat/interference self-reporting
- Cynrgycl depletion/forfeiture mechanics
- explicit user-facing sub-plane controls
- admin diagnostics UI

## Safe test

After deploy, clear only the frozen daily plan:

```js
localStorage.removeItem('q_today_plan')
location.reload()
```

Expected: the Alignment Read may show strategies such as recovery-first, red-zone elevation, overload reduction, or interference-pressure stabilization depending on user state.
