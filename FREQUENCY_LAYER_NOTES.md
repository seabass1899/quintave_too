# Frequency Layer Notes

This build adds a dedicated Frequency tab and internal 11-plane calculation model.

## Core behavior

- Level 1–4: below stable Source contact.
- Level 5: Source connection threshold.
- Level 6–11: Source-connected operating bands.

## Calculation inputs

The frequency model blends:

1. Onboarding baseline scores
2. Today's domain resonance from completed practices
3. Source-weighted resonance
4. Harmony / spread between the five domains
5. Daily lock state
6. Streak continuity
7. Missed-day penalty

## Source gate

A user cannot show Level 5+ unless:

- Source resonance is at least 50
- Overall domain average is at least 42

This prevents the app from displaying Source-connected status when the other bodies are too scattered or Source access is still weak.

## New files

- `src/features/frequency/frequencyModel.js`
- `src/features/frequency/FrequencyLayer.jsx`

## App integration

A new `Frequency` tab was added to the main tab bar.
