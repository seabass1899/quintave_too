# Quintave Alignment Decision Engine v1

Replace:

`src/features/today/todayEngine.js`

with:

`src/features/today/todayEngine.js` from this package.

## What changed

- Adds `decision` object to each generated plan.
- Computes primary blocker, secondary blocker, strongest domain, strategy, instability flags, recent practices, and explanation.
- Scores practices using domain blocker match, onboarding/live score weakness, phase fit, recovery mode, high leverage, deterministic user seed, and recent-repeat penalties.
- Preserves day-level duplicate prevention across Morning, Midday, and Evening.
- Preserves Today plan snapshotting, phase locking, streak logic, failure/recovery state, and scoring.
- Bumps `TODAY_PLAN_VERSION` to `7`, forcing a new plan snapshot after deploy.

## New plan output

The generated plan now includes:

```js
plan.decision = {
  version: 'alignment-decision-v1',
  primaryBlockerId,
  secondaryBlockerId,
  strongestDomainId,
  reason,
  strategy,
  explanation,
  instabilityFlags,
  domainDiagnostics,
  recentPracticeKeys,
}
```

## Testing

After deploying, clear localStorage key:

`q_today_plan`

Then reload. Confirm:

- Morning, Midday, Evening do not repeat the same exact practice in one day.
- Different testers receive different alignments when onboarding or history differs.
- “Why this practice is here” is more specific.
- Recovery/missed-day behavior still works.
