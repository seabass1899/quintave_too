import { DOMAINS } from '../../data'

const MOVABLE_BODY_IDS = ['d2', 'd3', 'd4', 'd5']
const MEMORY_WINDOW_DAYS = 21

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS[0]
}

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
  d.setDate(d.getDate() - daysBack)
  return d.toDateString()
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function emptyBodyStats() {
  return MOVABLE_BODY_IDS.reduce((acc, id) => {
    acc[id] = {
      id,
      name: domainById(id).name,
      primaryCount: 0,
      secondaryCount: 0,
      pressureCount: 0,
      lockedCount: 0,
      missedCount: 0,
      assigned: 0,
      completed: 0,
      skipped: 0,
      recurrenceScore: 0,
      completionRate: 0,
      recoveryVelocity: 'unknown',
    }
    return acc
  }, {})
}

function flattenAssignedItems(plan) {
  if (!plan?.phases) return []
  return Object.values(plan.phases).flatMap(phase => phase?.items || [])
}

function practiceDomainFromKey(key) {
  if (!key || typeof key !== 'string') return null
  const id = key.split('_')[0]
  return MOVABLE_BODY_IDS.includes(id) ? id : null
}

function incrementBody(stats, domainId, field, amount = 1) {
  if (!MOVABLE_BODY_IDS.includes(domainId)) return
  stats[domainId][field] = (stats[domainId][field] || 0) + amount
}

function rankedBodies(bodyStats, field = 'recurrenceScore') {
  return Object.values(bodyStats)
    .slice()
    .sort((a, b) => (b[field] || 0) - (a[field] || 0))
}

function calculateRecoveryVelocity(stat) {
  if (!stat || stat.primaryCount === 0) return 'unknown'
  if (stat.completionRate >= 0.75 && stat.missedCount === 0) return 'fast'
  if (stat.completionRate >= 0.45) return 'moderate'
  return 'slow'
}

export function calculateCoherenceMemory({
  checked = {},
  dayStatus = {},
  date = new Date(),
  currentCoherenceState = null,
  currentTrajectoryState = null,
  windowDays = MEMORY_WINDOW_DAYS,
} = {}) {
  const plans = safeReadJSON('q_today_plan', {})
  const bodyStats = emptyBodyStats()
  const resistantPractices = {}
  const completedPractices = {}
  const observations = []

  let recentLocked = 0
  let recentMisses = 0
  let observationDays = 0

  for (let i = windowDays; i >= 1; i--) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    const status = dayStatus?.[key]
    const dayChecks = checked?.[key] || {}
    const decision = plan?.decision || null
    const assigned = flattenAssignedItems(plan)

    if (plan || status || Object.keys(dayChecks).length) observationDays += 1
    if (status?.status === 'locked') recentLocked += 1
    if (status?.status === 'missed') recentMisses += 1

    const primary = decision?.primaryAttunementBodyId || decision?.primaryBlockerId || decision?.trajectorySummary?.dominantDriftBody || null
    const secondary = decision?.secondaryDriftId || decision?.secondaryBlockerId || decision?.trajectorySummary?.secondaryDriftBody || null
    const pressure = decision?.interferenceState?.primaryPressureBody || null

    if (primary && MOVABLE_BODY_IDS.includes(primary)) incrementBody(bodyStats, primary, 'primaryCount')
    if (secondary && MOVABLE_BODY_IDS.includes(secondary)) incrementBody(bodyStats, secondary, 'secondaryCount')
    if (pressure && MOVABLE_BODY_IDS.includes(pressure)) incrementBody(bodyStats, pressure, 'pressureCount')

    assigned.forEach(item => {
      const domainId = practiceDomainFromKey(item.key)
      if (!domainId) return
      incrementBody(bodyStats, domainId, 'assigned')
      const completed = !!dayChecks[item.key]
      if (completed) {
        incrementBody(bodyStats, domainId, 'completed')
        completedPractices[item.key] = (completedPractices[item.key] || 0) + 1
      } else {
        incrementBody(bodyStats, domainId, 'skipped')
        resistantPractices[item.key] = (resistantPractices[item.key] || 0) + 1
      }
    })

    MOVABLE_BODY_IDS.forEach(id => {
      if (status?.status === 'locked' && primary === id) incrementBody(bodyStats, id, 'lockedCount')
      if (status?.status === 'missed' && primary === id) incrementBody(bodyStats, id, 'missedCount')
    })

    observations.push({ key, status: status?.status || 'open', primary, secondary })
  }

  Object.values(bodyStats).forEach(stat => {
    stat.completionRate = stat.assigned ? Number((stat.completed / stat.assigned).toFixed(2)) : 0
    stat.recurrenceScore = Number((
      stat.primaryCount * 3.0 +
      stat.secondaryCount * 1.4 +
      stat.pressureCount * 1.6 +
      stat.missedCount * 2.2 +
      stat.skipped * 0.8 -
      stat.completed * 0.25
    ).toFixed(2))
    stat.recoveryVelocity = calculateRecoveryVelocity(stat)
  })

  const ranked = rankedBodies(bodyStats, 'recurrenceScore')
  const recurrent = ranked[0] || bodyStats.d2
  const secondary = ranked.find(b => b.id !== recurrent.id) || ranked[1] || null
  const totalSignals = ranked.reduce((sum, b) => sum + Math.max(0, b.recurrenceScore), 0)
  const recurrentShare = totalSignals ? recurrent.recurrenceScore / totalSignals : 0
  const recurrentDriftBody = recurrent.recurrenceScore >= 3 ? recurrent.id : null
  const secondaryRecurringBody = secondary?.recurrenceScore >= 2 ? secondary.id : null

  const resistancePracticeKeys = Object.entries(resistantPractices)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 8)

  const masteredPracticeKeys = Object.entries(completedPractices)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
    .slice(0, 8)

  const cleanRecentLocked = observations.slice(-7).filter(o => o.status === 'locked').length
  const recentMissCount = observations.slice(-7).filter(o => o.status === 'missed').length
  const recurringConfidence = clamp(recurrentShare, 0, 1)
  const confidence = Number(clamp((observationDays / 7) * 0.55 + recurringConfidence * 0.45, 0, 1).toFixed(2))

  const stabilityWindow = cleanRecentLocked >= 7
    ? 'seven_day_stability'
    : cleanRecentLocked >= 3
      ? 'three_day_stability'
      : recentMissCount >= 2
        ? 'unstable_window'
        : 'baseline_building'

  const expansionTolerance = recentMissCount >= 2 || resistancePracticeKeys.length >= 3
    ? 'low'
    : cleanRecentLocked >= 5 && resistancePracticeKeys.length === 0
      ? 'high'
      : cleanRecentLocked >= 3
        ? 'moderate'
        : 'unknown'

  const recommendationBias = recentMissCount >= 2
    ? 'recovery_first'
    : resistancePracticeKeys.length >= 2
      ? 'lower_friction'
      : recurrentDriftBody && confidence >= 0.45
        ? 'stabilize_recurring_drift'
        : cleanRecentLocked >= 5
          ? 'reinforce_memory_momentum'
          : masteredPracticeKeys.length >= 3
            ? 'increase_depth'
            : 'establish_baseline'

  const recoveryVelocity = MOVABLE_BODY_IDS.reduce((acc, id) => {
    acc[id] = bodyStats[id].recoveryVelocity
    return acc
  }, {})

  const recurringName = recurrentDriftBody ? domainById(recurrentDriftBody).name : null
  const explanation = observationDays < 3
    ? 'Memory is still collecting enough history to identify recurring stabilization and drift patterns.'
    : recommendationBias === 'recovery_first'
      ? 'Memory detected repeated disruption in the recent window, so recovery is prioritized before expansion.'
      : recommendationBias === 'lower_friction'
        ? 'Memory detected repeated resistance to assigned practices, so the engine is favoring lower-friction entry points.'
        : recommendationBias === 'stabilize_recurring_drift'
          ? `${recurringName} is recurring as a drift signature, so the engine is prioritizing stabilization there before broad expansion.`
          : recommendationBias === 'reinforce_memory_momentum'
            ? 'Memory detected a stable recent window, so the engine can reinforce momentum without overloading the system.'
            : recommendationBias === 'increase_depth'
              ? 'Memory detected repeated completion patterns, so the engine can rotate toward slightly deeper practices.'
              : 'Memory is establishing a baseline pattern before making stronger long-range adjustments.'

  return {
    version: 'coherence-memory-v1',
    dateKey: getDateKey(date),
    windowDays,
    observationDays,
    confidence,
    recurrentDriftBody,
    secondaryRecurringBody,
    mostStableBody: rankedBodies(bodyStats, 'completionRate')[0]?.id || null,
    bodyStats,
    resistancePracticeKeys,
    masteredPracticeKeys,
    recoveryVelocity,
    stabilityWindow,
    expansionTolerance,
    recommendationBias,
    recentLocked,
    recentMisses,
    currentPrimaryAttunement: currentCoherenceState?.system?.primaryAttunementBody || null,
    currentTrajectoryTrend: currentTrajectoryState?.trend || 'baseline_building',
    explanation,
  }
}
