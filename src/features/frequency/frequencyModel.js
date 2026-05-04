import { DOMAINS } from '../../data'

export const SOURCE_CONNECTION_LEVEL = 5
export const CORE_ENERGY_START = 50
export const GRAY_ZONE_CORE_THRESHOLD = 93

export const LEVEL_THRESHOLDS = {
  3: 30,
  4: 40,
  5: 50,
  6: 60,
  7: 70,
  8: 80,
  9: 88,
  10: 93,
  11: 97,
}

export const FREQUENCY_PLANES = [
  { level: 3, name: 'Red Zone · Interference Dominant', zone: 'Red Zone', range: '3.0–3.9', color: '#E24B4A', bg: '#FCEBEB', desc: 'The variable bodies are mostly driving the experience. Source is not yet stable as the reference signal.' },
  { level: 4, name: 'Red Zone · Threshold Instability', zone: 'Red Zone', range: '4.0–4.9', color: '#D85A30', bg: '#FAECE7', desc: 'Stillness and direction can be accessed, but interference still disrupts continuity quickly.' },
  { level: 5, name: 'Blue Zone · Source Gate', zone: 'Blue Zone', range: '5.0–5.9', color: '#7F77DD', bg: '#EEEDFE', desc: 'The beginning of reconnection. Source becomes accessible as a living reference point, not only an idea.' },
  { level: 6, name: 'Blue Zone · Stabilizing Access', zone: 'Blue Zone', range: '6.0–6.9', color: '#8B84E8', bg: '#EEEDFE', desc: 'Source access becomes more consistent. The day can be initialized and corrected without collapse first.' },
  { level: 7, name: 'Blue Zone · Directed Alignment', zone: 'Blue Zone', range: '7.0–7.9', color: '#378ADD', bg: '#E6F1FB', desc: 'Mind, Field, Code, and Form increasingly take direction from Source instead of external programming.' },
  { level: 8, name: 'Blue Zone · Alchemical Integration', zone: 'Blue Zone', range: '8.0–8.9', color: '#1D9E75', bg: '#E1F5EE', desc: 'The five game pieces approach harmonic operation. This is the inner-alchemy band where split polarities can be integrated.' },
  { level: 9, name: 'Blue Zone · Threshold Preparation', zone: 'Blue Zone', range: '9.0–9.9', color: '#12946F', bg: '#E1F5EE', desc: 'The system prepares for the gray-zone threshold. Distortion is detected early and corrected before it becomes identity.' },
  { level: 10, name: 'Gray Zone · Neutrality Field', zone: 'Gray Zone', range: '10.0–10.9', color: '#5F6470', bg: '#EEF0F3', desc: 'Neutrality becomes the operating field. Source signal becomes increasingly direct and external pressure loses leverage.' },
  { level: 11, name: 'Gray Zone · Source Embodiment', zone: 'Gray Zone', range: '11.0', color: '#2F333A', bg: '#E3E5E8', desc: 'Full Source embodiment. The system is operating with very low contradiction, high neutrality, and strong core-cell integrity.' },
]

const DOMAIN_WEIGHTS = { d1: 1.4, d2: 1.0, d3: 1.0, d4: 1.0, d5: 1.0 }

const PRACTICE_ANCHORS = {
  d1: 'Stillness Exposure',
  d2: 'Sun + Circadian Anchor',
  d3: 'Name + Locate Emotion',
  d4: 'Morning Directive',
  d5: 'Pattern Interrupt',
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
}

function round2(n) { return Number(n.toFixed(2)) }
function round1(n) { return Number(n.toFixed(1)) }

function domainById(id) { return DOMAINS.find(d => d.id === id) || DOMAINS[0] }

function readLocalJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export function getFrequencyPlane(level) {
  const numeric = Number(level) || 3
  if (numeric >= 11) return FREQUENCY_PLANES.find(p => p.level === 11)
  if (numeric >= 10) return FREQUENCY_PLANES.find(p => p.level === 10)
  if (numeric >= 9) return FREQUENCY_PLANES.find(p => p.level === 9)
  if (numeric >= 8) return FREQUENCY_PLANES.find(p => p.level === 8)
  if (numeric >= 7) return FREQUENCY_PLANES.find(p => p.level === 7)
  if (numeric >= 6) return FREQUENCY_PLANES.find(p => p.level === 6)
  if (numeric >= 5) return FREQUENCY_PLANES.find(p => p.level === 5)
  if (numeric >= 4) return FREQUENCY_PLANES.find(p => p.level === 4)
  return FREQUENCY_PLANES.find(p => p.level === 3)
}

export function getDomainAnchor(domainId) { return PRACTICE_ANCHORS[domainId] || 'Stillness Exposure' }

function getDateFromKey(key) {
  const date = new Date(key)
  return Number.isNaN(date.getTime()) ? null : date
}

function getRecentMissedDays(dayStatus = {}, date = new Date(), windowDays = 7) {
  let count = 0
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(date)
    d.setDate(date.getDate() - i)
    const record = dayStatus?.[d.toDateString()]
    if (record?.status === 'missed') count += 1
  }
  return count
}

function getCompletedLockedDays(dayStatus = {}) {
  return Object.values(dayStatus || {}).filter(r => r?.status === 'locked' && !r?.missedAt && !r?.reopenedAt).length
}

function getCurrentStreak(dayStatus = {}, date = new Date()) {
  const today = date.toDateString()
  if (dayStatus?.[today]?.status === 'missed') return 0
  let streak = dayStatus?.[today]?.status === 'locked' && !dayStatus?.[today]?.missedAt && !dayStatus?.[today]?.reopenedAt ? 1 : 0
  for (let i = 1; i < 365; i++) {
    const d = new Date(date)
    d.setDate(date.getDate() - i)
    const record = dayStatus?.[d.toDateString()]
    if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) streak += 1
    else break
  }
  return streak
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function variance(values) {
  const avg = average(values)
  return average(values.map(v => Math.pow(v - avg, 2)))
}

export function getDomainLevel(score, domainId) {
  const s = clamp(score || 0, 0, 100)
  let level = 3
  Object.entries(LEVEL_THRESHOLDS).forEach(([lvl, threshold]) => {
    if (s >= threshold) level = Number(lvl)
  })

  // Source is the invariant reference body. It is considered present from Level 5 upward.
  // Its measured score still matters for the Level 5 Source Gate, but it does not block harmonization above Level 5.
  if (domainId === 'd1') return Math.max(level, SOURCE_CONNECTION_LEVEL)
  return level
}

function calculateDomainHarmonization(domainResonance = []) {
  const nonSource = domainResonance.filter(d => d.id !== 'd1')
  const minNonSourceLevel = Math.min(...nonSource.map(d => d.level))
  const maxAllowedLevel = Math.min(11, minNonSourceLevel + 1)
  const nextRequiredLevel = Math.min(10, Math.floor(maxAllowedLevel))
  const blockers = nonSource.filter(d => d.level < nextRequiredLevel)

  return {
    minNonSourceLevel,
    maxAllowedLevel,
    nextRequiredLevel,
    blockers,
    harmonizedAt: minNonSourceLevel,
  }
}

function buildInstabilityFlags({ coherence, harmony, coreEnergy, recentMissedDays, missedToday, reopenedToday, dailyEnergyRemaining }) {
  const flags = []
  if (missedToday) flags.push({ id: 'missed_today', label: 'Alignment not established today', severity: 2 })
  if (reopenedToday) flags.push({ id: 'reopened_today', label: 'Recovery mode active', severity: 1 })
  if (recentMissedDays >= 2) flags.push({ id: 'recent_misses', label: 'Recent misses detected', severity: 2 })
  if (coherence < 55) flags.push({ id: 'low_coherence', label: 'Low system coherence', severity: 2 })
  if (harmony < 65) flags.push({ id: 'domain_imbalance', label: 'Domain imbalance', severity: 2 })
  if (coreEnergy < 45) flags.push({ id: 'low_core', label: 'Low core reserve', severity: 2 })
  if (dailyEnergyRemaining < 35) flags.push({ id: 'low_daily_energy', label: 'Low daily supply remaining', severity: 1 })
  return flags
}

function getOperatingMode({ systemCoherence, coreEnergy, instabilityFlags }) {
  if (systemCoherence >= 75 && coreEnergy >= 70 && instabilityFlags.length <= 1) {
    return {
      label: 'Intentional Mode',
      desc: 'The system has enough reserve and coherence to operate from deliberate choice instead of reactive correction.',
      color: '#085041',
      bg: '#E1F5EE',
    }
  }
  if (systemCoherence < 60 || instabilityFlags.length >= 2) {
    return {
      label: 'Reactive Mode',
      desc: 'The system is still vulnerable to emotional charge, fragmented attention, or inconsistent execution.',
      color: '#A32D2D',
      bg: '#FCEBEB',
    }
  }
  return {
    label: 'Stabilizing Mode',
    desc: 'The system is moving out of reaction, but still needs repeated alignment before higher capacity becomes stable.',
    color: '#633806',
    bg: '#FAEEDA',
  }
}

function calculatePerformanceLayer({ coreEnergy, systemCoherence, instabilityFlags, harmony }) {
  const instabilityPenalty = clamp(instabilityFlags.reduce((sum, f) => sum + f.severity, 0) * 5, 0, 35)
  const thoughtAmplification = round2(clamp((systemCoherence / 100) * (harmony / 100), 0.1, 1.0))
  const perceivedExperienceRange = Math.round(clamp((coreEnergy * 0.45) + (systemCoherence * 0.45) + (harmony * 0.10) - instabilityPenalty, 0, 100))
  const environmentMatch = Math.round(clamp((systemCoherence * 0.55) + (harmony * 0.30) + (coreEnergy * 0.15) - instabilityPenalty, 0, 100))
  const outcomeQuality = Math.round(clamp((coreEnergy * systemCoherence * thoughtAmplification) / 100, 0, 100))

  return {
    thoughtAmplification,
    perceivedExperienceRange,
    environmentMatch,
    outcomeQuality,
  }
}

export function calculateCoreEnergy(dayStatus = {}) {
  const records = Object.entries(dayStatus || {})
    .map(([key, record]) => ({ key, date: getDateFromKey(key), record }))
    .filter(x => x.date)
    .sort((a, b) => a.date - b.date)

  let coreEnergy = CORE_ENERGY_START

  records.forEach(({ record }) => {
    if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) {
      const signal = clamp(record?.signal || 0, 0, 60)
      const recordCoherence = clamp(record?.coherence || record?.systemCoherence || 65, 10, 100)
      const conversionRate = clamp(recordCoherence / 100, 0.10, 0.95)
      const grossGain = clamp(0.45 + signal * 0.014, 0.45, 1.25)
      coreEnergy += grossGain * conversionRate
    } else if (record?.status === 'locked' && record?.reopenedAt) {
      coreEnergy += 0.15
    } else if (record?.status === 'missed') {
      coreEnergy -= 2.2
    }
  })

  return round1(clamp(coreEnergy, 0, 100))
}

export function calculateDailySupply(coreEnergy = CORE_ENERGY_START) {
  // Daily supply is tied to the existing core-cell reserve.
  // Low core = less daily allotment; high core = more usable capacity.
  return Math.round(clamp(35 + coreEnergy * 0.65, 35, 100))
}

export function calculateCoherenceScore(domainScores = {}) {
  const source = clamp(domainScores?.d1 || 0, 0, 100)
  const form = clamp(domainScores?.d2 || 0, 0, 100)
  const field = clamp(domainScores?.d3 || 0, 0, 100)
  const mind = clamp(domainScores?.d4 || 0, 0, 100)
  const code = clamp(domainScores?.d5 || 0, 0, 100)
  return (source * DOMAIN_WEIGHTS.d1 + form + field + mind + code) / 5.4
}

function calculateSystemCoherence(domainValues = [], sourceWeightedCoherence = 0) {
  const avg = average(domainValues)
  const variancePenalty = Math.sqrt(variance(domainValues)) * 0.72
  const balanceAdjusted = clamp(avg - variancePenalty, 0, 100)
  return clamp((balanceAdjusted * 0.70) + (sourceWeightedCoherence * 0.30), 0, 100)
}

export function calculateFrequencyState({ onboardingProfile = null, domainScores = {}, checked = {}, date = new Date(), dayStatus: externalDayStatus = null } = {}) {
  const dateKey = date.toDateString()
  const dayStatus = externalDayStatus || readLocalJson('q_day_status', {})
  const todayStatus = dayStatus?.[dateKey] || null
  const todayChecks = checked?.[dateKey] || {}

  const completedLockedDays = getCompletedLockedDays(dayStatus)
  const currentStreak = getCurrentStreak(dayStatus, date)
  const recentMissedDays = getRecentMissedDays(dayStatus, date, 7)
  const coreEnergy = calculateCoreEnergy(dayStatus)
  const dailySupply = calculateDailySupply(coreEnergy)
  const todayPracticeCount = Object.values(todayChecks || {}).filter(Boolean).length

  const baselineScores = DOMAINS.reduce((acc, d) => {
    const raw = onboardingProfile?.scores?.[d.id]
    acc[d.id] = raw ? clamp(raw * 10, 0, 100) : 35
    return acc
  }, {})

  const blendedDomainScores = DOMAINS.reduce((acc, d) => {
    const baseline = baselineScores[d.id]
    const practice = clamp(domainScores?.[d.id] || 0, 0, 100)
    const lockedLift = todayStatus?.status === 'locked' ? 5 : 0
    acc[d.id] = Math.round(clamp(baseline * 0.65 + practice * 0.30 + lockedLift, 0, 100))
    return acc
  }, {})

  const source = blendedDomainScores.d1 || 0
  const form = blendedDomainScores.d2 || 0
  const field = blendedDomainScores.d3 || 0
  const mind = blendedDomainScores.d4 || 0
  const code = blendedDomainScores.d5 || 0
  const values = [source, form, field, mind, code]
  const weakest = Math.min(...values)
  const strongest = Math.max(...values)
  const imbalance = strongest - weakest
  const sourceWeightedCoherence = calculateCoherenceScore(blendedDomainScores)
  const systemCoherence = calculateSystemCoherence(values, sourceWeightedCoherence)
  const harmony = Math.round(clamp(100 - imbalance, 0, 100))

  const missedToday = todayStatus?.status === 'missed'
  const reopenedToday = !!todayStatus?.reopenedAt
  const dailyEnergyRemaining = Math.round(clamp(
    dailySupply - 25 + (todayStatus?.status === 'locked' ? 12 : 0) + todayPracticeCount * 3 - (missedToday ? 18 : 0) - (reopenedToday ? 6 : 0),
    0,
    100
  ))

  const domainResonance = DOMAINS.map(d => {
    const resonance = blendedDomainScores[d.id]
    const level = getDomainLevel(resonance, d.id)
    return {
      ...d,
      baseline: baselineScores[d.id],
      practice: clamp(domainScores?.[d.id] || 0, 0, 100),
      resonance,
      level,
      anchorPractice: getDomainAnchor(d.id),
    }
  })

  const harmonization = calculateDomainHarmonization(domainResonance)
  const instabilityFlags = buildInstabilityFlags({
    coherence: systemCoherence,
    harmony,
    coreEnergy,
    recentMissedDays,
    missedToday,
    reopenedToday,
    dailyEnergyRemaining,
  })

  const streakBonus = currentStreak >= 30 ? 0.8 : currentStreak >= 14 ? 0.5 : currentStreak >= 7 ? 0.3 : currentStreak >= 3 ? 0.15 : 0
  const instabilityPenalty = clamp(instabilityFlags.reduce((sum, f) => sum + f.severity, 0) * 0.10, 0, 1.2)

  // Potential level: gradual climb driven by reserve, coherence, stability, and continuity.
  let potentialLevel = 3 + (systemCoherence / 100) * 3.1 + (coreEnergy / 100) * 2.7 + (harmony / 100) * 1.0 + streakBonus - instabilityPenalty

  const sourceGateMet = systemCoherence >= 45 && source >= 50 && completedLockedDays >= 3 && coreEnergy >= 50
  if (!sourceGateMet) potentialLevel = Math.min(potentialLevel, 4.9)

  // Harmonization gate: to advance from L to L+1, all non-Source domains must be harmonized at L.
  potentialLevel = Math.min(potentialLevel, harmonization.maxAllowedLevel + 0.9)

  const grayGateMet = coreEnergy >= GRAY_ZONE_CORE_THRESHOLD && source >= 90 && form >= 80 && field >= 80 && mind >= 80 && code >= 80 && currentStreak >= 30 && recentMissedDays === 0
  if (!grayGateMet) potentialLevel = Math.min(potentialLevel, 9.9)

  const level = round2(clamp(potentialLevel, 3, 11))
  const plane = getFrequencyPlane(level)
  const nextPlane = getFrequencyPlane(Math.min(11, Math.floor(level) + 1))
  const progressWithinLevel = level >= 11 ? 100 : Math.round((level - Math.floor(level)) * 100)

  const minDomain = domainResonance.reduce((a, b) => a.resonance <= b.resonance ? a : b)
  const maxDomain = domainResonance.reduce((a, b) => a.resonance >= b.resonance ? a : b)
  const operatingMode = getOperatingMode({ systemCoherence, coreEnergy, instabilityFlags })
  const performanceLayer = calculatePerformanceLayer({ coreEnergy, systemCoherence, instabilityFlags, harmony })

  const blockingDomains = harmonization.blockers.map(d => ({
    id: d.id,
    name: d.name,
    level: d.level,
    resonance: d.resonance,
    needed: LEVEL_THRESHOLDS[harmonization.nextRequiredLevel] || 100,
    gap: Math.max(0, (LEVEL_THRESHOLDS[harmonization.nextRequiredLevel] || 100) - d.resonance),
    anchorPractice: d.anchorPractice,
    color: d.color,
    bg: d.bg,
    text: d.text,
    icon: d.icon,
  }))

  const nextAction = (() => {
    if (!sourceGateMet) return { domain: domainById('d1'), practice: 'Stillness Exposure', reason: 'Level 5 requires stable Source access, enough core reserve, and repeated clean alignment.' }
    if (blockingDomains.length) {
      const target = blockingDomains.reduce((a, b) => a.gap >= b.gap ? a : b)
      return { domain: domainById(target.id), practice: target.anchorPractice, reason: `${target.name} is blocking advancement. Stabilize it to harmonize the current level.` }
    }
    const target = minDomain || domainById('d1')
    return { domain: target, practice: target.anchorPractice, reason: `${target.name} is the lowest current game piece. Raise this body to lift the whole system.` }
  })()

  return {
    dateKey,
    level,
    plane,
    nextPlane,
    zone: plane.zone,
    progressWithinLevel,
    sourceGateMet,
    sourceConnectionReady: sourceGateMet,
    sourceConnectionLevel: SOURCE_CONNECTION_LEVEL,
    grayGateMet,
    coreEnergy,
    dailySupply,
    dailyEnergyRemaining,
    coherence: Math.round(sourceWeightedCoherence),
    systemCoherence: Math.round(systemCoherence),
    source,
    form,
    field,
    mind,
    code,
    harmony,
    currentStreak,
    completedLockedDays,
    recentMissedDays,
    todayStatus: todayStatus?.status || 'pending',
    todayPracticeCount,
    missedToday,
    reopenedToday,
    instabilityFlags,
    instabilityCount: instabilityFlags.length,
    operatingMode,
    performanceLayer,
    harmonization,
    blockingDomains,
    advancementBlocked: blockingDomains.length > 0 || !sourceGateMet,
    domainResonance,
    maxDomain,
    minDomain,
    nextAction,
    thresholdGap: {
      source: Math.max(0, 50 - source),
      coherence: Math.max(0, 45 - Math.round(systemCoherence)),
      cleanLockedDays: Math.max(0, 3 - completedLockedDays),
      coreEnergy: Math.max(0, 50 - coreEnergy),
    },
    grayGateGap: {
      coreEnergy: Math.max(0, GRAY_ZONE_CORE_THRESHOLD - coreEnergy),
      source: Math.max(0, 90 - source),
      allDomains: Math.max(0, 80 - weakest),
      streak: Math.max(0, 30 - currentStreak),
      recentMissedDays,
    },
  }
}
