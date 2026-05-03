import { DOMAINS } from '../../data'

export const SOURCE_CONNECTION_LEVEL = 5

export const FREQUENCY_PLANES = [
  { level: 1, name: 'Fragmented Survival', band: 'Below Source contact', color: '#E24B4A', bg: '#FCEBEB', desc: 'The system is mostly reactive. Code, Field, and Form drive the experience with little stable witness awareness.' },
  { level: 2, name: 'Reactive Loop', band: 'Below Source contact', color: '#D85A30', bg: '#FAECE7', desc: 'Behavior loops repeat. Emotional charge and old programming dominate the day before conscious intention can direct it.' },
  { level: 3, name: 'Interference Dominant', band: 'Below Source contact', color: '#BA7517', bg: '#FAEEDA', desc: 'The five game pieces are visible, but the variable bodies pull in different directions. Source is mostly conceptual, not yet stable.' },
  { level: 4, name: 'Threshold Instability', band: 'Approaching Source contact', color: '#4A9AE8', bg: '#E6F1FB', desc: 'The system can touch stillness and direction, but interference still breaks connection quickly. This is the preparation level.' },
  { level: 5, name: 'Source Contact', band: 'Source-connected band', color: '#7F77DD', bg: '#EEEDFE', desc: 'The Source fractal becomes accessible as a living reference point. The user can return to the observer instead of only reacting from the bodies.' },
  { level: 6, name: 'Stabilized Access', band: 'Source-connected band', color: '#8B84E8', bg: '#EEEDFE', desc: 'Source access is no longer accidental. The day can be initialized from Source and corrected when drift appears.' },
  { level: 7, name: 'Directed Alignment', band: 'Source-connected band', color: '#378ADD', bg: '#E6F1FB', desc: 'Mind, Field, Code, and Form begin taking direction from Source. The system can self-correct without needing collapse first.' },
  { level: 8, name: 'Embodied Coherence', band: 'Source-connected band', color: '#1D9E75', bg: '#E1F5EE', desc: 'The frequency bodies are increasingly harmonious. The physical vessel, emotional field, conscious mind, and Code support the Source signal.' },
  { level: 9, name: 'Harmonic Integration', band: 'Source-connected band', color: '#12946F', bg: '#E1F5EE', desc: 'The five bodies function as one instrument. Distortion is detected early and corrected before it becomes identity.' },
  { level: 10, name: 'Sovereign Signal', band: 'Source-connected band', color: '#0F7E60', bg: '#D7F3EA', desc: 'Source is the operating reference. External pressure may create movement, but it does not define the user’s state.' },
  { level: 11, name: 'Unified Instrument', band: 'Source-connected band', color: '#085041', bg: '#D4F0E6', desc: 'The game pieces are harmonized around the Source fractal. The system operates with very low internal contradiction.' },
]

const DOMAIN_WEIGHTS = {
  d1: 1.45, // Source is the reference body; it gates Level 5+ access.
  d2: 1.0,
  d3: 1.1,
  d4: 1.15,
  d5: 1.2,
}

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

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS[0]
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

export function getFrequencyPlane(level) {
  return FREQUENCY_PLANES.find(p => p.level === level) || FREQUENCY_PLANES[0]
}

export function getDomainAnchor(domainId) {
  return PRACTICE_ANCHORS[domainId] || 'Stillness Exposure'
}

export function calculateFrequencyState({ onboardingProfile = null, domainScores = {}, checked = {}, date = new Date(), dayStatus: externalDayStatus = null } = {}) {
  const dateKey = date.toDateString()
  const dayStatus = externalDayStatus || readLocalJson('q_day_status', {})
  const todayStatus = dayStatus?.[dateKey] || null
  const todayChecks = checked?.[dateKey] || {}

  const lockedDates = Object.entries(dayStatus || {})
    .filter(([, record]) => record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt)
    .map(([key]) => key)

  const currentStreak = (() => {
    if (todayStatus?.status === 'missed') return 0
    let streak = todayStatus?.status === 'locked' && !todayStatus?.missedAt && !todayStatus?.reopenedAt ? 1 : 0
    for (let i = 1; i < 365; i++) {
      const d = new Date(date)
      d.setDate(d.getDate() - i)
      const record = dayStatus?.[d.toDateString()]
      if (record?.status === 'locked' && !record?.missedAt && !record?.reopenedAt) streak += 1
      else break
    }
    return streak
  })()

  const todayPracticeCount = Object.values(todayChecks || {}).filter(Boolean).length
  const dailyLockBonus = todayStatus?.status === 'locked' ? 8 : todayStatus?.status === 'active' ? 3 : 0
  const streakBonus = clamp(currentStreak * 1.5, 0, 12)
  const missedPenalty = todayStatus?.status === 'missed' ? 14 : 0

  const domainResonance = DOMAINS.map(domain => {
    const baselineRaw = onboardingProfile?.scores?.[domain.id]
    const baseline = baselineRaw ? clamp(baselineRaw * 10, 10, 100) : 35
    const practice = clamp(domainScores?.[domain.id] || 0, 0, 100)
    const weight = DOMAIN_WEIGHTS[domain.id] || 1
    const sourceBias = domain.id === 'd1' ? 4 : 0

    // Baseline = current constitutional resonance; practice = today’s tuning; lock/streak = continuity.
    const score = clamp(
      (baseline * 0.58) +
      (practice * 0.26) +
      ((dailyLockBonus + streakBonus + sourceBias) * 0.16 * 10 / 2.6),
      0,
      100
    )

    return {
      ...domain,
      baseline,
      practice,
      resonance: Math.round(clamp(score * weight, 0, 100)),
      anchorPractice: getDomainAnchor(domain.id),
    }
  })

  const byId = Object.fromEntries(domainResonance.map(d => [d.id, d]))
  const source = byId.d1?.resonance || 0
  const nonSource = domainResonance.filter(d => d.id !== 'd1')
  const nonSourceAvg = nonSource.reduce((sum, d) => sum + d.resonance, 0) / Math.max(nonSource.length, 1)
  const domainAvg = domainResonance.reduce((sum, d) => sum + d.resonance, 0) / Math.max(domainResonance.length, 1)
  const minDomain = domainResonance.reduce((a, b) => a.resonance <= b.resonance ? a : b)
  const maxDomain = domainResonance.reduce((a, b) => a.resonance >= b.resonance ? a : b)
  const spread = maxDomain.resonance - minDomain.resonance
  const harmony = clamp(100 - spread, 0, 100)
  const continuity = clamp((currentStreak * 12) + (todayStatus?.status === 'locked' ? 28 : 0) + (todayPracticeCount * 4), 0, 100)

  const sourceConnectionReady = source >= 50 && domainAvg >= 42
  const thresholdGap = {
    source: Math.max(0, 50 - source),
    domainAverage: Math.max(0, 42 - Math.round(domainAvg)),
    harmony: Math.max(0, 45 - harmony),
  }

  const rawFrequencyScore = clamp(
    (source * 0.36) +
    (nonSourceAvg * 0.30) +
    (harmony * 0.18) +
    (continuity * 0.16) -
    missedPenalty,
    0,
    100
  )

  let level = clamp(Math.floor(rawFrequencyScore / 10) + 1, 1, 11)
  if (!sourceConnectionReady) level = Math.min(level, 4)
  if (sourceConnectionReady && level < SOURCE_CONNECTION_LEVEL) level = SOURCE_CONNECTION_LEVEL

  const plane = getFrequencyPlane(level)
  const nextPlane = getFrequencyPlane(Math.min(11, level + 1))
  const progressWithinLevel = level >= 11 ? 100 : Math.round((rawFrequencyScore % 10) * 10)
  const needs = [...domainResonance].sort((a, b) => a.resonance - b.resonance).slice(0, 2)

  const nextAction = (() => {
    if (!sourceConnectionReady) return { domain: byId.d1, practice: 'Stillness Exposure', reason: 'Source contact must stabilize before the system can reliably operate above Plane 4.' }
    const target = needs[0] || byId.d1
    return { domain: target, practice: target.anchorPractice, reason: `${target.name} is the lowest current game piece. Stabilize this body to raise the whole system.` }
  })()

  return {
    dateKey,
    level,
    plane,
    nextPlane,
    rawFrequencyScore: Math.round(rawFrequencyScore),
    progressWithinLevel,
    sourceConnectionReady,
    sourceConnectionLevel: SOURCE_CONNECTION_LEVEL,
    source,
    nonSourceAvg: Math.round(nonSourceAvg),
    domainAvg: Math.round(domainAvg),
    harmony: Math.round(harmony),
    continuity: Math.round(continuity),
    currentStreak,
    todayStatus: todayStatus?.status || 'pending',
    todayPracticeCount,
    lockedDays: lockedDates.length,
    missedPenalty,
    thresholdGap,
    domainResonance,
    weakestDomain: minDomain,
    strongestDomain: maxDomain,
    nextAction,
    belowThreshold: !sourceConnectionReady,
  }
}
