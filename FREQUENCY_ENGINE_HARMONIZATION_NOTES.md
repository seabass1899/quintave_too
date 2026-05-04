# Frequency Engine Harmonization Update

This update refines the core algorithm without changing the Today Engine, daily alignment flow, streak/recovery behavior, or practice selection logic.

## Core rule added

To advance from frequency level L to L+1, all non-Source domains must be harmonized at level L.

Source remains the invariant reference body. It is treated as present from Level 5 upward and does not block harmonization above Level 5, although measured Source access still matters for opening the Level 5 Source Gate.

## Engine model

Frequency is now calculated from:

- Core Energy Reserve
- Daily Supply
- System Coherence Score
- Domain Harmony
- Instability Flags
- Harmonization Gate
- Clean continuity / streak stability

## Key formula shift

Frequency is no longer driven by task completion alone.

Completion feeds signal.
Signal influences energy.
Energy is retained based on coherence.
Coherence and harmonization determine advancement.
Instability drains and gates progression.

## New computed fields

The frequency model now returns:

- `systemCoherence`
- `instabilityFlags`
- `operatingMode`
- `performanceLayer`
- `harmonization`
- `blockingDomains`
- `advancementBlocked`
- domain-level values for each body

## Operating modes

- Reactive Mode
- Stabilizing Mode
- Intentional Mode

These modes are derived from System Coherence, Core Energy, and Instability Flags.

## Performance layer

The model also exposes:

- Thought Amplification Factor
- Perceived Experience Range
- Environment Match
- Outcome Quality

These are computed from Core Energy, System Coherence, Harmony, and Instability.

## Testing guidance

1. Deploy to `dev` first.
2. Open the Frequency tab.
3. Verify Level, Zone, System Coherence, Domain Harmony, Core Energy, and Daily Supply are visible.
4. Confirm blocking domains appear when one or more non-Source domains lag behind the current advancement threshold.
5. Confirm Today’s Alignment still works unchanged.
