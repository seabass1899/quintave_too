import { DOMAINS, PRACTICES } from '../../data'
import { calculateCoherenceState } from '../frequency/coherenceStateModel'
import { calculateCoherenceTrajectory } from '../frequency/coherenceTrajectoryModel'

export const PHASES = [
  { id: 'morning', label: 'Morning', role: 'Initialize', required: 2, proceedMinimum: 1, unlockHour: 0 },
  { id: 'midday', label: 'Midday', role: 'Correct', required: 1, proceedMinimum: 1, unlockHour: 11 },
  { id: 'evening', label: 'Evening', role: 'Integrate', required: 1, proceedMinimum: 1, unlockHour: 17 },
]

export const DAILY_MINIMUM = 4

const MORNING_DOMAIN_ANCHORS = {
  d1: ['d1', 'Stillness Exposure'],
  d2: ['d2', 'Sun + Circadian Anchor'],
  d3: ['d2', 'Breathwork'],
  d4: ['d4', 'Morning Directive'],
  d5: ['d5', 'Affirmation Installation'],
}

const TOMORROW_ENTRY_LABELS = {
  d1: 'Stillness Exposure',
  d2: 'Sun + Circadian Anchor',
  d3: 'Breathwork',
  d4: 'Morning Directive',
  d5: 'Affirmation Installation',
}

const PHASE_POOLS = {
  morning: [
    ['d1', 'Stillness Exposure'],
    ['d4', 'Morning Directive'],
    ['d2', 'Sun + Circadian Anchor'],
    ['d5', 'Affirmation Installation'],
    ['d4', 'Visualization Practice'],
    ['d2', 'Breathwork'],
  ],
  midday: [
    ['d5', 'Pattern Interrupt'],
    ['d1', '5 Recall Triggers'],
    ['d3', 'Name + Locate Emotion'],
    ['d2', 'Breathwork'],
    ['d4', 'Thought Audit'],
    ['d2', 'Hydration Protocol'],
  ],
  evening: [
    ['d5', 'Pre-Sleep Programming'],
    ['d3', 'Emotional Log'],
    ['d4', 'Thought Audit'],
    ['d5', 'Dream Log'],
    ['d3', 'Forgiveness Protocol'],
    ['d3', 'Gratitude + Reframe'],
  ],
}


// Adaptive domain pools allow the Today Engine to personalize the daily alignment
// without changing the underlying practice library. The engine chooses inside the
// correct domain instead of serving the same static anchor to every user.
const MORNING_ADAPTIVE_POOLS = {
  d1: [
    ['d1', 'Observer Drill'],
    ['d1', 'Stillness Exposure'],
    ['d1', '5 Recall Triggers'],
    ['d1', 'Non-Local Body Scan'],
  ],
  d2: [
    ['d2', 'Sun + Circadian Anchor'],
    ['d2', 'Breathwork'],
    ['d2', 'Hydration Protocol'],
    ['d2', 'Training / Mobility'],
  ],
  d3: [
    ['d2', 'Breathwork'],
    ['d3', 'Name + Locate Emotion'],
    ['d3', 'Somatic Body Scan'],
    ['d3', '90-Second Rule'],
  ],
  d4: [
    ['d4', 'Morning Directive'],
    ['d4', 'Visualization Practice'],
    ['d4', 'Thought Audit'],
    ['d4', 'Daily Mantra Installation'],
  ],
  d5: [
    ['d5', 'Pattern Interrupt'],
    ['d5', 'Affirmation Installation'],
    ['d5', 'Trigger Mapping'],
    ['d5', 'Theta / Shadow Work'],
  ],
}

const REQUIRED_MORNING_POOL = [
  ['d4', 'Morning Directive'],
  ['d4', 'Visualization Practice'],
  ['d1', 'Observer Drill'],
  ['d5', 'Affirmation Installation'],
  ['d2', 'Breathwork'],
]

const OPTIONAL_MORNING_POOL = [
  ['d2', 'Sun + Circadian Anchor'],
  ['d2', 'Breathwork'],
  ['d2', 'Hydration Protocol'],
  ['d4', 'Visualization Practice'],
  ['d1', 'Observer Drill'],
  ['d5', 'Affirmation Installation'],
]

// Source is not a variable body competing for correction. It is the core
// reference field. Morning therefore always includes exactly one Source anchor
// so the movable bodies have a reference before correction begins.
const SOURCE_ANCHOR_POOL = [
  ['d1', 'Observer Drill'],
  ['d1', 'Stillness Exposure'],
  ['d1', '5 Recall Triggers'],
  ['d1', 'Non-Local Body Scan'],
  ['d1', 'Identity Decompression'],
]

const DOMAIN_FEEDBACK = {
  d1: { short: 'Source Stability', identity: 'You returned to the observer behind the noise.' },
  d2: { short: 'Form Vitality', identity: 'You strengthened the physical vessel that carries the signal.' },
  d3: { short: 'Field Regulation', identity: 'You processed charge instead of carrying it forward.' },
  d4: { short: 'Mind Direction', identity: 'You reclaimed the director\'s chair of attention.' },
  d5: { short: 'Code Override', identity: 'You interrupted automatic programming and chose differently.' },
}

export function getCurrentPhase(date = new Date()) {
  const hour = date.getHours()
  if (hour < 11) return 'morning'
  if (hour < 17) return 'midday'
  return 'evening'
}

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS[0]
}

function findPractice(domainId, practiceName) {
  const list = PRACTICES[domainId] || []
  const index = list.findIndex(p => p.name === practiceName)
  if (index < 0) return null
  const domain = domainById(domainId)
  const practice = list[index]
  return {
    ...practice,
    key: `${domainId}_${index}`,
    domain,
    phaseDomainId: domainId,
  }
}

function findPracticeByKey(key) {
  if (!key || typeof key !== 'string') return null
  const [domainId, indexRaw] = key.split('_')
  const index = Number(indexRaw)
  const practice = (PRACTICES[domainId] || [])[index]
  if (!practice) return null
  const domain = domainById(domainId)
  return {
    ...practice,
    key,
    domain,
    phaseDomainId: domainId,
  }
}

export const TODAY_PLAN_VERSION = 9

function getPracticeCrossCount(item) {
  return Array.isArray(item?.cross) ? item.cross.length : 0
}

function isHighLeveragePractice(item) {
  return getPracticeCrossCount(item) >= 2
}

function getLeverageLabel(item) {
  const crossCount = getPracticeCrossCount(item)
  if (crossCount >= 3) return `High leverage · ripples to ${crossCount} domains`
  if (crossCount >= 2) return `High leverage · ripples to ${crossCount} domains`
  return ''
}

function getPickLeverageScore(pick, weak = []) {
  const item = pick ? findPractice(...pick) : null
  if (!item) return -999
  const primary = item.phaseDomainId || item.domain?.id
  const crossCount = getPracticeCrossCount(item)
  const weakBonus = weak?.[0] === primary ? 6 : weak?.slice(1, 3).includes(primary) ? 3 : 0
  const leverageBonus = crossCount >= 3 ? 5 : crossCount >= 2 ? 3 : 0
  return weakBonus + leverageBonus + crossCount
}

function bestAvailablePick(candidates = [], used = new Set(), weak = []) {
  return candidates
    .filter(([domainId, name]) => {
      const item = findPractice(domainId, name)
      return item && !used.has(item.key)
    })
    .sort((a, b) => getPickLeverageScore(b, weak) - getPickLeverageScore(a, weak))[0] || null
}

function uniqueByKey(items) {
  const seen = new Set()
  return items.filter(item => {
    if (!item || seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
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

function stableHash(input = '') {
  let hash = 2166136261
  const str = String(input)
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

function getSelectorSeed() {
  if (!storageAvailable()) return 'server-seed'
  const existing = localStorage.getItem('q_selector_seed')
  if (existing) return existing
  const seed = `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`
  localStorage.setItem('q_selector_seed', seed)
  return seed
}

function normalizeOnboardingScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  // Older onboarding scores may be 1–10; domain scores are 0–100.
  return value <= 10 ? Math.round(value * 10) : Math.max(0, Math.min(100, Math.round(value)))
}

function getOnboardingScores() {
  const profile = safeReadJSON('q_onboarding', null)
  const scores = profile?.scores || {}
  return DOMAINS.reduce((acc, domain) => {
    const score = normalizeOnboardingScore(scores[domain.id])
    if (score !== null) acc[domain.id] = score
    return acc
  }, {})
}

function seededFallbackScore(domainId, date = new Date()) {
  const seed = getSelectorSeed()
  const dateScope = `${date.getFullYear()}-${date.getMonth()}`
  // 35–55 creates a neutral-but-varied baseline for users who have not completed onboarding.
  return 35 + (stableHash(`${seed}|${dateScope}|${domainId}`) % 21)
}

function effectiveDomainScore(domainId, domainScores = {}, date = new Date()) {
  const live = typeof domainScores?.[domainId] === 'number' ? domainScores[domainId] : null
  const onboarding = getOnboardingScores()[domainId]
  if (live !== null && live > 0 && onboarding !== undefined) return Math.round(live * 0.65 + onboarding * 0.35)
  if (live !== null && live > 0) return live
  if (onboarding !== undefined) return onboarding
  return seededFallbackScore(domainId, date)
}

function weakestDomains(domainScores = {}, date = new Date()) {
  return [...DOMAINS]
    .map(domain => ({ ...domain, effectiveScore: effectiveDomainScore(domain.id, domainScores, date) }))
    .sort((a, b) => a.effectiveScore - b.effectiveScore)
    .map(d => d.id)
}

function getDomainDiagnostics(domainScores = {}, date = new Date()) {
  return [...DOMAINS]
    .map(domain => ({
      ...domain,
      effectiveScore: effectiveDomainScore(domain.id, domainScores, date),
      liveScore: typeof domainScores?.[domain.id] === 'number' ? domainScores[domain.id] : null,
      onboardingScore: getOnboardingScores()[domain.id] ?? null,
    }))
    .sort((a, b) => a.effectiveScore - b.effectiveScore)
}

function getRecentStatusFlags(dayStatus = {}, date = new Date()) {
  const todayKey = getDateKey(date)
  const previousKey = getPreviousDateKey(date, 1)
  const current = dayStatus?.[todayKey] || null
  const previous = dayStatus?.[previousKey] || null
  return {
    current,
    previous,
    isRecovery: current?.status === 'active' && !!current?.reopenedAt,
    missedYesterday: previous?.status === 'missed',
    previousCorrectionDomain: previous?.correctionDomain || null,
    previousStrongestDomain: previous?.strongestDomain || null,
  }
}

function buildAlignmentDecision({ domainScores = {}, checked = {}, dayStatus = {}, date = new Date(), primedDomainId = null, onboardingProfile = null } = {}) {
  const coherenceState = calculateCoherenceState({ onboardingProfile, domainScores, checked, dayStatus, date })
  const interferenceState = coherenceState?.interference || null
  const trajectoryState = calculateCoherenceTrajectory({ checked, dayStatus, date, currentCoherenceState: coherenceState })
  const status = getRecentStatusFlags(dayStatus, date)
  const history = getRecentPracticeHistory(checked, date, 7)
  const behaviorStats = getPracticeBehaviorStats(checked, date, 7)

  // Source is the fixed core reference. The engine selects the movable body that
  // has drifted furthest from Source accessibility rather than treating Source
  // as a normal weak domain.
  const primaryFromState = coherenceState?.system?.primaryAttunementBody || 'd2'
  const secondaryFromState = coherenceState?.system?.secondaryDrift || 'd3'
  const pressureBody = interferenceState?.primaryPressureBody || null
  const trajectoryBody = trajectoryState?.dominantDriftBody || null
  const inheritedDomain = primedDomainId || status.previousCorrectionDomain || null
  const inheritedIsMovable = inheritedDomain && inheritedDomain !== 'd1'
  const pressureIsMovable = pressureBody && pressureBody !== 'd1'
  const pressureDominates = (interferenceState?.driftPressure || 0) >= 55
  const trajectoryDominates = (trajectoryState?.dominantDriftScore || 0) >= 52 || ['drifting', 'recovering'].includes(trajectoryState?.trend)
  const trajectoryIsMovable = trajectoryBody && trajectoryBody !== 'd1'
  const primaryBlockerId = inheritedIsMovable
    ? inheritedDomain
    : pressureDominates && pressureIsMovable
      ? pressureBody
      : trajectoryDominates && trajectoryIsMovable
        ? trajectoryBody
        : primaryFromState
  const trajectorySecondary = trajectoryState?.secondaryDriftBody || null
  const secondaryBlockerId = trajectorySecondary && trajectorySecondary !== primaryBlockerId
    ? trajectorySecondary
    : secondaryFromState === primaryBlockerId
      ? (['d2', 'd3', 'd4', 'd5'].find(id => id !== primaryBlockerId) || 'd3')
      : secondaryFromState

  const strongestDomainId = [...Object.values(coherenceState?.movableBodies || {})]
    .sort((a, b) => b.score - a.score)[0]?.id || 'd2'

  const instabilityFlags = []
  if (status.missedYesterday) instabilityFlags.push('missed_previous_day')
  if (status.isRecovery) instabilityFlags.push('recovery_mode')
  if (coherenceState?.system?.redBodyCount > 0) instabilityFlags.push('red_zone_body_present')
  if ((coherenceState?.source?.accessibility || 0) < 45) instabilityFlags.push('faint_source_access')

  Object.values(coherenceState?.movableBodies || {})
    .filter(b => b.score < 35)
    .slice(0, 2)
    .forEach(b => instabilityFlags.push(`low_${b.id}`))

  const primaryDomainStats = behaviorStats.byDomain?.[primaryBlockerId] || { assigned: 0, completed: 0, skipped: 0 }
  const trajectoryBiasMap = {
    recovery_first: 'lower_friction',
    lower_friction: 'lower_friction',
    stabilize_before_expansion: 'establish_baseline',
    increase_depth: 'increase_depth',
    reinforce_momentum: 'reinforce_momentum',
    establish_baseline: 'establish_baseline',
  }
  const trajectoryBias = trajectoryBiasMap[trajectoryState?.recommendationBias] || null
  const behaviorMode = interferenceState?.adaptationBias || trajectoryBias || (primaryDomainStats.skipped >= 2
    ? 'lower_friction'
    : primaryDomainStats.completed >= 3
      ? 'increase_depth'
      : primaryDomainStats.completed >= 1
        ? 'reinforce_momentum'
        : 'establish_baseline')

  const primaryBody = coherenceState?.movableBodies?.[primaryBlockerId]
  const inheritedReason = inheritedIsMovable
    ? `${domainById(inheritedDomain).name} carried forward as yesterday's correction point.`
    : null
  const reason = inheritedReason || `${primaryBody?.name || domainById(primaryBlockerId).name} has the greatest coherence drag from the Source reference today.`

  const recoveryState = interferenceState?.recoveryState || 'stable'
  const strategy = status.missedYesterday || status.isRecovery || trajectoryState?.recommendationBias === 'recovery_first' || ['missed_today', 'active_recovery', 'recovery_first', 'unstable_recovery'].includes(recoveryState)
    ? 'recovery_first'
    : coherenceState?.system?.redBodyCount > 0 || trajectoryState?.recommendationBias === 'stabilize_before_expansion'
      ? 'elevate_red_zone_body'
      : (interferenceState?.overloadRisk?.label === 'high')
        ? 'reduce_overload'
        : (interferenceState?.driftPressure || 0) >= 60 || trajectoryState?.trend === 'drifting'
          ? 'stabilize_interference_pressure'
          : (coherenceState?.system?.coherenceDistance || 0) >= 45
            ? 'restore_source_attunement'
            : (coherenceState?.source?.accessibility || 0) < 65
              ? 'stabilize_source_access'
              : 'advance_with_balance'

  const baseExplanation = strategy === 'recovery_first'
    ? 'The system is prioritizing recovery before expansion. Today starts with the movable body that needs to be re-attuned first.'
    : strategy === 'elevate_red_zone_body'
      ? 'At least one movable frequency body is below the Source-access threshold. Today prioritizes elevation toward Level 5 before expansion.'
      : strategy === 'reduce_overload'
        ? 'The system detected overload risk. Today lowers friction so stabilization can happen without adding unnecessary strain.'
        : strategy === 'stabilize_interference_pressure'
          ? 'The system detected accumulated drift pressure. Today prioritizes the body creating the strongest interference load.'
          : strategy === 'restore_source_attunement'
            ? 'The system detected significant drift from the Source reference. Today closes the largest attunement gap first.'
            : strategy === 'stabilize_source_access'
              ? 'Source is fixed, but accessibility is not yet stable through the movable bodies. Today reinforces the bridge back to Source alignment.'
              : 'The system is preserving balance while adding signal through higher-leverage practices.'

  const behaviorExplanation = behaviorMode === 'lower_friction'
    ? 'Recent resistance was detected, so the engine is favoring a lower-friction entry point.'
    : behaviorMode === 'increase_depth'
      ? 'Recent consistency was detected, so the engine is rotating beyond the repeated pattern.'
      : behaviorMode === 'reinforce_momentum'
        ? 'Recent completion was detected, so the engine is reinforcing the current momentum without repeating blindly.'
        : 'The engine is establishing a baseline pattern before increasing complexity.'

  const trajectoryExplanation = trajectoryState?.explanation ? ` ${trajectoryState.explanation}` : ''
  const explanation = `${baseExplanation} ${behaviorExplanation}${trajectoryExplanation}`

  return {
    version: 'coherence-state-decision-v1',
    dateKey: getDateKey(date),
    sourceReference: coherenceState.source,
    coherenceState,
    primaryBlockerId,
    secondaryBlockerId,
    primaryAttunementBodyId: primaryBlockerId,
    secondaryDriftId: secondaryBlockerId,
    strongestDomainId,
    reason,
    strategy,
    explanation,
    instabilityFlags,
    behaviorMode,
    interferenceState,
    trajectoryState,
    trajectorySummary: {
      trend: trajectoryState?.trend || 'baseline_building',
      dominantDriftBody: trajectoryState?.dominantDriftBody || null,
      dominantDriftScore: trajectoryState?.dominantDriftScore || 0,
      secondaryDriftBody: trajectoryState?.secondaryDriftBody || null,
      mostStableBody: trajectoryState?.mostStableBody || null,
      riskPattern: trajectoryState?.riskPattern || 'none',
      recommendationBias: trajectoryState?.recommendationBias || 'establish_baseline',
      recentLocked: trajectoryState?.recentLocked || 0,
      recentMisses: trajectoryState?.recentMisses || 0,
    },
    interferenceSummary: {
      driftPressure: interferenceState?.driftPressure || 0,
      recoveryState: interferenceState?.recoveryState || 'stable',
      overloadRisk: interferenceState?.overloadRisk?.label || 'minimal',
      stabilizationMomentum: interferenceState?.stabilizationMomentum || 'none',
      adaptationBias: interferenceState?.adaptationBias || behaviorMode,
    },
    behaviorSummary: {
      primaryDomain: primaryBlockerId,
      assigned: primaryDomainStats.assigned,
      completed: primaryDomainStats.completed,
      skipped: primaryDomainStats.skipped,
    },
    domainDiagnostics: Object.values(coherenceState.movableBodies || {}).map(b => ({
      id: b.id,
      name: b.name,
      effectiveScore: b.score,
      plane: b.plane,
      subPlane: b.subPlane,
      zone: b.zone,
      driftFromSource: b.driftFromSource,
      state: b.state,
    })),
    recentPracticeKeys: history.slice(-8).map(h => h.key),
  }
}

function getPhaseFitBonus(item, phase = '', slot = '') {
  const name = item?.name || ''
  if (phase === 'morning') {
    const rawTargetDomain = decision?.primaryBlockerId || primedDomainId || weak.find(id => id !== 'd1') || 'd2'
    const targetDomain = rawTargetDomain === 'd1' ? (weak.find(id => id !== 'd1') || 'd2') : rawTargetDomain
    const adaptivePool = MORNING_ADAPTIVE_POOLS[targetDomain] || MORNING_ADAPTIVE_POOLS.d2

    // 1) Source anchor: non-negotiable reference field. This is not because
    // Source is weak; it is because the movable bodies require a stable
    // reference before correction begins.
    pushSmart(
      SOURCE_ANCHOR_POOL,
      'Required',
      'Establish Source as the reference field before correcting the movable bodies',
      'source_anchor',
      'd1'
    )

    // 2) Primary attunement: selected from the current movable-body correction
    // domain, with anti-repeat, behavior adaptation, and leverage weighting.
    pushSmart(
      adaptivePool,
      'Critical',
      primedDomainId ? "Yesterday's correction anchor" : 'Primary movable-body attunement anchor',
      'critical',
      targetDomain
    )

    // 3) Optional support: regulate the vessel, add leverage, or support the
    // next weakest signal without repeating the Source anchor or the correction.
    const rotated = [
      ...OPTIONAL_MORNING_POOL.slice(rotationIndex(date, OPTIONAL_MORNING_POOL.length)),
      ...OPTIONAL_MORNING_POOL.slice(0, rotationIndex(date, OPTIONAL_MORNING_POOL.length))
    ]
    const optionalItem = smartPick(rotated, combinedUsed(), { weak, history, behaviorStats, date, phase, slot: 'optional', preferredDomainId: weak[2] || targetDomain, decision })
    const optionalPick = pickToTuple(optionalItem)
    const optionalReason = optionalPick?.[1] === 'Visualization Practice'
      ? 'Rehearse the state before the day tests it'
      : optionalPick?.[1] === 'Breathwork'
        ? 'Regulate the vessel before external input'
        : optionalPick?.[1] === 'Observer Drill'
          ? 'Strengthen witness awareness early'
          : optionalPick?.[1] === 'Affirmation Installation'
            ? 'Install the chosen identity signal'
            : optionalPick?.[1] === 'Hydration Protocol'
              ? 'Restore physical signal flow early'
              : 'Stabilize Form early'
    push(optionalPick, 'Optional', optionalReason)
  }

  if (phase === 'midday') {
    if (/Pattern Interrupt|Recall|Emotion|Breathwork|Thought Audit|Hydration|90-Second|Training/.test(name)) return 5
    return 0
  }
  if (phase === 'evening') {
    if (/Pre-Sleep|Emotional Log|Gratitude|Forgiveness|Dream|Belief|Body Scan|Sleep/.test(name)) return 5
    return 0
  }
  return 0
}

function whyFromDecision(decision, phase, slot, item, fallback) {
  const domainName = domainById(decision?.primaryBlockerId || item?.phaseDomainId || item?.domain?.id || 'd1').name
  if (!decision) return fallback
  if (slot === 'source_anchor') return 'Source anchor selected to establish the reference field before correcting the movable bodies.'
  if (slot === 'critical') {
    if (phase === 'morning') return `${domainName} is today's primary attunement body. ${decision.strategy === 'recovery_first' ? 'Recovery comes before expansion.' : 'Begin here after the Source reference is established.'}`
    if (phase === 'midday') return `${domainName} is the drift point being corrected before the day runs on autopilot.`
    if (phase === 'evening') return `${domainName} is the open alignment point being closed before sleep.`
  }
  if (slot === 'required') return `Required stabilizer selected to support ${domainById(decision.primaryBlockerId).name} without repeating the critical practice.`
  if (slot === 'adaptive') return `Adaptive correction selected from the next weakest signal: ${domainById(decision.secondaryBlockerId).name}.`
  if (slot === 'optional') return `Optional support selected to add signal without overloading the system.`
  return fallback
}

function getRecentPracticeHistory(checked = {}, date = new Date(), daysBack = 7) {
  const history = []
  for (let i = daysBack; i >= 1; i--) {
    const key = getPreviousDateKey(date, i)
    const dayChecks = checked?.[key] || {}
    Object.entries(dayChecks).forEach(([practiceKey, done]) => {
      if (done) history.push({ key: practiceKey, date: key })
    })
  }
  return history
}

function getRecentAssignedPracticeHistory(date = new Date(), daysBack = 7) {
  const plans = safeReadJSON('q_today_plan', {})
  const assignments = []
  for (let i = daysBack; i >= 1; i--) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    if (!plan?.phases) continue
    Object.entries(plan.phases).forEach(([phaseId, phase]) => {
      ;(phase?.items || []).forEach(item => {
        if (item?.key) assignments.push({ key: item.key, date: key, phase: phaseId })
      })
    })
  }
  return assignments
}

function getPracticeBehaviorStats(checked = {}, date = new Date(), daysBack = 7) {
  const completed = getRecentPracticeHistory(checked, date, daysBack)
  const assigned = getRecentAssignedPracticeHistory(date, daysBack)
  const completedSet = new Set(completed.map(h => `${h.date}::${h.key}`))
  const byPractice = {}
  const byDomain = {}

  assigned.forEach(a => {
    const practice = findPracticeByKey(a.key)
    const domainId = practice?.phaseDomainId || practice?.domain?.id || a.key.split('_')[0]
    const completedThisAssignment = completedSet.has(`${a.date}::${a.key}`)

    if (!byPractice[a.key]) {
      byPractice[a.key] = { key: a.key, domainId, assigned: 0, completed: 0, skipped: 0, lastAssigned: null, lastCompleted: null }
    }
    byPractice[a.key].assigned += 1
    byPractice[a.key].lastAssigned = a.date
    if (completedThisAssignment) {
      byPractice[a.key].completed += 1
      byPractice[a.key].lastCompleted = a.date
    } else {
      byPractice[a.key].skipped += 1
    }

    if (!byDomain[domainId]) byDomain[domainId] = { domainId, assigned: 0, completed: 0, skipped: 0 }
    byDomain[domainId].assigned += 1
    if (completedThisAssignment) byDomain[domainId].completed += 1
    else byDomain[domainId].skipped += 1
  })

  // Completed practices may include older plans or manually checked library practices.
  completed.forEach(c => {
    if (!byPractice[c.key]) {
      const practice = findPracticeByKey(c.key)
      const domainId = practice?.phaseDomainId || practice?.domain?.id || c.key.split('_')[0]
      byPractice[c.key] = { key: c.key, domainId, assigned: 0, completed: 0, skipped: 0, lastAssigned: null, lastCompleted: null }
    }
    byPractice[c.key].completed += 1
    byPractice[c.key].lastCompleted = c.date
  })

  return { byPractice, byDomain, assigned, completed }
}

function getPracticeFriction(item) {
  const name = item?.name || ''
  if (/Theta|Shadow|Deep Work|Training|Mobility|Cold Exposure|Forgiveness|Deathlessness|Identity Decompression/.test(name)) return 3
  if (/Stillness|Visualization|Somatic|Belief Audit|Trigger Mapping|Emotional Log|Observer/.test(name)) return 2
  return 1
}

function getBehaviorAdjustment(item, behaviorStats, decision) {
  if (!item || !behaviorStats) return { score: 0, label: null }
  const keyStats = behaviorStats.byPractice?.[item.key] || { assigned: 0, completed: 0, skipped: 0 }
  const domainId = item.phaseDomainId || item.domain?.id
  const domainStats = behaviorStats.byDomain?.[domainId] || { assigned: 0, completed: 0, skipped: 0 }
  const friction = getPracticeFriction(item)

  let score = 0
  let label = null

  // Repeated skips mean the app should lower friction rather than stubbornly repeat.
  if (keyStats.skipped >= 2) {
    score -= 18
    label = 'reduced_repeat_after_skips'
  }

  // If the domain itself is being skipped, favor lower-friction practices in that same domain.
  if (domainStats.skipped >= 2 && friction === 1) {
    score += 8
    label = label || 'low_friction_reentry'
  }

  // If a user completes the same exact practice repeatedly, rotate rather than over-serving it.
  if (keyStats.completed >= 3) {
    score -= 8
    label = label || 'mastered_rotate_deeper'
  }

  // Streak momentum can tolerate slightly higher leverage, as long as the exact practice is not overused.
  const primary = decision?.primaryBlockerId
  if (domainId === primary && domainStats.completed >= 2 && friction <= 2) {
    score += 5
    label = label || 'domain_momentum'
  }

  // Avoid high-friction critical assignments when a user has been skipping that domain.
  if (domainId === primary && domainStats.skipped >= 2 && friction >= 3) {
    score -= 10
    label = label || 'avoid_high_friction_in_resistance'
  }

  return { score, label }
}

function scoreCandidate(item, { weak = [], used = new Set(), history = [], behaviorStats = null, date = new Date(), phase = '', slot = '', preferredDomainId = null, decision = null } = {}) {
  if (!item || used.has(item.key)) return -9999
  const primary = item.phaseDomainId || item.domain?.id
  const cross = item.cross || []
  const crossCount = getPracticeCrossCount(item)
  const recentIndex = history.slice(-8).findIndex(h => h.key === item.key)
  const repeatedRecently = recentIndex >= 0
  const immediateRepeat = history.slice(-3).some(h => h.key === item.key)
  const weakBonus = weak?.[0] === primary ? 10 : weak?.slice(1, 3).includes(primary) ? 5 : 0
  const preferredBonus = preferredDomainId === primary ? 9 : cross.includes(preferredDomainId) ? 4 : 0
  const decisionBonus = decision?.primaryBlockerId === primary ? 14 : decision?.secondaryBlockerId === primary ? 7 : 0
  const recoveryBonus = decision?.strategy === 'recovery_first' && decision?.primaryBlockerId === primary ? 6 : 0
  const trajectoryBonus = decision?.trajectorySummary?.dominantDriftBody === primary ? 6 : decision?.trajectorySummary?.secondaryDriftBody === primary ? 3 : 0
  const stabilityDepthBonus = decision?.trajectorySummary?.mostStableBody === primary && decision?.behaviorMode === 'increase_depth' ? 3 : 0
  const leverageBonus = crossCount >= 3 ? 7 : crossCount >= 2 ? 5 : crossCount
  const phaseFitBonus = getPhaseFitBonus(item, phase, slot)
  const repeatPenalty = immediateRepeat ? -22 : repeatedRecently ? -10 : 0
  const behavior = getBehaviorAdjustment(item, behaviorStats, decision)
  const criticalFrictionPenalty = slot === 'critical' && decision?.behaviorMode === 'lower_friction' && getPracticeFriction(item) >= 3 ? -8 : 0
  const depthBonus = decision?.behaviorMode === 'increase_depth' && getPracticeFriction(item) >= 2 && !repeatedRecently ? 5 : 0
  const deterministicJitter = (stableHash(`${getSelectorSeed()}|${getDateKey(date)}|${phase}|${slot}|${item.key}`) % 1000) / 1000
  return weakBonus + preferredBonus + decisionBonus + recoveryBonus + trajectoryBonus + stabilityDepthBonus + leverageBonus + phaseFitBonus + repeatPenalty + behavior.score + criticalFrictionPenalty + depthBonus + deterministicJitter
}

function smartPick(candidates = [], used = new Set(), context = {}) {
  const ranked = candidates
    .map(([domainId, name]) => findPractice(domainId, name))
    .filter(Boolean)
    .map(item => ({ item, score: scoreCandidate(item, { ...context, used }) }))
    .filter(entry => entry.score > -9999)
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.item || null
}

function pickToTuple(item) {
  return item ? [item.phaseDomainId || item.domain?.id, item.name] : null
}

function completionFor(items, todayChecks = {}) {
  const required = items.filter(i => i.priority === 'Critical' || i.priority === 'Required')
  const completeRequired = required.filter(i => !!todayChecks[i.key]).length
  return {
    required: required.length,
    completeRequired,
    pct: required.length ? Math.round((completeRequired / required.length) * 100) : 0,
  }
}

function getScoreImpact(item, priority) {
  // Final scoring model:
  // Completion is discipline. Signal is quality. Cross-domain practices generate ripple.
  const baseByPriority = { Critical: 6, Required: 4, Adaptive: 3, Optional: 2 }
  const domainWeight = { d1: 1.5, d2: 1.0, d3: 1.15, d4: 1.1, d5: 1.25 }
  const primary = item?.phaseDomainId || item?.domain?.id || 'd1'
  const base = baseByPriority[priority] || 2
  const highLeverage = isHighLeveragePractice(item)
  const multiplier = highLeverage ? 1.3 : 1
  const primaryPoints = Math.max(1, Math.round(base * multiplier * (domainWeight[primary] || 1)))
  const impact = { [primary]: primaryPoints }

  ;(item?.cross || []).forEach(domainId => {
    const rippleBase = base * 0.45 * multiplier
    const ripple = Math.max(1, Math.round(rippleBase * (domainWeight[domainId] || 1)))
    impact[domainId] = (impact[domainId] || 0) + ripple
  })
  return impact
}

function getIdentityFeedback(item) {
  const name = item?.name || ''
  if (name.includes('Stillness')) return 'You returned to the observer behind the noise.'
  if (name.includes('Morning Directive')) return 'You claimed the day before the day claimed you.'
  if (name.includes('Pattern Interrupt')) return 'You interrupted an automatic pattern and chose differently.'
  if (name.includes('Recall')) return 'You remembered yourself inside the motion of the day.'
  if (name.includes('Emotion')) return 'You read the emotional field instead of being consumed by it.'
  if (name.includes('Breath')) return 'You regulated the vessel and restored signal clarity.'
  if (name.includes('Pre-Sleep')) return 'You programmed the system before the subconscious window opened.'
  if (name.includes('Thought Audit')) return 'You observed thought instead of obeying it.'
  if (name.includes('Sleep')) return 'You protected the platform every other domain runs on.'
  if (name.includes('Sun')) return 'You anchored the vessel to the day instead of drifting into it.'
  if (name.includes('Hydration')) return 'You restored physical signal flow.'
  return DOMAIN_FEEDBACK[item?.domain?.id]?.identity || `You strengthened ${item.domain?.name || 'the system'} coherence.`
}

function getAnalyticFeedback(item, scoreImpact) {
  const primaryId = item?.phaseDomainId || item?.domain?.id
  const primary = DOMAIN_FEEDBACK[primaryId]?.short || `${item?.domain?.name || 'Domain'} Stability`
  const primaryPoints = scoreImpact?.[primaryId] || 0
  const ripplePoints = Object.entries(scoreImpact || {})
    .filter(([id]) => id !== primaryId)
    .reduce((sum, [, value]) => sum + value, 0)
  return `+${primaryPoints} ${primary}${ripplePoints ? ` · +${ripplePoints} cross-domain ripple` : ''}`
}

function labelPractice(item, priority, why) {
  if (!item) return null
  const highLeverage = isHighLeveragePractice(item)
  const scoreImpact = getScoreImpact(item, priority)
  const scoreTotal = Object.values(scoreImpact).reduce((sum, value) => sum + value, 0)
  return {
    ...item,
    priority,
    why,
    highLeverage,
    leverageLabel: getLeverageLabel(item),
    scoreImpact,
    scoreTotal,
    identityFeedback: getIdentityFeedback(item),
    analyticFeedback: getAnalyticFeedback(item, scoreImpact),
  }
}

function rotationIndex(date = new Date(), length = 1) {
  if (!length) return 0
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const dayOfYear = Math.floor(diff / 86400000)
  return Math.abs(dayOfYear) % length
}

function firstAvailablePick(candidates = [], used = new Set()) {
  const item = smartPick(candidates, used)
  return pickToTuple(item)
}

function buildFrozenPhaseItems(phase, planSnapshot, dayUsed = new Set()) {
  const phaseSnapshot = planSnapshot?.phases?.[phase]
  if (!phaseSnapshot?.items?.length) return null
  const items = phaseSnapshot.items
    .map(saved => labelPractice(findPracticeByKey(saved.key), saved.priority, saved.why))
    .filter(Boolean)
    .filter(item => {
      // Day-level de-duplication: a practice should not appear in multiple phases.
      if (dayUsed.has(item.key)) return false
      dayUsed.add(item.key)
      return true
    })
  return uniqueByKey(items)
}

function buildPhaseItems(phase, domainScores, todayChecks, primedDomainId = null, date = new Date(), planSnapshot = null, checked = {}, dayUsed = new Set(), decision = null) {
  const frozen = buildFrozenPhaseItems(phase, planSnapshot, dayUsed)
  if (frozen) return frozen

  const weak = weakestDomains(domainScores, date)
  const pool = PHASE_POOLS[phase] || []
  const history = getRecentPracticeHistory(checked, date, 7)
  const behaviorStats = getPracticeBehaviorStats(checked, date, 7)
  const items = []
  const used = new Set()
  const combinedUsed = () => new Set([...used, ...dayUsed])

  const push = (pick, priority, why) => {
    const item = pick ? findPractice(...pick) : null
    // Phase-level and day-level de-duplication. The same practice should never
    // be served in Morning, Midday, and Evening on the same date.
    if (!item || used.has(item.key) || dayUsed.has(item.key)) return false
    used.add(item.key)
    dayUsed.add(item.key)
    items.push(labelPractice(item, priority, why))
    return true
  }

  const pushSmart = (candidates, priority, why, slot, preferredDomainId = null) => {
    const item = smartPick(candidates, combinedUsed(), { weak, history, behaviorStats, date, phase, slot, preferredDomainId, decision })
    return push(pickToTuple(item), priority, whyFromDecision(decision, phase, slot, item, why))
  }

  if (phase === 'morning') {
    const targetDomain = decision?.primaryBlockerId || primedDomainId || weak[0] || 'd1'
    const adaptivePool = MORNING_ADAPTIVE_POOLS[targetDomain] || MORNING_ADAPTIVE_POOLS.d1

    // Critical: selected from the current correction domain, with anti-repeat and leverage weighting.
    pushSmart(
      adaptivePool,
      'Critical',
      primedDomainId ? 'Yesterday\'s correction anchor' : 'Adaptive weakest-domain anchor',
      'critical',
      targetDomain
    )

    // Required: still initializes conscious control, but can rotate when Morning Directive was just used.
    const requiredWhy = used.has(findPractice('d4', 'Morning Directive')?.key)
      ? 'Install directed mental imagery'
      : 'Initialize the conscious director'
    pushSmart(REQUIRED_MORNING_POOL, 'Required', requiredWhy, 'required', weak[1] || 'd4')

    // Optional: support the weakest domain or the physical vessel without repeating yesterday's exact pattern.
    const rotated = [
      ...OPTIONAL_MORNING_POOL.slice(rotationIndex(date, OPTIONAL_MORNING_POOL.length)),
      ...OPTIONAL_MORNING_POOL.slice(0, rotationIndex(date, OPTIONAL_MORNING_POOL.length))
    ]
    const optionalItem = smartPick(rotated, combinedUsed(), { weak, history, behaviorStats, date, phase, slot: 'optional', preferredDomainId: weak[2] || targetDomain, decision })
    const optionalPick = pickToTuple(optionalItem)
    const optionalReason = optionalPick?.[1] === 'Visualization Practice'
      ? 'Rehearse the state before the day tests it'
      : optionalPick?.[1] === 'Breathwork'
        ? 'Regulate the vessel before external input'
        : optionalPick?.[1] === 'Observer Drill'
          ? 'Strengthen witness awareness early'
          : optionalPick?.[1] === 'Affirmation Installation'
            ? 'Install the chosen identity signal'
            : optionalPick?.[1] === 'Hydration Protocol'
              ? 'Restore physical signal flow early'
              : 'Stabilize Form early'
    push(optionalPick, 'Optional', optionalReason)
  }

  if (phase === 'midday') {
    const morningPool = buildPhaseItems('morning', domainScores, todayChecks, primedDomainId, date, planSnapshot, checked, new Set(dayUsed), decision)
    const morningDone = morningPool.filter(i => !!todayChecks[i.key]).length
    let primaryCandidates = [['d2', 'Breathwork'], ['d4', 'Thought Audit'], ['d5', 'Pattern Interrupt']]
    let reason = 'Midday nervous-system correction'

    if (morningDone === 0) {
      primaryCandidates = [['d1', '5 Recall Triggers'], ['d1', 'Observer Drill'], ['d2', 'Breathwork']]
      reason = 'Recover the morning signal'
    } else if (weak[0] === 'd5') {
      primaryCandidates = [['d5', 'Pattern Interrupt'], ['d5', 'Trigger Mapping'], ['d4', 'Thought Audit']]
      reason = 'Primary Code correction'
    } else if (weak[0] === 'd3') {
      primaryCandidates = [['d3', 'Name + Locate Emotion'], ['d2', 'Breathwork'], ['d3', '90-Second Rule']]
      reason = 'Field charge correction'
    } else if (weak[0] === 'd4') {
      primaryCandidates = [['d4', 'Thought Audit'], ['d4', 'Visualization Practice'], ['d1', '5 Recall Triggers']]
      reason = 'Mind drift correction'
    } else if (weak[0] === 'd2') {
      primaryCandidates = [['d2', 'Hydration Protocol'], ['d2', 'Breathwork'], ['d2', 'Training / Mobility']]
      reason = 'Form stabilization correction'
    }

    pushSmart(primaryCandidates, 'Critical', reason, 'critical', weak[0])
    pushSmart(PHASE_POOLS.midday, 'Adaptive', 'Interrupt reactive drift', 'adaptive', weak[1] || weak[0])
    pushSmart([['d2', 'Hydration Protocol'], ['d2', 'Breathwork'], ['d1', '5 Recall Triggers']], 'Optional', 'Maintain physical signal', 'optional', 'd2')
  }

  if (phase === 'evening') {
    const undoneWeak = weak.find(domainId => {
      const allKeys = Object.keys(todayChecks).filter(k => todayChecks[k])
      return !allKeys.some(k => k.startsWith(`${domainId}_`))
    }) || weak[0]

    const byDomain = {
      d1: [['d5', 'Pre-Sleep Programming'], ['d1', 'Deathlessness Contemplation'], ['d1', 'Non-Local Body Scan']],
      d2: [['d5', 'Pre-Sleep Programming'], ['d2', 'Sleep 7h+'], ['d2', 'Breathwork']],
      d3: [['d3', 'Emotional Log'], ['d3', 'Forgiveness Protocol'], ['d3', 'Somatic Body Scan']],
      d4: [['d4', 'Thought Audit'], ['d4', 'Belief Audit'], ['d4', 'Visualization Practice']],
      d5: [['d5', 'Pre-Sleep Programming'], ['d5', 'Dream Log'], ['d5', 'Inner Child Check-In']],
    }
    pushSmart(byDomain[undoneWeak] || byDomain.d5, 'Critical', 'Close the day’s weakest open alignment point', 'critical', undoneWeak)
    pushSmart([['d3', 'Gratitude + Reframe'], ['d3', 'Emotional Log'], ['d5', 'Dream Log']], 'Optional', 'Shift the final emotional tone', 'optional', 'd3')
  }

  return uniqueByKey(items).filter(Boolean)
}

export function createTodayPlanSnapshot(plan, date = new Date()) {
  const dateKey = getDateKey(date)
  return {
    version: TODAY_PLAN_VERSION,
    dateKey,
    createdAt: new Date().toISOString(),
    primedDomain: plan?.primedDomain?.id || null,
    weakestDomain: plan?.weakestDomain?.id || null,
    decision: plan?.decision || null,
    phases: Object.fromEntries(
      Object.entries(plan?.phases || {}).map(([phaseId, phase]) => [phaseId, {
        items: (phase.items || []).map(item => ({
          key: item.key,
          priority: item.priority,
          why: item.why,
        }))
      }])
    )
  }
}

function isValidPlanSnapshot(snapshot, date = new Date()) {
  if (!snapshot) return false
  if (snapshot.version !== TODAY_PLAN_VERSION) return false
  if (snapshot.dateKey !== getDateKey(date)) return false
  return !!snapshot?.phases?.morning?.items?.length
}

function buildImpactSummary(allItems, todayChecks = {}) {
  const completedItems = allItems.filter(i => !!todayChecks[i.key])
  const domainImpact = DOMAINS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {})

  completedItems.forEach(item => {
    Object.entries(item.scoreImpact || {}).forEach(([domainId, points]) => {
      domainImpact[domainId] = (domainImpact[domainId] || 0) + points
    })
  })

  const ranked = Object.entries(domainImpact)
    .map(([domainId, points]) => ({ domain: domainById(domainId), points }))
    .sort((a, b) => b.points - a.points)

  const totalImpact = ranked.reduce((sum, d) => sum + d.points, 0)
  const strongestSignal = ranked.find(d => d.points > 0) || ranked[0]
  const neglectedDomain = ranked.slice().reverse().find(d => d.points === 0)?.domain || ranked[ranked.length - 1]?.domain || domainById('d1')

  return {
    completedItems,
    domainImpact,
    ranked,
    totalImpact,
    strongestSignal,
    neglectedDomain,
    feedbackLines: completedItems.slice(-3).map(i => i.identityFeedback),
  }
}

export function getDateKey(date = new Date()) {
  return date.toDateString()
}

export function getPreviousDateKey(date = new Date(), daysBack = 1) {
  const d = new Date(date)
  d.setDate(d.getDate() - daysBack)
  return d.toDateString()
}

function isLockedDay(record) {
  // Today-page streak = visible consistency. A recovered day that is completed counts as a completed alignment.
  // Frequency/Gray-Zone math can still use a stricter clean-streak concept elsewhere.
  return record?.status === 'locked'
}

export function calculateTodayStreak(dayStatus = {}, date = new Date()) {
  const todayKey = getDateKey(date)
  const todayStatus = dayStatus?.[todayKey]?.status
  if (todayStatus === 'missed') return 0

  let streak = isLockedDay(dayStatus?.[todayKey]) ? 1 : 0

  for (let i = 1; i < 365; i++) {
    const key = getPreviousDateKey(date, i)
    if (isLockedDay(dayStatus?.[key])) streak += 1
    else break
  }
  return streak
}

export function calculateLongestStreak(dayStatus = {}) {
  const lockedDates = Object.entries(dayStatus || {})
    .filter(([, record]) => isLockedDay(record))
    .map(([key]) => new Date(key))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b)

  let longest = 0
  let current = 0
  let previous = null
  lockedDates.forEach(date => {
    if (!previous) current = 1
    else {
      const diffDays = Math.round((date - previous) / 86400000)
      current = diffDays === 1 ? current + 1 : 1
    }
    longest = Math.max(longest, current)
    previous = date
  })
  return longest
}



export function transitionDayStatus({ previous = {}, date = new Date(), completionState = {}, impactSummary = {}, tomorrowPrime = null, cutoffHour = 20 } = {}) {
  const dateKey = getDateKey(date)
  const current = previous?.[dateKey] || null

  // State authority rule: once a day is missed, UI-derived completion cannot auto-convert it back to locked.
  // Recovery must happen through an explicit future flow, not through checkbox recalculation.
  if (current?.status === 'missed') return previous

  const completeRequired = completionState?.completeRequired || 0
  const minimumMet = completeRequired >= DAILY_MINIMUM
  const afterCutoff = date.getHours() >= cutoffHour

  if (minimumMet) {
    const signal = impactSummary?.totalImpact || 0
    const strongestDomain = impactSummary?.strongestSignal?.domain?.id || null
    const correctionDomain = impactSummary?.neglectedDomain?.id || tomorrowPrime?.domain?.id || null

    if (current?.status === 'locked'
      && current?.signal === signal
      && current?.completedRequired === completeRequired
      && current?.correctionDomain === correctionDomain
      && current?.strongestDomain === strongestDomain) {
      return previous
    }

    return {
      ...previous,
      [dateKey]: {
        ...(current || {}),
        status: 'locked',
        lockedAt: current?.lockedAt || new Date().toISOString(),
        signal,
        strongestDomain,
        correctionDomain,
        completedRequired: completeRequired,
      }
    }
  }

  // If the user explicitly reopens a missed day after cutoff, keep the day active.
  // Otherwise the cutoff rule would instantly convert it back to missed before they can recover.
  if (afterCutoff && current?.status === 'active' && current?.reopenedAt) {
    return previous
  }

  if (afterCutoff) {
    return {
      ...previous,
      [dateKey]: {
        ...(current || {}),
        status: 'missed',
        missedAt: current?.missedAt || new Date().toISOString(),
        missing: Math.max(0, DAILY_MINIMUM - completeRequired),
        correctionDomain: tomorrowPrime?.domain?.id || current?.correctionDomain || null,
        completedRequired: completeRequired,
      }
    }
  }

  // Before cutoff, keep the day open. Preserve locked/missed above; otherwise do not persist noisy open-state recalculations.
  return previous
}

export function generateTomorrowPrime(domainId) {
  const domain = domainById(domainId || 'd1')
  return {
    domain,
    practiceName: TOMORROW_ENTRY_LABELS[domain.id] || 'Stillness Exposure',
    reason: `${domain.name} is the next correction point. Begin there before adding anything else.`,
  }
}

export function generateTodayPlan({ domainScores = {}, checked = {}, dayStatus = {}, date = new Date(), phaseLocking = true, planSnapshot = null, onboardingProfile = null } = {}) {
  const dateKey = getDateKey(date)
  const previousDateKey = getPreviousDateKey(date, 1)
  const todayChecks = checked?.[dateKey] || {}
  const previousStatus = dayStatus?.[previousDateKey] || null
  const primedDomainId = previousStatus?.correctionDomain || null
  const decision = buildAlignmentDecision({ domainScores, checked, dayStatus, date, primedDomainId, onboardingProfile })
  const currentPhase = getCurrentPhase(date)
  const phases = {}

  const dayUsed = new Set()

  PHASES.forEach(p => {
    const items = buildPhaseItems(p.id, domainScores, todayChecks, primedDomainId, date, isValidPlanSnapshot(planSnapshot, date) ? planSnapshot : null, checked, dayUsed, decision)
    const completion = completionFor(items, todayChecks)
    phases[p.id] = {
      ...p,
      items: items.map(item => ({ ...item, isDone: !!todayChecks[item.key] })),
      completion,
      locked: false,
      lockReason: '',
    }
  })

  if (phaseLocking) {
    phases.midday.locked = phases.morning.completion.completeRequired < 1
    phases.midday.lockReason = 'Complete at least 1 Morning action to unlock Midday correction.'
    phases.evening.locked = phases.midday.completion.completeRequired < 1
    phases.evening.lockReason = 'Complete at least 1 Midday action to unlock Evening integration.'
  }

  const allItems = Object.values(phases).flatMap(p => p.items)
  const requiredItems = allItems.filter(i => i.priority === 'Critical' || i.priority === 'Required')
  const completeRequired = requiredItems.filter(i => !!todayChecks[i.key]).length
  const totalComplete = allItems.filter(i => !!todayChecks[i.key]).length
  const weak = weakestDomains(domainScores, date)[0]
  const impactSummary = buildImpactSummary(allItems, todayChecks)
  const currentStreak = calculateTodayStreak(dayStatus, date)
  const longestStreak = calculateLongestStreak(dayStatus)
  const hour = date.getHours()
  const existingStatus = dayStatus?.[dateKey]?.status || null
  const existingMissed = existingStatus === 'missed'
  const failureActive = existingMissed || (completeRequired < DAILY_MINIMUM && hour >= 20)
  const effectiveDailyMinimumMet = !existingMissed && completeRequired >= DAILY_MINIMUM
  const correctionDomain = impactSummary.neglectedDomain || domainById(weak)
  const tomorrowPrime = generateTomorrowPrime(correctionDomain?.id || weak)

  return {
    dailyMinimum: DAILY_MINIMUM,
    currentPhase,
    decision,
    weakestDomain: domainById(weak),
    previousStatus,
    primedDomain: primedDomainId ? domainById(primedDomainId) : null,
    tomorrowPrime,
    phases,
    impactSummary,
    completionState: {
      completeRequired,
      totalRequired: requiredItems.length,
      totalComplete,
      dailyMinimumMet: effectiveDailyMinimumMet,
      rawDailyMinimumMet: completeRequired >= DAILY_MINIMUM,
      pct: existingMissed ? 0 : Math.min(100, Math.round((completeRequired / DAILY_MINIMUM) * 100)),
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
      record: dayStatus?.[dateKey] || null,
    },
    failureState: {
      active: failureActive,
      status: existingMissed ? 'missed' : failureActive ? 'at_risk' : 'open',
      missing: Math.max(0, DAILY_MINIMUM - completeRequired),
      message: failureActive
        ? 'Today’s alignment is incomplete. Finish the minimum before the day closes or tomorrow begins from drift.'
        : '',
    },
  }
}