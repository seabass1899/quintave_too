// ─── coherencePhaseModel.js ────────────────────────────────────────────────
// Macro-state layer for Quintave.
//
// Purpose:
// The lower models answer: "What is happening today?" and "What keeps
// recurring?" This model answers: "What developmental phase is the user in?"
//
// Important cosmology rule:
// Source is the fixed core reference. The phase engine never treats Source as
// injured, weak, or drifting. It reads the condition of the movable bodies
// (Form, Field, Mind, Code), Source accessibility, interference pressure,
// trajectory, and memory to determine the proper operating phase.

const MOVABLE = ['d2', 'd3', 'd4', 'd5']

function clamp(n, min, max) {
  const value = Number.isFinite(Number(n)) ? Number(n) : min
  return Math.max(min, Math.min(max, value))
}

function avg(values) {
  const clean = values.filter(v => Number.isFinite(Number(v)))
  if (!clean.length) return 0
  return clean.reduce((sum, v) => sum + Number(v), 0) / clean.length
}

function getRecentStatus(dayStatus = {}, date = new Date(), days = 7) {
  const records = []
  for (let i = 0; i < days; i++) {
    const d = new Date(date)
    d.setDate(date.getDate() - i)
    const key = d.toDateString()
    records.push({ key, record: dayStatus?.[key] || null })
  }
  return records
}

function countStatus(records, status) {
  return records.filter(r => r.record?.status === status).length
}

function currentCleanStreak(dayStatus = {}, date = new Date()) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(date)
    d.setDate(date.getDate() - i)
    const record = dayStatus?.[d.toDateString()]
    if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) streak += 1
    else if (i > 0) break
    else break
  }
  return streak
}

function movablePlaneValues(coherenceState = {}) {
  return MOVABLE.map(id => coherenceState?.movableBodies?.[id]?.plane).filter(v => Number.isFinite(Number(v)))
}

function lowestMovablePlane(coherenceState = {}) {
  const values = movablePlaneValues(coherenceState)
  return values.length ? Math.min(...values) : 3
}

function redBodyCount(coherenceState = {}) {
  return Object.values(coherenceState?.movableBodies || {}).filter(b => b?.zone === 'Red Zone' || Number(b?.plane) < 5).length
}

function getConfidence({ observationDays, recentLocked, recentMisses, memoryConfidence }) {
  const observation = clamp(observationDays / 14, 0, 1) * 0.35
  const consistency = clamp(recentLocked / 7, 0, 1) * 0.30
  const memory = clamp(memoryConfidence || 0, 0, 1) * 0.25
  const stabilityPenalty = clamp(recentMisses / 4, 0, 1) * 0.20
  return clamp(observation + consistency + memory - stabilityPenalty + 0.15, 0.05, 1)
}

export function calculateCoherencePhase({
  coherenceState = {},
  interferenceState = {},
  trajectoryState = {},
  memoryState = {},
  dayStatus = {},
  checked = {},
  date = new Date(),
} = {}) {
  const recent = getRecentStatus(dayStatus, date, 14)
  const recent7 = recent.slice(0, 7)
  const recentLocked = countStatus(recent7, 'locked')
  const recentMisses = countStatus(recent7, 'missed')
  const recentReopened = recent7.filter(r => !!r.record?.reopenedAt).length
  const cleanStreak = currentCleanStreak(dayStatus, date)

  const sourceAccess = clamp(coherenceState?.source?.accessibility || 0, 0, 100)
  const coherenceDistance = clamp(coherenceState?.system?.coherenceDistance || 0, 0, 100)
  const driftPressure = clamp(interferenceState?.driftPressure || 0, 0, 100)
  const overload = interferenceState?.overloadRisk?.label || 'minimal'
  const recoveryState = interferenceState?.recoveryState || 'stable'
  const redCount = redBodyCount(coherenceState)
  const lowestPlane = lowestMovablePlane(coherenceState)
  const trend = trajectoryState?.trend || 'baseline_building'
  const memoryBias = memoryState?.recommendationBias || 'establish_baseline'
  const memoryConfidence = clamp(memoryState?.confidence || 0, 0, 1)
  const observationDays = Math.max(
    Number(trajectoryState?.observationDays || 0),
    Number(memoryState?.observationDays || 0),
    Object.keys(checked || {}).length,
    recent.filter(r => r.record).length
  )

  const reasons = []
  let phase = 'stabilization'

  const recoverySignals = [
    recoveryState === 'missed_today',
    recoveryState === 'active_recovery',
    recoveryState === 'recovery_first',
    recoveryState === 'unstable_recovery',
    trend === 'recovering',
    memoryBias === 'recovery_first',
    recentMisses >= 2,
    recentReopened >= 1,
  ].filter(Boolean).length

  if (recoverySignals >= 2 || recentMisses >= 3) {
    phase = 'collapse_rebuild'
    reasons.push('multiple recovery signals detected')
  } else if (recoverySignals >= 1 || driftPressure >= 70 || overload === 'high') {
    phase = 'recovery'
    reasons.push('recovery or overload pressure detected')
  } else if (redCount > 0 || lowestPlane < 5 || sourceAccess < 50 || coherenceDistance >= 55) {
    phase = 'stabilization'
    reasons.push('at least one movable body requires stabilization before expansion')
  } else if (cleanStreak >= 7 && sourceAccess >= 70 && coherenceDistance <= 32 && ['advancing', 'stabilizing'].includes(trend) && memoryBias !== 'lower_friction') {
    phase = 'expansion'
    reasons.push('sustained coherence supports deeper practice')
  } else if (cleanStreak >= 14 && sourceAccess >= 78 && coherenceDistance <= 25 && recentMisses === 0) {
    phase = 'integration'
    reasons.push('longer coherence window supports integration')
  } else {
    phase = 'stabilization'
    reasons.push('system is building reliable baseline coherence')
  }

  const meta = {
    collapse_rebuild: {
      label: 'Collapse / Rebuild Phase',
      engineBias: 'minimum_viable_alignment',
      complexity: 'low',
      sourceDirective: 'anchor_source_first',
      explanation: 'The system detected significant instability. Today should restore basic movement and reduce overwhelm before asking for depth.',
    },
    recovery: {
      label: 'Recovery Phase',
      engineBias: 'lower_friction_reentry',
      complexity: 'low',
      sourceDirective: 'anchor_source_first',
      explanation: 'The system is protecting continuity. Today emphasizes lower-friction correction and recovery before expansion.',
    },
    stabilization: {
      label: 'Stabilization Phase',
      engineBias: 'stabilize_before_expansion',
      complexity: 'standard',
      sourceDirective: 'anchor_source_first',
      explanation: 'The system is establishing stable coherence. Today favors repeatable attunement over aggressive expansion.',
    },
    expansion: {
      label: 'Expansion Phase',
      engineBias: 'increase_depth',
      complexity: 'deepening',
      sourceDirective: 'anchor_source_first',
      explanation: 'The system has enough stability to increase depth carefully while preserving Source anchoring.',
    },
    integration: {
      label: 'Integration Phase',
      engineBias: 'maintain_and_integrate',
      complexity: 'integrative',
      sourceDirective: 'anchor_source_first',
      explanation: 'The system is in a sustained coherence window. Today emphasizes integration, maintenance, and clean continuity.',
    },
  }[phase]

  const confidence = getConfidence({ observationDays, recentLocked, recentMisses, memoryConfidence })

  return {
    version: 'coherence-phase-v1',
    phase,
    label: meta.label,
    confidence,
    engineBias: meta.engineBias,
    complexity: meta.complexity,
    sourceDirective: meta.sourceDirective,
    explanation: meta.explanation,
    reasons,
    metrics: {
      observationDays,
      recentLocked,
      recentMisses,
      recentReopened,
      cleanStreak,
      sourceAccess,
      coherenceDistance,
      driftPressure,
      overload,
      recoveryState,
      redBodyCount: redCount,
      lowestMovablePlane: lowestPlane,
      trajectoryTrend: trend,
      memoryBias,
      averageMovablePlane: avg(movablePlaneValues(coherenceState)),
    },
  }
}
