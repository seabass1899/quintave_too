import { DOMAINS } from '../../data'

// Coherence Trajectory Engine v1
// Reads recent daily snapshots and completion state to determine whether each
// movable frequency body is stabilizing, drifting, collapsing, or advancing.
// Source is not treated as a movable body. It remains the core reference.

const MOVABLE = ['d2', 'd3', 'd4', 'd5']

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeReadJSON(key, fallback) {
  if (!storageAvailable()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getDateKey(date = new Date()) {
  return date.toDateString()
}

function getPreviousDateKey(date = new Date(), daysBack = 1) {
  const d = new Date(date)
  d.setDate(date.getDate() - daysBack)
  return d.toDateString()
}

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || { id, name: id }
}

function normalizeBodySnapshot(body = {}) {
  if (!body) return null
  return {
    id: body.id,
    name: body.name || domainById(body.id).name,
    score: Number.isFinite(body.score) ? body.score : Number.isFinite(body.effectiveScore) ? body.effectiveScore : 0,
    plane: Number.isFinite(body.plane) ? body.plane : null,
    subPlane: Number.isFinite(body.subPlane) ? body.subPlane : null,
    zone: body.zone || null,
    driftFromSource: Number.isFinite(body.driftFromSource) ? body.driftFromSource : 0,
    state: body.state || null,
  }
}

function extractDiagnosticsFromPlan(plan) {
  const decision = plan?.decision || {}
  const bodies = {}

  // Newer plans include full coherence-state body details.
  Object.entries(decision?.coherenceState?.movableBodies || {}).forEach(([id, body]) => {
    if (MOVABLE.includes(id)) bodies[id] = normalizeBodySnapshot(body)
  })

  // Fallback: older plans include flattened domainDiagnostics.
  ;(decision?.domainDiagnostics || []).forEach(body => {
    if (MOVABLE.includes(body.id) && !bodies[body.id]) bodies[body.id] = normalizeBodySnapshot(body)
  })

  return bodies
}

function countCompletedByBody(dayChecks = {}) {
  return MOVABLE.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
}

function bodyIdFromPracticeKey(key = '') {
  const [id] = String(key).split('_')
  return MOVABLE.includes(id) ? id : null
}

function getAssignedPracticeKeys(plan) {
  const keys = []
  Object.values(plan?.phases || {}).forEach(phase => {
    ;(phase?.items || []).forEach(item => {
      if (item?.key) keys.push(item.key)
    })
  })
  return keys
}

function getDayRows({ checked = {}, dayStatus = {}, date = new Date(), windowDays = 14 } = {}) {
  const todayPlans = safeReadJSON('q_today_plan', {})
  const rows = []

  for (let i = windowDays - 1; i >= 0; i--) {
    const key = i === 0 ? getDateKey(date) : getPreviousDateKey(date, i)
    const plan = todayPlans?.[key] || null
    const status = dayStatus?.[key] || null
    const checks = checked?.[key] || {}
    const diagnostics = extractDiagnosticsFromPlan(plan)
    const assignedKeys = getAssignedPracticeKeys(plan)
    const completedKeys = Object.entries(checks).filter(([, done]) => !!done).map(([k]) => k)
    const assignedByBody = MOVABLE.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
    const completedByBody = MOVABLE.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})

    assignedKeys.forEach(key => {
      const body = bodyIdFromPracticeKey(key)
      if (body) assignedByBody[body] += 1
    })
    completedKeys.forEach(key => {
      const body = bodyIdFromPracticeKey(key)
      if (body) completedByBody[body] += 1
    })

    rows.push({
      key,
      plan,
      status,
      checks,
      diagnostics,
      primary: plan?.decision?.primaryAttunementBodyId || plan?.decision?.primaryBlockerId || null,
      secondary: plan?.decision?.secondaryDriftId || plan?.decision?.secondaryBlockerId || null,
      strategy: plan?.decision?.strategy || null,
      assignedKeys,
      completedKeys,
      assignedByBody,
      completedByBody,
      missed: status?.status === 'missed',
      locked: status?.status === 'locked',
      reopened: !!status?.reopenedAt,
    })
  }

  return rows
}

function average(values = []) {
  const nums = values.filter(v => Number.isFinite(v))
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function round(n) {
  return Math.round(n)
}

function classifyBodyTrajectory(bodyStats) {
  const {
    currentScore,
    threeDayAverage,
    sevenDayAverage,
    primaryCount,
    skippedCount,
    completedCount,
    redCount,
    delta3,
  } = bodyStats

  if (redCount >= 3 || (currentScore < 50 && skippedCount >= 2)) return 'persistent_drift'
  if (delta3 <= -8 || skippedCount >= 3) return 'drifting'
  if (primaryCount >= 3 && completedCount < primaryCount) return 'recurrent_pressure'
  if (delta3 >= 6 && completedCount >= 2) return 'advancing'
  if (completedCount >= 3 && skippedCount === 0 && currentScore >= threeDayAverage - 2) return 'stabilizing'
  if (Math.abs(currentScore - sevenDayAverage) <= 4) return 'plateaued'
  return 'monitoring'
}

export function calculateCoherenceTrajectory({
  checked = {},
  dayStatus = {},
  date = new Date(),
  currentCoherenceState = null,
  windowDays = 14,
} = {}) {
  const rows = getDayRows({ checked, dayStatus, date, windowDays })
  const recent7 = rows.slice(-7)
  const recent3 = rows.slice(-3)
  const todayKey = getDateKey(date)

  const currentBodies = currentCoherenceState?.movableBodies || {}
  const currentSourceAccessibility = currentCoherenceState?.source?.accessibility || 0
  const currentCoherenceDistance = currentCoherenceState?.system?.coherenceDistance || 0

  const bodyTrajectories = MOVABLE.reduce((acc, id) => {
    const domain = domainById(id)
    const current = normalizeBodySnapshot(currentBodies?.[id]) || {
      id,
      name: domain.name,
      score: 0,
      plane: null,
      subPlane: null,
      zone: null,
      driftFromSource: 0,
      state: null,
    }

    const scores7 = recent7.map(row => row.diagnostics?.[id]?.score).filter(Number.isFinite)
    const scores3 = recent3.map(row => row.diagnostics?.[id]?.score).filter(Number.isFinite)
    const previousScore = scores7.length ? scores7[scores7.length - 1] : current.score
    const threeDayAverage = scores3.length ? average(scores3) : current.score
    const sevenDayAverage = scores7.length ? average(scores7) : current.score
    const delta3 = current.score - threeDayAverage
    const delta7 = current.score - sevenDayAverage

    const primaryCount = recent7.filter(row => row.primary === id).length
    const secondaryCount = recent7.filter(row => row.secondary === id).length
    const assignedCount = recent7.reduce((sum, row) => sum + (row.assignedByBody?.[id] || 0), 0)
    const completedCount = recent7.reduce((sum, row) => sum + (row.completedByBody?.[id] || 0), 0)
    const skippedCount = Math.max(0, assignedCount - completedCount)
    const redCount = recent7.filter(row => row.diagnostics?.[id]?.zone === 'Red Zone' || (row.diagnostics?.[id]?.plane || 99) < 5).length
    const lockedSupport = recent7.filter(row => row.locked && (row.completedByBody?.[id] || 0) > 0).length

    const driftScore = clamp(
      (current.driftFromSource || 0) * 0.9 +
      primaryCount * 9 +
      secondaryCount * 4 +
      skippedCount * 7 +
      redCount * 8 -
      completedCount * 2 -
      Math.max(0, delta3) * 1.5,
      0,
      100
    )

    const stabilityScore = clamp(
      completedCount * 7 +
      lockedSupport * 5 +
      Math.max(0, delta7) * 2 -
      skippedCount * 6 -
      primaryCount * 3 -
      redCount * 5,
      0,
      100
    )

    acc[id] = {
      id,
      name: domain.name,
      currentScore: round(current.score),
      currentPlane: current.plane,
      currentSubPlane: current.subPlane,
      currentZone: current.zone,
      currentState: current.state,
      previousScore: round(previousScore || current.score),
      threeDayAverage: round(threeDayAverage),
      sevenDayAverage: round(sevenDayAverage),
      delta3: round(delta3),
      delta7: round(delta7),
      primaryCount,
      secondaryCount,
      assignedCount,
      completedCount,
      skippedCount,
      redCount,
      lockedSupport,
      driftScore: round(driftScore),
      stabilityScore: round(stabilityScore),
      trajectory: classifyBodyTrajectory({
        currentScore: current.score,
        threeDayAverage,
        sevenDayAverage,
        primaryCount,
        skippedCount,
        completedCount,
        redCount,
        delta3,
      }),
    }
    return acc
  }, {})

  const rankedByDrift = Object.values(bodyTrajectories).sort((a, b) => b.driftScore - a.driftScore)
  const rankedByStability = Object.values(bodyTrajectories).sort((a, b) => b.stabilityScore - a.stabilityScore)
  const dominant = rankedByDrift[0]
  const secondary = rankedByDrift.find(b => b.id !== dominant?.id) || rankedByDrift[1]
  const stable = rankedByStability[0]

  const recentMisses = recent7.filter(row => row.missed).length
  const recentLocked = recent7.filter(row => row.locked).length
  const recentReopened = recent7.filter(row => row.reopened).length
  const avgDelta = average(Object.values(bodyTrajectories).map(b => b.delta7))
  const avgDrift = average(Object.values(bodyTrajectories).map(b => b.driftScore))
  const redBodies = Object.values(bodyTrajectories).filter(b => (b.currentPlane || 99) < 5).map(b => b.id)

  const riskPattern = recentMisses >= 2
    ? 'missed_day_recurrence'
    : dominant?.trajectory === 'persistent_drift'
      ? `${dominant.id}_persistent_drift`
      : dominant?.primaryCount >= 3
        ? `${dominant.id}_recurring_attunement`
        : dominant?.skippedCount >= 3
          ? `${dominant.id}_resistance_loop`
          : avgDrift >= 55
            ? 'global_drift_pressure'
            : 'none'

  const trend = recentMisses >= 2 || dominant?.trajectory === 'persistent_drift'
    ? 'recovering'
    : avgDelta <= -6 || avgDrift >= 60
      ? 'drifting'
      : recentLocked >= 5 && avgDelta >= 3
        ? 'advancing'
        : recentLocked >= 3
          ? 'stabilizing'
          : 'baseline_building'

  const recommendationBias = trend === 'recovering' || recentMisses > 0
    ? 'recovery_first'
    : dominant?.skippedCount >= 2
      ? 'lower_friction'
      : redBodies.length > 0
        ? 'stabilize_before_expansion'
        : trend === 'advancing' && stable?.stabilityScore >= 45
          ? 'increase_depth'
          : trend === 'stabilizing'
            ? 'reinforce_momentum'
            : 'establish_baseline'

  const explanation = trend === 'recovering'
    ? 'Recovery is active. Today stabilizes before adding complexity.'
    : trend === 'drifting'
      ? `${dominant?.name || 'A movable body'} is showing the strongest downward or recurring drift pattern.`
      : trend === 'advancing'
        ? 'The trajectory is rising. Today can add depth carefully while preserving Source anchoring.'
        : trend === 'stabilizing'
          ? 'Recent continuity is forming. Today reinforces the pattern before increasing complexity.'
          : 'More consistency will help personalize your trajectory over time.'

  return {
    version: 'coherence-trajectory-v1',
    dateKey: todayKey,
    windowDays,
    bodyTrajectories,
    dominantDriftBody: dominant?.id || 'd2',
    dominantDriftScore: dominant?.driftScore || 0,
    secondaryDriftBody: secondary?.id || null,
    mostStableBody: stable?.id || null,
    mostStableScore: stable?.stabilityScore || 0,
    trend,
    riskPattern,
    recommendationBias,
    recentMisses,
    recentLocked,
    recentReopened,
    redBodies,
    averageTrajectoryDelta: round(avgDelta),
    averageDriftPressure: round(avgDrift),
    sourceAccessibility: round(currentSourceAccessibility),
    coherenceDistance: round(currentCoherenceDistance),
    explanation,
    rankedByDrift: rankedByDrift.map(b => ({ id: b.id, name: b.name, driftScore: b.driftScore, trajectory: b.trajectory })),
    rankedByStability: rankedByStability.map(b => ({ id: b.id, name: b.name, stabilityScore: b.stabilityScore, trajectory: b.trajectory })),
  }
}
