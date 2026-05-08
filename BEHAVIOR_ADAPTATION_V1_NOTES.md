# Quintave Behavior Adaptation v1

Replace:

src/features/today/todayEngine.js

What changed:
- Bumped TODAY_PLAN_VERSION to 8 so old daily plan snapshots regenerate.
- Reads recent q_today_plan assignments to detect assigned-but-skipped practices.
- Builds per-practice and per-domain behavior stats.
- Adds behaviorMode to plan.decision:
  - lower_friction
  - increase_depth
  - reinforce_momentum
  - establish_baseline
- Penalizes practices skipped repeatedly.
- Favors lower-friction alternatives when a domain shows resistance.
- Rotates away from practices completed repeatedly.
- Adds depth bias after consistency appears.
- Preserves existing phase locking, daily minimum, same-day duplicate prevention, streak, recovery, and scoring behavior.

Test:
1. Deploy to dev.
2. Clear q_today_plan.
3. Reload.
4. Confirm Today’s Alignment Read still renders.
5. Confirm no duplicate practice across phases.
6. Simulate several skipped/completed days by preserving q_today_plan and q_checked, then regenerate.
