# Mobile + Retention Update

## What changed

### Mobile polish
- Added mobile-specific layout CSS without changing core engine logic.
- Today card now compresses better on small screens.
- Phase buttons are horizontally scrollable and easier to tap.
- Practice check buttons have larger touch targets on mobile.
- Domain impact grid collapses to two columns on mobile.
- Secondary Today sections can be collapsed behind a "Show supporting details" toggle on mobile.
- Top and tab bars retain horizontal scrolling with touch momentum.

### Retention hooks
- Streak messaging now uses milestone language:
  - 0: No active momentum yet
  - 1–2: Momentum begins
  - 3+: Stability forming
  - 7+: Momentum no longer random
  - 14+: System stabilizing
  - 30+: Alignment continuity becoming default
- Existing milestone toast system remains intact.
- Existing alignment-at-risk and recovery messaging are preserved.

## What did not change
- Today Engine selection logic
- Daily plan freeze behavior
- Frequency math
- Core energy model
- Reopen/recovery logic
- Persistence keys

## Test checklist
1. Open Today on desktop and confirm layout is unchanged enough to remain familiar.
2. Open Today on mobile width or phone.
3. Confirm Morning/Midday/Evening tabs scroll and tap cleanly.
4. Confirm practice check buttons are easier to tap.
5. Confirm supporting sections are hidden on mobile until "Show supporting details" is tapped.
6. Complete the daily minimum and confirm streak/Day Locked In behavior still works.
7. Trigger a missed day and confirm Resume Today's Alignment still works.
