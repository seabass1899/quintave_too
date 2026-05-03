# Phase 1 Structure Update

Safe UI/structure update only. Core scoring, frequency math, persistence, and Today Engine state logic were not intentionally changed.

## Programs Tab
- Rebuilt as a read-only System Intelligence Layer.
- Added Active Today section.
- Added Program Library cards with domains, leverage, selection rules, and system effects.
- No toggles or user controls were added.

## Language
- Removed user-facing “player” language from the frequency model and replaced it with direct, system-driven language.

## Today Tab
- Added an explicit “Why this practice is here” label above the existing selection reason.

## Test Checklist
- Today tab still completes normally.
- Programs tab renders Active Today + Program Library.
- No Programs tab control affects today’s plan.
- Frequency tab no longer uses “player.”
