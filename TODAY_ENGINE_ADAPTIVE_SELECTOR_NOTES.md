# Today Engine Adaptive Selector Patch

## Replace file
Use `todayEngine.js` to replace:

`src/features/today/todayEngine.js`

## What changed
- Bumped `TODAY_PLAN_VERSION` from 4 to 5 so existing frozen plans regenerate once.
- Added adaptive domain pools for Morning critical selection.
- Added local browser selector seed (`q_selector_seed`) so new users without onboarding data do not all receive the same default plan.
- Added onboarding-aware domain scoring using `q_onboarding.scores` when available.
- Added history-aware anti-repeat selection using completed practices from the last 7 days.
- Added smart scoring for practice selection:
  - weakest-domain bonus
  - preferred-domain bonus
  - cross-domain/high-leverage bonus
  - recent-repeat penalty
  - deterministic per-user/per-day tie-breaker
- Preserved existing snapshot locking, phase locking, recovery logic, scoring, streak logic, and failure state behavior.

## Expected behavior
- New users may no longer all receive the same Morning alignment.
- Users with different onboarding baselines should receive different correction anchors.
- The same exact Morning set should be less likely to repeat repeatedly unless the same domain remains the best correction.
- Plans still freeze for the current day.

## Test
1. Deploy to dev.
2. Clear `q_today_plan` to force regeneration.
3. Keep `q_onboarding` for a real user, then reload.
4. Compare against another browser/profile or another tester.
5. Confirm Morning/Midday/Evening still lock/unlock correctly.
