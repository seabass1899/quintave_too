# Source Anchoring Architecture v1

## Purpose
This patch makes Source structurally present in the Morning phase without treating Source as a weak or drifting body.

## Core rule
Morning now follows:

1. Source Anchor — Required
2. Primary movable-body attunement — Critical
3. Optional support — Optional

Source is selected as the reference field. Form, Field, Mind, and Code remain the movable bodies that drift and require correction.

## What changed
- Added `SOURCE_ANCHOR_POOL`.
- Morning always includes exactly one d1 Source anchor when possible.
- Source anchor receives its own explanation:
  "Source anchor selected to establish the reference field before correcting the movable bodies."
- Primary attunement language now uses "primary attunement body" instead of correction-only framing.
- Same-day duplicate prevention remains intact.
- Today plan version bumped to force regeneration.

## Expected Morning behavior
Examples:
- Observer Drill + Somatic Body Scan + Hydration Protocol
- Stillness Exposure + Pattern Interrupt + Sun + Circadian Anchor
- Non-Local Body Scan + Morning Directive + Breathwork

## Test
After deployment run:

```js
localStorage.removeItem('q_today_plan')
location.reload()
```

Then verify Morning always contains one Source-tagged practice.
