# Frequency Formula Update

This update replaces the initial frequency layer with a gradual Red / Blue / Gray zone model.

## User-facing planes

- Levels 1 and 2 are not shown.
- Red Zone: any level below 5.0.
- Blue Zone: Level 5.0 through 9.9.
- Gray Zone: Level 10.0 through 11.0.

## Core formula

Frequency level is derived from:

```txt
3
+ (Source-weighted coherence / 100) * 3.0
+ (core energy / 100) * 2.5
+ small streak bonus
- drain penalty
```

Then it is capped by the weakest domain:

```txt
weakest cap = 3 + (weakest domain / 100) * 8
```

This prevents one strong domain from carrying the whole system.

## Level 5 Source Gate

The system cannot cross Level 5 unless:

- Source >= 50
- Source-weighted coherence >= 45
- 3 clean locked days exist
- Core energy >= 50

If these are not true, level is capped at 4.9.

## Gray Zone Gate

The system cannot cross Level 10 unless:

- Core energy >= 93
- Source >= 90
- all domains >= 80
- clean streak >= 30
- no recent missed days

If these are not true, level is capped at 9.9.

## Core energy

Core energy starts at 50 and moves slowly.

- Clean locked day: +0.4 to +1.2 depending on signal
- Reopened/recovered locked day: +0.2
- Missed day: -2.2

## Daily supply

Daily supply is tied to the core cell:

```txt
daily supply = 40 + core energy * 0.6
```

Low core means lower daily supply. High core means more daily supply.

## Files changed

- `src/features/frequency/frequencyModel.js`
- `src/features/frequency/FrequencyLayer.jsx`
- `src/app/App.jsx`
