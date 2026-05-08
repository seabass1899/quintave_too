# Quintave Coherence-State Simulation v1

## What changed

This patch begins the transition from score correction to coherence-state simulation.

### New file
`src/features/frequency/coherenceStateModel.js`

This file treats Source as the fixed core reference and models Form, Field, Mind, and Code as movable frequency bodies.

### Updated file
`src/features/today/todayEngine.js`

The Today Engine now uses the coherence-state model when building `plan.decision`.

## Core model

- Source is fixed, present from Level 5 through Level 11.
- Source is not treated as injured, stressed, weak, or behind.
- Source accessibility is calculated from the state of the four movable bodies.
- Form, Field, Mind, and Code are mapped to dimensional planes and sub-planes.
- The primary attunement body is the movable body with the greatest coherence drag from Source.

## Safe deployment

After replacing the files, clear today’s frozen plan:

```js
localStorage.removeItem('q_today_plan')
location.reload()
```

## Expected visible behavior

The Today panel should continue working as before, but its decision logic should be more aligned with:

- Core reference: Source
- Primary attunement body: Form/Field/Mind/Code
- Source accessibility through movable-body harmony
- Red/Blue/Gray plane awareness internally

