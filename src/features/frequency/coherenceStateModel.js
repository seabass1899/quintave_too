import { DOMAINS } from '../../data'
import { calculateInterferenceState } from './interferenceStateModel'

export const SOURCE_REFERENCE = {
  id: 'd1',
  name: 'Source',
  fixed: true,
  role: 'core_reference',
  existsFromLevel: 5,
  existsThroughLevel: 11,
}

export const MOVABLE_BODY_IDS = ['d2', 'd3', 'd4', 'd5']
export const SUBPLANES_PER_LEVEL = 9

export const PLANE_BANDS = [
  { min: 0, max: 29, level: 3, zone: 'Red Zone', state: 'red_zone_floor' },
  { min: 30, max: 49, level: 4, zone: 'Red Zone', state: 'red_zone_interference' },
  { min: 50, max: 59, level: 5, zone: 'Blue Zone', state: 'source_gate_entry' },
  { min: 60, max: 69, level: 6, zone: 'Blue Zone', state: 'stabilizing_access' },
  { min: 70, max: 79, level: 7, zone: 'Blue Zone', state: 'directed_alignment' },
  { min: 80, max: 87, level: 8, zone: 'Blue Zone', state: 'alchemical_integration' },
  { min: 88, max: 92, level: 9, zone: 'Blue Zone', state: 'threshold_preparation' },
  { min: 93, max: 96, level: 10, zone: 'Gray Zone', state: 'neutrality_field' },
  { min: 97, max: 100, level: 11, zone: 'Gray Zone', state: 'source_embodiment' },
]

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function variance(values) {
  if (!values.length) return 0
  const avg = average(values)
  return average(values.map(v => Math.pow(v - avg, 2)))
}

function normalizeScore(value, fallback = 45) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return value <= 10 ? clamp(Math.round(value * 10), 0, 100) : clamp(Math.round(value), 0, 100)
}

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || { id, name: id }
}

function scoreToPlane(score) {
  const s = clamp(score, 0, 100)
  const band = PLANE_BANDS.find(b => s >= b.min && s <= b.max) || PLANE_BANDS[0]
  const span = Math.max(1, band.max - band.min + 1)
  const offset = clamp(s - band.min, 0, span - 1)
  const subPlane = clamp(Math.floor((offset / span) * SUBPLANES_PER_LEVEL) + 1, 1, SUBPLANES_PER_LEVEL)
  return { ...band, subPlane, score: s }
}

function getDateKey(date = new Date()) {
  return date.toDateString()
}

function getPreviousDateKey(date = new Date(), daysBack = 1) {
  const d = new Date(date)
  d.setDate(d.getDate() - daysBack)
  return d.toDateString()
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

function getOnboardingScores(onboardingProfile = null) {
  const profile = onboardingProfile || readLocalJson('q_onboarding', null)
  const scores = profile?.scores || {}
  return DOMAINS.reduce((acc, domain) => {
    if (typeof scores[domain.id] === 'number') acc[domain.id] = normalizeScore(scores[domain.id])
    return acc
  }, {})
}

function getMovableScore(domainId, domainScores = {}, onboardingScores = {}) {
  const live = typeof domainScores?.[domainId] === 'number' ? normalizeScore(domainScores[domainId], null) : null
  const onboarding = typeof onboardingScores?.[domainId] === 'number' ? normalizeScore(onboardingScores[domainId], null) : null

  if (live !== null && live > 0 && onboarding !== null) return Math.round(live * 0.55 + onboarding * 0.45)
  if (live !== null && live > 0) return live
  if (onboarding !== null) return onboarding
  return 45
}

function getCleanStreak(dayStatus = {}, date = new Date()) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const key = i === 0 ? getDateKey(date) : getPreviousDateKey(date, i)
    const record = dayStatus?.[key]
    if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) streak += 1
    else if (i > 0) break
    else break
  }
  return streak
}

function getRecentMisses(dayStatus = {}, date = new Date(), days = 7) {
  let misses = 0
  for (let i = 0; i < days; i++) {
    const key = i === 0 ? getDateKey(date) : getPreviousDateKey(date, i)
    if (dayStatus?.[key]?.status === 'missed') misses += 1
  }
  return misses
}

function classifySourceAccess(accessibility, redBodies = 0) {
  if (redBodies >= 2 || accessibility < 40) return 'faint'
  if (redBodies === 1 || accessibility < 55) return 'unstable'
  if (accessibility < 70) return 'accessible'
  if (accessibility < 85) return 'stable'
  return 'clear'
}

function bodyStateFromPlane(plane) {
  if (plane.level < 5) return 'needs_elevation'
  if (plane.level < 7) return 'stabilizing'
  if (plane.level < 9) return 'attuning'
  if (plane.level < 10) return 'threshold_ready'
  return 'gray_zone_stabilized'
}

export function calculateCoherenceState({ onboardingProfile = null, domainScores = {}, checked = {}, dayStatus = {}, date = new Date() } = {}) {
  const onboardingScores = getOnboardingScores(onboardingProfile)
  const movableBodies = {}
  const movableValues = []

  MOVABLE_BODY_IDS.forEach(id => {
    const score = getMovableScore(id, domainScores, onboardingScores)
    const plane = scoreToPlane(score)
    const domain = domainById(id)
    const redPenalty = plane.level < 5 ? 18 : 0
    const blueThresholdGap = Math.max(0, 50 - score)
    const driftFromSource = clamp(blueThresholdGap + redPenalty + Math.max(0, 70 - score) * 0.18, 0, 100)

    movableValues.push(score)
    movableBodies[id] = {
      id,
      name: domain.name,
      score,
      plane: plane.level,
      subPlane: plane.subPlane,
      zone: plane.zone,
      planeState: plane.state,
      driftFromSource: Math.round(driftFromSource),
      state: bodyStateFromPlane(plane),
    }
  })

  const values = Object.values(movableBodies)
  const redBodies = values.filter(b => b.plane < 5).length
  const lowestMovablePlane = Math.min(...values.map(b => b.plane))
  const highestMovablePlane = Math.max(...values.map(b => b.plane))
  const averageMovableScore = average(movableValues)
  const spreadPenalty = Math.sqrt(variance(movableValues)) * 0.7
  const redZonePenalty = redBodies * 9
  const cleanStreak = getCleanStreak(dayStatus, date)
  const recentMisses = getRecentMisses(dayStatus, date, 7)
  const interferenceState = calculateInterferenceState({ dayStatus, checked, date, movableBodies })
  const overloadPenalty = clamp((interferenceState?.overloadRisk?.score || 0) * 0.16, 0, 14)
  const driftPenalty = clamp((interferenceState?.driftPressure || 0) * 0.18, 0, 18)
  const streakBonus = clamp(cleanStreak * 1.25, 0, 12)
  const missPenalty = clamp(recentMisses * 6, 0, 24)

  const sourceAccessibility = Math.round(clamp(
    averageMovableScore - spreadPenalty - redZonePenalty - missPenalty - overloadPenalty - driftPenalty + streakBonus,
    0,
    100
  ))

  const sourceAccessState = classifySourceAccess(sourceAccessibility, redBodies)
  const coherenceDistance = Math.round(clamp(
    values.reduce((sum, b) => sum + b.driftFromSource, 0) / values.length + spreadPenalty + redZonePenalty + driftPenalty,
    0,
    100
  ))

  const sortedByDrag = [...values].sort((a, b) => {
    const aPressure = interferenceState?.bodyPressure?.[a.id]?.pressure || 0
    const bPressure = interferenceState?.bodyPressure?.[b.id]?.pressure || 0
    return (b.driftFromSource + bPressure * 0.35) - (a.driftFromSource + aPressure * 0.35)
  })
  const primary = sortedByDrag[0]
  const secondary = sortedByDrag[1]

  const operatingZone = redBodies
    ? (redBodies >= 2 ? 'Red-dominant mixed field' : 'Red/Blue mixed field')
    : lowestMovablePlane >= 10
      ? 'Gray Zone field'
      : 'Blue Zone field'

  return {
    version: 'coherence-state-v1',
    dateKey: getDateKey(date),
    source: {
      ...SOURCE_REFERENCE,
      accessibility: sourceAccessibility,
      accessState: sourceAccessState,
    },
    movableBodies,
    interference: interferenceState,
    system: {
      lowestMovablePlane,
      highestMovablePlane,
      averageMovableScore: Math.round(averageMovableScore),
      coherenceDistance,
      sourceAccessState,
      operatingZone,
      redBodyCount: redBodies,
      cleanStreak,
      recentMisses,
      primaryAttunementBody: primary?.id || 'd2',
      secondaryDrift: secondary?.id || 'd3',
      primaryDrag: primary?.driftFromSource || 0,
      secondaryDrag: secondary?.driftFromSource || 0,
      driftPressure: interferenceState?.driftPressure || 0,
      recoveryState: interferenceState?.recoveryState || 'stable',
      overloadRisk: interferenceState?.overloadRisk?.label || 'minimal',
      adaptationBias: interferenceState?.adaptationBias || 'establish_baseline',
    },
  }
}
