// ─── coherenceProgress.js — accumulating coherence model ─────────────────────
// src/features/frequency/coherenceProgress.js
//
// Computes a player's coherence PROGRESS over time from practice history — not
// from a single day's checkboxes. This is the measurable indicator of movement
// toward coherence.
//
// Model (per the Quintave frequency framework):
//   • Source (d1) is the anchor/tuning fork. It is a MULTIPLIER on overall
//     coherence — neglect Source and your ceiling drops (you cannot reach the
//     Blue zone without a maintained anchor).
//   • The four movable bodies (Form d2, Field d3, Mind d4, Code d5) fluctuate
//     with daily life. Each has an accumulating score that rises with practice
//     and decays gently without it.
//   • Overall coherence = HARMONY of the four movable bodies × Source strength.
//     Harmony rewards all bodies being balanced AND elevated together (not one
//     maxed while others languish).
//   • Overall 0–100 maps to frequency planes 1–11 (Red 1–4, Blue 5–9, Gray
//     10–11). Crossing into Blue (score ≥ 50, plane 5) is the key milestone.
//
// Calibration (from product decisions):
//   • ~2–3 weeks of consistent daily practice moves a red-zone player into Blue.
//   • Decay is symmetric-ish: you lose progress about as fast as you gain it,
//     but never all at once (a single rest day barely moves you).
//
// Pure functions only — fed history, returns numbers. Fully testable.

const BODY_IDS = ['d1', 'd2', 'd3', 'd4', 'd5']
const MOVABLE_IDS = ['d2', 'd3', 'd4', 'd5']
const SOURCE_ID = 'd1'

// Per-day gain when a body is practiced, and per-day decay when it is not.
// Tuned so ~18 consistent days lifts a low-40s baseline across the 50 threshold.
const DAILY_GAIN = 2.7     // points toward 100 when practiced (before taper)
const DAILY_DECAY = 1.4    // decay on days with NO practice at all (disengaged)
const ACTIVE_DAY_DRIFT = 0.5  // tiny drift for un-practiced bodies on ENGAGED days
const DECAY_FLOOR = 20     // bodies don't rot below this from inactivity alone
const GAIN_CEILING = 100

// Gains taper as a body gets higher (the last stretch is earned).
function taperedGain(current) {
  const headroom = (GAIN_CEILING - current) / GAIN_CEILING  // 1 at 0, 0 at 100
  return DAILY_GAIN * (0.45 + 0.55 * headroom)
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function dateKey(d) {
  return d.toDateString()
}

/**
 * Was a given body practiced on a given day?
 * checkedForDay: object like { 'd2_4': true, 'd1_0': true, ... }
 */
function bodyPracticedOnDay(bodyId, checkedForDay) {
  if (!checkedForDay) return false
  return Object.keys(checkedForDay).some(
    key => key.startsWith(`${bodyId}_`) && checkedForDay[key],
  )
}

/**
 * Walk the practice history day-by-day from the baseline date to today,
 * accumulating each body's score. Returns the per-body scores plus a daily
 * series for the trend line.
 *
 * @param {object} baseline   per-body starting scores 0–100, e.g. {d1:45,...}
 * @param {object} checked    q_checked: { [dateString]: { 'd2_4': true, ... } }
 * @param {Date}   startDate  baseline date (onboarding date)
 * @param {Date}   today
 */
export function computeBodyProgress(baseline, checked, startDate, today = new Date()) {
  const scores = {}
  for (const id of BODY_IDS) scores[id] = clamp(baseline?.[id] ?? 40, 0, 100)

  const series = []  // [{ date, overall, plane, zone, bodies:{...} }]
  const engagementWindow = []  // rolling 21-day active-day history
  const oneDay = 24 * 60 * 60 * 1000
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)

  for (let t = start.getTime(); t <= end.getTime(); t += oneDay) {
    const day = new Date(t)
    const dayChecks = checked?.[dateKey(day)] || null

    // Did the user practice ANYTHING today? (hit their minimum / engaged at all)
    const activeDay = !!dayChecks && Object.values(dayChecks).some(Boolean)
    // Track engagement: recent active-day density drives a consistency bonus.
    engagementWindow.push(activeDay ? 1 : 0)
    if (engagementWindow.length > 21) engagementWindow.shift()
    const activeDensity = engagementWindow.reduce((a, b) => a + b, 0) / engagementWindow.length
    const daysObserved = engagementWindow.length
    // Bonus scales with how consistently they show up, ramping over ~3 weeks.
    const consistencyBonus = 8 * activeDensity * Math.min(1, daysObserved / 21)

    for (const id of BODY_IDS) {
      if (bodyPracticedOnDay(id, dayChecks)) {
        // Practiced this body → it rises.
        scores[id] = clamp(scores[id] + taperedGain(scores[id]), 0, 100)
      } else if (activeDay) {
        // Engaged today, just didn't touch THIS body. You don't need to do all
        // five daily — un-practiced bodies hold, with only a tiny drift, so a
        // consistent practitioner always progresses overall.
        if (scores[id] > DECAY_FLOOR) {
          scores[id] = clamp(scores[id] - ACTIVE_DAY_DRIFT, DECAY_FLOOR, 100)
        }
      } else {
        // No practice at all today → genuine disengagement → real decay.
        if (scores[id] > DECAY_FLOOR) {
          scores[id] = clamp(scores[id] - DAILY_DECAY, DECAY_FLOOR, 100)
        }
      }
    }

    const snap = overallCoherence(scores, consistencyBonus)
    series.push({ date: dateKey(day), overall: snap.overall, plane: snap.plane, zone: snap.zone, bodies: { ...scores } })
  }

  return { bodies: { ...scores }, series }
}

/**
 * Overall coherence from current per-body scores.
 * Harmony of the four movable bodies × Source strength multiplier.
 */
export function overallCoherence(scores, consistencyBonus = 0) {
  const source = clamp(scores?.[SOURCE_ID] ?? 0, 0, 100)
  const movable = MOVABLE_IDS.map(id => clamp(scores?.[id] ?? 0, 0, 100))

  const mean = movable.reduce((a, b) => a + b, 0) / movable.length
  // Spread penalty: standard deviation pulls the score down. Balanced bodies
  // score higher than one-maxed-three-low with the same mean.
  const variance = movable.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / movable.length
  const sd = Math.sqrt(variance)
  const harmony = clamp(mean - sd * 0.4, 0, 100)  // harmony is the #1 driver

  // Source multiplier: ranges ~0.35 (Source neglected) to 1.0 (Source strong).
  // Anchor-first — a low Source caps overall coherence below the Blue gate.
  const sourceMult = 0.35 + 0.65 * (source / 100)

  // Consistency bonus: rewards sustained engagement (showing up daily), so a
  // consistent minimum practitioner reaches Blue over ~4-6 weeks. Caps at +8.
  const overall = clamp(harmony * sourceMult + clamp(consistencyBonus, 0, 8), 0, 100)
  const band = planeFor(overall)
  return {
    overall: Math.round(overall),
    harmony: Math.round(harmony),
    source: Math.round(source),
    sourceMult: Number(sourceMult.toFixed(3)),
    plane: band.level,
    zone: band.zone,
    state: band.state,
    bodies: BODY_IDS.reduce((acc, id) => { acc[id] = Math.round(clamp(scores?.[id] ?? 0, 0, 100)); return acc }, {}),
  }
}

// Plane bands — mirrors coherenceStateModel PLANE_BANDS.
const PLANE_BANDS = [
  { min: 0,  max: 29, level: 3,  zone: 'Red Zone',  state: 'red_zone_floor' },
  { min: 30, max: 49, level: 4,  zone: 'Red Zone',  state: 'red_zone_interference' },
  { min: 50, max: 59, level: 5,  zone: 'Blue Zone', state: 'source_gate_entry' },
  { min: 60, max: 69, level: 6,  zone: 'Blue Zone', state: 'stabilizing_access' },
  { min: 70, max: 79, level: 7,  zone: 'Blue Zone', state: 'directed_alignment' },
  { min: 80, max: 87, level: 8,  zone: 'Blue Zone', state: 'alchemical_integration' },
  { min: 88, max: 92, level: 9,  zone: 'Blue Zone', state: 'threshold_preparation' },
  { min: 93, max: 96, level: 10, zone: 'Gray Zone', state: 'neutrality_field' },
  { min: 97, max: 100,level: 11, zone: 'Gray Zone', state: 'source_embodiment' },
]

export function planeFor(overall) {
  const v = clamp(overall, 0, 100)
  return PLANE_BANDS.find(b => v >= b.min && v <= b.max) || PLANE_BANDS[0]
}

// Human-readable label for the headline indicator.
export function planeLabel(band) {
  const zoneNote = {
    'Red Zone': 'Source connection is faint here — the anchor is the work.',
    'Blue Zone': 'Source connection is established — harmonizing the bodies.',
    'Gray Zone': 'Deep coherence — the bodies move as one with Source.',
  }
  return {
    title: `Plane ${band.level} · ${band.zone}`,
    note: zoneNote[band.zone] || '',
    crossedBlue: band.level >= 5,
  }
}

/**
 * Detect whether the user just crossed Red → Blue between the two most recent
 * points in the series (for celebrating the milestone).
 */
export function justCrossedIntoBlue(series) {
  if (!series || series.length < 2) return false
  const prev = series[series.length - 2]
  const curr = series[series.length - 1]
  return prev.overall < 50 && curr.overall >= 50
}

/**
 * Decide if a re-assessment is warranted: a long gap since the last practiced
 * day means the decayed numbers are stale and the player should re-baseline.
 */
export function needsReassessment(checked, today = new Date(), gapDays = 14) {
  const days = Object.keys(checked || {})
  if (!days.length) return false
  let mostRecent = 0
  for (const d of days) {
    const hasAny = Object.values(checked[d] || {}).some(Boolean)
    if (!hasAny) continue
    const t = new Date(d).getTime()
    if (t > mostRecent) mostRecent = t
  }
  if (!mostRecent) return false
  const gap = (today.getTime() - mostRecent) / (24 * 60 * 60 * 1000)
  return gap >= gapDays
}
