import { DOMAINS } from '../../data'

export const MOVABLE_BODY_IDS = ['d2', 'd3', 'd4', 'd5']

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function getDateKey(date = new Date()) {
  return date.toDateString()
}

function getPreviousDateKey(date = new Date(), daysBack = 1) {
  const d = new Date(date)
  d.setDate(d.getDate() - daysBack)
  return d.toDateString()
}

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || { id, name: id }
}

function readLocalJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getDayRecord(dayStatus = {}, date = new Date(), daysBack = 0) {
  const key = daysBack === 0 ? getDateKey(date) : getPreviousDateKey(date, daysBack)
  return dayStatus?.[key] || null
}

function countRecent(dayStatus = {}, date = new Date(), days = 7, predicate = () => false) {
  let count = 0
  for (let i = 0; i < days; i++) {
    const record = getDayRecord(dayStatus, date, i)
    if (predicate(record)) count += 1
  }
  return count
}

function getCurrentCleanStreak(dayStatus = {}, date = new Date()) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const record = getDayRecord(dayStatus, date, i)
    if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) streak += 1
    else break
  }
  return streak
}

function getRecentPracticeStats(checked = {}, date = new Date(), days = 7) {
  const stats = MOVABLE_BODY_IDS.reduce((acc, id) => {
    acc[id] = { completed: 0 }
    return acc
  }, {})

  for (let i = 1; i <= days; i++) {
    const key = getPreviousDateKey(date, i)
    const dayChecks = checked?.[key] || {}
    Object.entries(dayChecks).forEach(([practiceKey, done]) => {
      if (!done) return
      const domainId = practiceKey.split('_')[0]
      if (!stats[domainId]) return
      stats[domainId].completed += 1
    })
  }

  return stats
}

function getSkippedAssignments(date = new Date(), days = 7) {
  // Optional beta hook. If the Today Engine later stores assigned plan snapshots
  // per day, this can be expanded without changing the public API.
  const todayPlans = readLocalJson('q_today_plan', {})
  const checked = readLocalJson('q_checked', {})
  const skipped = MOVABLE_BODY_IDS.reduce((acc, id) => {
    acc[id] = 0
    return acc
  }, {})

  for (let i = 1; i <= days; i++) {
    const key = getPreviousDateKey(date, i)
    const snapshot = todayPlans?.[key]
    const dayChecks = checked?.[key] || {}
    const assigned = Object.values(snapshot?.phases || {})
      .flatMap(phase => phase?.items || [])
      .filter(item => item?.key)

    assigned.forEach(item => {
      if (dayChecks[item.key]) return
      const domainId = item.key.split('_')[0]
      if (skipped[domainId] !== undefined) skipped[domainId] += 1
    })
  }

  return skipped
}

function classifyRecoveryState({ missedToday, reopenedToday, missedYesterday, recentMisses }) {
  if (missedToday) return 'missed_today'
  if (reopenedToday) return 'active_recovery'
  if (missedYesterday) return 'recovery_first'
  if (recentMisses >= 3) return 'unstable_recovery'
  if (recentMisses >= 1) return 'watch_drift'
  return 'stable'
}

function classifyOverloadRisk({ skippedTotal, recentMisses, cleanStreak }) {
  const raw = skippedTotal * 4 + recentMisses * 12 - cleanStreak * 1.5
  const score = Math.round(clamp(raw, 0, 100))
  const label = score >= 65 ? 'high' : score >= 35 ? 'moderate' : score >= 15 ? 'low' : 'minimal'
  return { score, label }
}

function classifyStabilizationMomentum(cleanStreak) {
  if (cleanStreak >= 30) return 'deep_continuity'
  if (cleanStreak >= 14) return 'strong_stabilization'
  if (cleanStreak >= 7) return 'stable_momentum'
  if (cleanStreak >= 3) return 'early_momentum'
  if (cleanStreak >= 1) return 'signal_started'
  return 'none'
}

export function calculateInterferenceState({ dayStatus = {}, checked = {}, date = new Date(), movableBodies = null } = {}) {
  const today = getDayRecord(dayStatus, date, 0)
  const yesterday = getDayRecord(dayStatus, date, 1)
  const recentMisses = countRecent(dayStatus, date, 7, r => r?.status === 'missed')
  const recentReopened = countRecent(dayStatus, date, 7, r => r?.reopenedAt)
  const missedToday = today?.status === 'missed'
  const reopenedToday = today?.status === 'active' && !!today?.reopenedAt
  const missedYesterday = yesterday?.status === 'missed'
  const cleanStreak = getCurrentCleanStreak(dayStatus, date)
  const practiceStats = getRecentPracticeStats(checked, date, 7)
  const skippedAssignments = getSkippedAssignments(date, 7)
  const skippedTotal = Object.values(skippedAssignments).reduce((sum, v) => sum + v, 0)
  const overload = classifyOverloadRisk({ skippedTotal, recentMisses, cleanStreak })
  const recoveryState = classifyRecoveryState({ missedToday, reopenedToday, missedYesterday, recentMisses })
  const stabilizationMomentum = classifyStabilizationMomentum(cleanStreak)

  const bodyPressure = MOVABLE_BODY_IDS.reduce((acc, id) => {
    const body = movableBodies?.[id]
    const redPenalty = body?.plane && body.plane < 5 ? 24 : 0
    const drift = body?.driftFromSource || 0
    const skipped = skippedAssignments[id] || 0
    const completed = practiceStats[id]?.completed || 0
    const completionRelief = clamp(completed * 2, 0, 12)
    const pressure = Math.round(clamp(drift + redPenalty + skipped * 4 + recentMisses * 5 - completionRelief, 0, 100))
    acc[id] = {
      id,
      name: domainById(id).name,
      pressure,
      skipped,
      completed,
      redZone: !!(body?.plane && body.plane < 5),
      driftFromSource: drift,
    }
    return acc
  }, {})

  const ranked = Object.values(bodyPressure).sort((a, b) => b.pressure - a.pressure)
  const driftPressure = Math.round(clamp(
    recentMisses * 12 + recentReopened * 6 + overload.score * 0.45 + (ranked[0]?.pressure || 0) * 0.35,
    0,
    100
  ))

  const adaptationBias = overload.score >= 65 || recoveryState !== 'stable'
    ? 'lower_friction'
    : cleanStreak >= 7
      ? 'increase_depth'
      : cleanStreak >= 3
        ? 'reinforce_momentum'
        : 'establish_baseline'

  return {
    version: 'interference-state-v1',
    dateKey: getDateKey(date),
    driftPressure,
    stabilizationMomentum,
    recoveryState,
    overloadRisk: overload,
    adaptationBias,
    cleanStreak,
    recentMisses,
    recentReopened,
    skippedAssignments,
    bodyPressure,
    primaryPressureBody: ranked[0]?.id || 'd2',
    secondaryPressureBody: ranked[1]?.id || 'd3',
    summary: {
      label: recoveryState !== 'stable'
        ? 'Recovery pressure active'
        : overload.label === 'high'
          ? 'Overload risk active'
          : cleanStreak >= 3
            ? 'Stabilization momentum active'
            : 'Baseline being established',
    },
  }
}
