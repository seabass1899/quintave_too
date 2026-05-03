# Today Engine Audit — High-Leverage Selection + Scoring

This build locks the Today Engine into three separate layers:

## 1. Selection
- The daily plan is generated once per day and frozen in `q_today_plan`.
- Completing a practice no longer reshuffles the plan.
- High-leverage practices influence priority/visibility and signal impact, but do not replace the phase structure.
- Visualization Practice and other high-leverage practices now surface through the daily rotation instead of being buried.

## 2. Completion
- Critical and Required practices count toward the daily minimum.
- Optional and Adaptive practices can add signal but do not count toward the minimum unless explicitly selected as Critical/Required.
- Morning, Midday, and Evening phase gates remain intact.

## 3. Scoring
- Signal score is now separate from completion count.
- Critical > Required > Adaptive > Optional in base scoring.
- Source-weighted scoring remains in place.
- High-leverage practices receive a 1.3x signal multiplier.
- Cross-domain ripple contributes additional signal to linked domains.

## Verification
After deploying this build, clear localStorage once to regenerate the new plan version:

```js
localStorage.clear(); location.reload();
```

Then verify:

1. The Morning plan remains unchanged after each checkbox.
2. Critical/Required practices count toward the minimum.
3. Optional practices add signal but do not count toward minimum.
4. High-leverage practices show the High leverage badge.
5. Signal score increases more strongly for high-leverage cross-domain practices.
