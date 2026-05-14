/**
 * patternLearningModel.js
 *
 * Adaptive Intelligence Layer v1
 *
 * The todayEngine already has real-time behavior adaptation (skip penalties,
 * repeat penalties, domain momentum). This layer adds LONGITUDINAL learning —
 * patterns that accumulate across days and weeks and feed back into the engine
 * as durable adjustments, not just today's ephemeral scoring.
 *
 * Architecture:
 *   analyzePatterns()        — reads all available data, returns a PatternProfile
 *   getAdaptiveWeights()     — converts PatternProfile into score adjustments for todayEngine
 *   getWeeklyIntelligence()  — generates the Sunday narrative report
 *   detectPatternBreak()     — surfaces "you broke a loop" moments
 *   savePatternProfile()     — persists the profile to localStorage
 *   loadPatternProfile()     — loads the persisted profile
 */

import { DOMAINS, PRACTICES } from '../../data'
import { getDateKey, getPreviousDateKey } from '../today/todayEngine'

// ─── Storage helpers ─────────────────────────────────────────────────────────

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBSERVATION_WINDOW_DAYS = 21   // how far back we look
const MIN_ASSIGNMENTS_FOR_SIGNAL = 3  // minimum assignments before we trust a rate
const SKIP_THRESHOLD = 0.65           // completion rate below this = avoidance pattern
const MOMENTUM_THRESHOLD = 0.75       // completion rate above this = momentum signal
const PAIR_WINDOW_DAYS = 14           // window for co-completion pair analysis

// Practice friction buckets (mirrors todayEngine.getPracticeFriction)
const HIGH_FRICTION_PATTERNS = /Theta|Shadow|Deep Work|Training|Mobility|Cold Exposure|Forgiveness|Deathlessness|Identity Decompression/
const MED_FRICTION_PATTERNS  = /Stillness|Visualization|Somatic|Belief Audit|Trigger Mapping|Emotional Log|Observer/

function getPracticeFriction(name = '') {
  if (HIGH_FRICTION_PATTERNS.test(name)) return 3
  if (MED_FRICTION_PATTERNS.test(name)) return 2
  return 1
}

// ─── Data reading helpers ─────────────────────────────────────────────────────

function getPracticeKey(domainId, index) { return `${domainId}_${index}` }

function allPracticeKeys() {
  const keys = []
  Object.entries(PRACTICES || {}).forEach(([domainId, list]) => {
    ;(list || []).forEach((_, i) => keys.push(getPracticeKey(domainId, i)))
  })
  return keys
}

function getPracticeName(key) {
  const [domainId, indexRaw] = key.split('_')
  const practice = (PRACTICES[domainId] || [])[Number(indexRaw)]
  return practice?.name || key
}

function getRecentChecked(checked = {}, date = new Date(), daysBack = OBSERVATION_WINDOW_DAYS) {
  const days = []
  for (let i = 0; i < daysBack; i++) {
    const key = getPreviousDateKey(date, i)
    days.push({ dateKey: key, checks: checked[key] || {} })
  }
  return days
}

function getAssignedKeys(date = new Date(), daysBack = OBSERVATION_WINDOW_DAYS) {
  const plans = safeRead('q_today_plan', {})
  const result = {}
  for (let i = 0; i < daysBack; i++) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    if (!plan?.phases) continue
    const keys = []
    Object.values(plan.phases).forEach(phase => {
      ;(phase?.items || []).forEach(item => { if (item?.key) keys.push(item.key) })
    })
    result[key] = keys
  }
  return result
}

function getFeedbackSentiment(date = new Date(), daysBack = OBSERVATION_WINDOW_DAYS) {
  const feedback = safeRead('q_beta_feedback', {})
  const entries = []
  for (let i = 0; i < daysBack; i++) {
    const key = getPreviousDateKey(date, i)
    if (feedback[key]) entries.push({ dateKey: key, ...feedback[key] })
  }
  return entries
}

// ─── Core analysis ───────────────────────────────────────────────────────────

/**
 * Compute per-practice completion rates over the observation window.
 * Returns a map: practiceKey → { assigned, completed, rate, skipped, name, friction, domainId }
 */
function computePracticeCompletionRates(checked, date) {
  const days = getRecentChecked(checked, date)
  const assigned = getAssignedKeys(date)

  const stats = {}

  days.forEach(({ dateKey, checks }) => {
    const assignedToday = assigned[dateKey] || []
    assignedToday.forEach(key => {
      if (!stats[key]) {
        const [domainId] = key.split('_')
        stats[key] = {
          key,
          name: getPracticeName(key),
          domainId,
          friction: getPracticeFriction(getPracticeName(key)),
          assigned: 0,
          completed: 0,
          skipped: 0,
          rate: null,
          lastCompleted: null,
          lastSkipped: null,
        }
      }
      stats[key].assigned++
      if (checks[key]) {
        stats[key].completed++
        stats[key].lastCompleted = dateKey
      } else {
        stats[key].skipped++
        stats[key].lastSkipped = dateKey
      }
    })

    // Also count library completions (not assigned but done)
    Object.entries(checks).forEach(([key, done]) => {
      if (!done) return
      if (assignedToday.includes(key)) return // already counted
      if (!stats[key]) {
        const [domainId] = key.split('_')
        stats[key] = {
          key, name: getPracticeName(key), domainId,
          friction: getPracticeFriction(getPracticeName(key)),
          assigned: 0, completed: 0, skipped: 0, rate: null,
          lastCompleted: null, lastSkipped: null,
        }
      }
      stats[key].completed++
      stats[key].lastCompleted = dateKey
    })
  })

  // Compute rate only when we have enough signal
  Object.values(stats).forEach(s => {
    s.rate = s.assigned >= MIN_ASSIGNMENTS_FOR_SIGNAL
      ? s.completed / s.assigned
      : null
  })

  return stats
}

/**
 * Find practices the user consistently avoids.
 * Avoidance = assigned >= threshold AND completion rate < SKIP_THRESHOLD
 */
function detectAvoidancePatterns(practiceStats) {
  return Object.values(practiceStats)
    .filter(s => s.rate !== null && s.rate < SKIP_THRESHOLD && s.assigned >= MIN_ASSIGNMENTS_FOR_SIGNAL)
    .sort((a, b) => a.rate - b.rate)
    .map(s => ({
      key: s.key,
      name: s.name,
      domainId: s.domainId,
      friction: s.friction,
      rate: s.rate,
      skipped: s.skipped,
      assigned: s.assigned,
      severity: s.rate < 0.25 ? 'strong' : s.rate < 0.45 ? 'moderate' : 'mild',
    }))
}

/**
 * Find practices the user reliably completes.
 * Momentum = assigned >= threshold AND rate >= MOMENTUM_THRESHOLD
 */
function detectMomentumPatterns(practiceStats) {
  return Object.values(practiceStats)
    .filter(s => s.rate !== null && s.rate >= MOMENTUM_THRESHOLD && s.assigned >= MIN_ASSIGNMENTS_FOR_SIGNAL)
    .sort((a, b) => b.rate - a.rate)
    .map(s => ({
      key: s.key,
      name: s.name,
      domainId: s.domainId,
      friction: s.friction,
      rate: s.rate,
      completed: s.completed,
    }))
}

/**
 * Find co-completion pairs — practices that tend to get done together.
 * When practice A is done, what is the probability practice B is also done that day?
 */
function detectCompletionPairs(checked, date) {
  const days = getRecentChecked(checked, date, PAIR_WINDOW_DAYS)
  const pairCounts = {}
  const singleCounts = {}

  days.forEach(({ checks }) => {
    const doneKeys = Object.keys(checks).filter(k => checks[k])
    doneKeys.forEach(a => {
      singleCounts[a] = (singleCounts[a] || 0) + 1
      doneKeys.forEach(b => {
        if (a === b) return
        const pairKey = [a, b].sort().join('::')
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1
      })
    })
  })

  const pairs = []
  Object.entries(pairCounts).forEach(([pairKey, count]) => {
    if (count < 3) return // need at least 3 co-completions for signal
    const [a, b] = pairKey.split('::')
    const minSingle = Math.min(singleCounts[a] || 1, singleCounts[b] || 1)
    const coRate = count / minSingle
    if (coRate >= 0.6) {
      pairs.push({
        keys: [a, b],
        names: [getPracticeName(a), getPracticeName(b)],
        coRate,
        coCount: count,
        label: `${getPracticeName(a)} + ${getPracticeName(b)} = ${Math.round(coRate * 100)}% co-completion`,
      })
    }
  })

  return pairs.sort((a, b) => b.coRate - a.coRate).slice(0, 5)
}

/**
 * Determine best-performing time windows.
 * Returns which phases have highest completion rates.
 */
function detectPhasePerformance(checked, date) {
  const plans = safeRead('q_today_plan', {})
  const phaseTotals = { morning: { assigned: 0, completed: 0 }, midday: { assigned: 0, completed: 0 }, evening: { assigned: 0, completed: 0 } }

  for (let i = 1; i < OBSERVATION_WINDOW_DAYS; i++) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    const checks = checked?.[key] || {}
    if (!plan?.phases) continue

    Object.entries(plan.phases).forEach(([phaseId, phase]) => {
      if (!phaseTotals[phaseId]) return
      ;(phase?.items || []).forEach(item => {
        if (!item?.key) return
        phaseTotals[phaseId].assigned++
        if (checks[item.key]) phaseTotals[phaseId].completed++
      })
    })
  }

  return Object.entries(phaseTotals).map(([phase, { assigned, completed }]) => ({
    phase,
    assigned,
    completed,
    rate: assigned >= 3 ? completed / assigned : null,
    label: phase.charAt(0).toUpperCase() + phase.slice(1),
  })).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
}

/**
 * Analyze feedback sentiment to understand what users find too hard/confusing.
 */
function analyzeFeedbackSentiment(date) {
  const entries = getFeedbackSentiment(date)
  const counts = { very_accurate: 0, somewhat_accurate: 0, not_accurate: 0 }
  const phases = {}
  const strategies = {}

  entries.forEach(e => {
    if (e.accuracy) counts[e.accuracy] = (counts[e.accuracy] || 0) + 1
    if (e.phase) phases[e.phase] = (phases[e.phase] || 0) + (e.accuracy === 'not_accurate' ? 1 : 0)
    if (e.strategy) strategies[e.strategy] = (strategies[e.strategy] || 0) + (e.accuracy === 'not_accurate' ? 1 : 0)
  })

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const accuracyRate = total > 0 ? (counts.very_accurate + counts.somewhat_accurate * 0.5) / total : null

  // Which phase generates the most "not accurate" feedback?
  const problematicPhase = Object.entries(phases).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const problematicStrategy = Object.entries(strategies).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return {
    total,
    counts,
    accuracyRate,
    problematicPhase,
    problematicStrategy,
    signal: total >= 3 ? (accuracyRate >= 0.7 ? 'positive' : accuracyRate >= 0.4 ? 'mixed' : 'negative') : 'insufficient',
  }
}

/**
 * Detect domain-level consistency trends over the last 7 vs 14 days.
 */
function computeDomainTrends(checked, date) {
  const recent7  = getRecentChecked(checked, date, 7)
  const recent14 = getRecentChecked(checked, date, 14)

  const domainScores7  = {}
  const domainScores14 = {}

  const countByDomain = (days, target) => {
    days.forEach(({ checks }) => {
      Object.entries(checks).forEach(([key, done]) => {
        if (!done) return
        const [domainId] = key.split('_')
        if (!DOMAINS.find(d => d.id === domainId)) return
        target[domainId] = (target[domainId] || 0) + 1
      })
    })
  }

  countByDomain(recent7,  domainScores7)
  countByDomain(recent14, domainScores14)

  return DOMAINS.map(d => {
    const score7  = domainScores7[d.id]  || 0
    const score14 = (domainScores14[d.id] || 0) / 2 // normalize to weekly rate
    const trend = score7 > score14 * 1.2 ? 'rising'
      : score7 < score14 * 0.8 ? 'falling'
      : 'stable'
    return { id: d.id, name: d.name, color: d.color, score7, score14Normalized: score14, trend }
  })
}

// ─── Pattern break detection ──────────────────────────────────────────────────

/**
 * Detect when a user has broken a recurring negative pattern.
 * E.g.: 3+ days of a drift pattern followed by 2+ days of improvement.
 */
export function detectPatternBreak(checked, dayStatus, date = new Date()) {
  const breaks = []

  // Check streak recovery: missed days followed by locked days
  const recentStatuses = []
  for (let i = 0; i < 10; i++) {
    const key = getPreviousDateKey(date, i)
    recentStatuses.push({ dateKey: key, status: dayStatus?.[key]?.status || 'open' })
  }

  // Find: at least 2 consecutive locked days preceded by at least 1 missed day
  let lockedStreak = 0
  let missedBefore = false
  for (let i = 0; i < recentStatuses.length; i++) {
    if (recentStatuses[i].status === 'locked') {
      lockedStreak++
    } else {
      if (lockedStreak >= 2 && missedBefore) {
        breaks.push({
          type: 'streak_recovery',
          label: 'Alignment restored',
          message: `${lockedStreak} consecutive aligned days after a disruption. The pattern interrupted itself.`,
          strength: lockedStreak >= 4 ? 'strong' : 'moderate',
        })
      }
      if (recentStatuses[i].status === 'missed') missedBefore = true
      lockedStreak = 0
    }
  }

  // Check domain recovery: a previously skipped domain now getting attention
  const practiceStats = computePracticeCompletionRates(checked, date)
  const avoidance = detectAvoidancePatterns(practiceStats)

  // Look at last 3 days for any previously avoided practice being completed
  const last3Days = getRecentChecked(checked, date, 3)
  avoidance.forEach(av => {
    const recentlyCompleted = last3Days.some(({ checks }) => !!checks[av.key])
    if (recentlyCompleted && av.severity !== 'mild') {
      breaks.push({
        type: 'avoidance_break',
        label: 'Resistance overcome',
        message: `${av.name} — a practice you had been avoiding — was completed. A pattern interrupted.`,
        strength: av.severity === 'strong' ? 'strong' : 'moderate',
        practiceKey: av.key,
      })
    }
  })

  return breaks
}

// ─── Main analysis entry point ─────────────────────────────────────────────────

/**
 * Full pattern analysis. Returns a PatternProfile.
 * This is the source of truth for all adaptive adjustments.
 */
export function analyzePatterns(checked = {}, dayStatus = {}, date = new Date()) {
  const practiceStats  = computePracticeCompletionRates(checked, date)
  const avoidance      = detectAvoidancePatterns(practiceStats)
  const momentum       = detectMomentumPatterns(practiceStats)
  const pairs          = detectCompletionPairs(checked, date)
  const phasePerf      = detectPhasePerformance(checked, date)
  const domainTrends   = computeDomainTrends(checked, date)
  const feedback       = analyzeFeedbackSentiment(date)
  const patternBreaks  = detectPatternBreak(checked, dayStatus, date)

  // Best and worst phase
  const bestPhase  = phasePerf.find(p => p.rate !== null) || null
  const worstPhase = phasePerf.slice().reverse().find(p => p.rate !== null) || null

  // Avoidance penalty map: practiceKey → score penalty
  const avoidancePenalties = {}
  avoidance.forEach(av => {
    avoidancePenalties[av.key] = av.severity === 'strong' ? -20
      : av.severity === 'moderate' ? -12 : -6
  })

  // Momentum boost map: practiceKey → score bonus
  const momentumBoosts = {}
  momentum.forEach(m => {
    // Only boost if not over-serving (rate < 0.95 to allow rotation)
    if (m.rate < 0.95) momentumBoosts[m.key] = m.friction === 1 ? 8 : 5
  })

  // Co-completion bonuses: if one practice in a high-value pair is already done today,
  // boost the other. This gets applied at plan generation time.
  const pairBoosts = {}
  pairs.forEach(pair => {
    const [a, b] = pair.keys
    pairBoosts[a] = (pairBoosts[a] || []).concat([{ partner: b, coRate: pair.coRate }])
    pairBoosts[b] = (pairBoosts[b] || []).concat([{ partner: a, coRate: pair.coRate }])
  })

  // Phase bias: if midday is consistently weak, suggest morning alternatives
  const phaseCompensation = {}
  if (worstPhase?.phase && worstPhase.rate !== null && worstPhase.rate < 0.35) {
    phaseCompensation[worstPhase.phase] = 'reduce_load'
  }

  const profile = {
    generatedAt: new Date().toISOString(),
    observationDays: OBSERVATION_WINDOW_DAYS,
    hasEnoughData: Object.values(practiceStats).some(s => s.assigned >= MIN_ASSIGNMENTS_FOR_SIGNAL),
    avoidance,
    momentum,
    pairs,
    phasePerformance: phasePerf,
    domainTrends,
    feedback,
    patternBreaks,
    weights: {
      avoidancePenalties,
      momentumBoosts,
      pairBoosts,
      phaseCompensation,
    },
    summary: {
      bestPhase: bestPhase?.phase || null,
      worstPhase: worstPhase?.phase || null,
      topMomentumPractice: momentum[0]?.name || null,
      topAvoidedPractice: avoidance[0]?.name || null,
      feedbackSignal: feedback.signal,
      patternBreakCount: patternBreaks.length,
    },
  }

  savePatternProfile(profile)
  return profile
}

// ─── Adaptive weights for todayEngine ────────────────────────────────────────

/**
 * Given a practice item and today's checked state, return the adaptive score
 * adjustment from pattern learning. This is called inside scoreCandidate.
 *
 * Positive = boost. Negative = suppress.
 */
export function getAdaptiveScoreAdjustment(item, todayChecked = {}, patternProfile = null) {
  if (!patternProfile || !item) return 0

  const { weights } = patternProfile
  if (!weights) return 0

  let adjustment = 0
  const key = item.key

  // Avoidance penalty — suppress practices the user consistently skips
  if (weights.avoidancePenalties?.[key]) {
    adjustment += weights.avoidancePenalties[key]
  }

  // Momentum boost — favor practices the user reliably completes
  if (weights.momentumBoosts?.[key]) {
    adjustment += weights.momentumBoosts[key]
  }

  // Co-completion boost — if partner practice already done today, boost this one
  const partners = weights.pairBoosts?.[key] || []
  partners.forEach(({ partner, coRate }) => {
    if (todayChecked[partner]) {
      adjustment += Math.round(coRate * 8) // up to +8 for 100% co-completion rate
    }
  })

  return adjustment
}

// ─── Weekly Intelligence Report ───────────────────────────────────────────────

/**
 * Generate a weekly narrative intelligence report.
 * Called on Sundays or on demand.
 */
export function getWeeklyIntelligence(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  const profile = analyzePatterns(checked, dayStatus, date)
  const { avoidance, momentum, phasePerformance, domainTrends, feedback, pairs } = profile

  // How many days locked this week
  let weekLocked = 0
  let weekMissed = 0
  for (let i = 0; i < 7; i++) {
    const key = getPreviousDateKey(date, i)
    const status = dayStatus?.[key]?.status
    if (status === 'locked') weekLocked++
    else if (status === 'missed') weekMissed++
  }

  // Most improved domain (biggest positive trend)
  const mostImproved = domainTrends
    .filter(d => d.trend === 'rising' && d.id !== 'd1')
    .sort((a, b) => (b.score7 - b.score14Normalized) - (a.score7 - a.score14Normalized))[0] || null

  // Highest resistance domain
  const highestResistance = domainTrends
    .filter(d => d.trend === 'falling' && d.id !== 'd1')
    .sort((a, b) => (a.score7 - a.score14Normalized) - (b.score7 - b.score14Normalized))[0] || null

  // Most effective practice (highest momentum)
  const mostEffective = momentum[0] || null

  // Biggest friction point
  const biggestFriction = avoidance[0] || null

  // Best phase
  const bestPhase = phasePerformance.find(p => p.rate !== null)

  // Build narrative sections
  const weekSummary = weekLocked >= 6 ? 'Strong alignment week. The system held.'
    : weekLocked >= 4 ? 'Solid alignment week with some gaps.'
    : weekLocked >= 2 ? 'Inconsistent week. The pattern is still forming.'
    : 'Difficult week. Recovery is the priority.'

  const sections = []

  sections.push({
    label: 'Week summary',
    value: weekSummary,
    detail: `${weekLocked}/7 days aligned${weekMissed > 0 ? `, ${weekMissed} missed` : ''}.`,
  })

  if (mostImproved) {
    sections.push({
      label: 'Most improved',
      value: mostImproved.name,
      detail: `${mostImproved.name} practices increased this week — rising trajectory detected.`,
    })
  }

  if (highestResistance) {
    sections.push({
      label: 'Highest resistance',
      value: highestResistance.name,
      detail: `${highestResistance.name} is declining. Attention needed before drift compounds.`,
    })
  }

  if (mostEffective) {
    sections.push({
      label: 'Most effective practice',
      value: mostEffective.name,
      detail: `${Math.round(mostEffective.rate * 100)}% completion rate — your most reliable signal builder.`,
    })
  }

  if (biggestFriction) {
    sections.push({
      label: 'Largest friction point',
      value: biggestFriction.name,
      detail: `${Math.round((1 - biggestFriction.rate) * 100)}% skip rate. The engine will reduce its frequency and offer lower-friction alternatives.`,
    })
  }

  if (bestPhase) {
    sections.push({
      label: 'Best performing window',
      value: bestPhase.label,
      detail: `${Math.round((bestPhase.rate || 0) * 100)}% completion rate in your ${bestPhase.label} practices.`,
    })
  }

  if (pairs[0]) {
    sections.push({
      label: 'Strongest practice pair',
      value: pairs[0].names.join(' + '),
      detail: `These two practices are completed together ${Math.round(pairs[0].coRate * 100)}% of the time. High-value combination.`,
    })
  }

  // Recommendation
  const recommendation = biggestFriction && highestResistance
    ? `Reduce friction in ${highestResistance.name}. Consider starting with ${biggestFriction.friction === 1 ? 'a simpler alternative' : 'a lower-friction version'} this week.`
    : highestResistance
      ? `Prioritize ${highestResistance.name} recovery next week. Begin with 1 practice per day before expanding.`
      : mostEffective
        ? `Continue building on ${mostEffective.name} momentum. The system is responding to consistency.`
        : 'Establish baseline consistency before increasing practice complexity.'

  return {
    weekLocked,
    weekMissed,
    weekSummary,
    sections,
    recommendation,
    profile,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export function savePatternProfile(profile) {
  safeWrite('q_pattern_profile', profile)
}

export function loadPatternProfile() {
  return safeRead('q_pattern_profile', null)
}

/**
 * Returns a cached profile if it was generated today, otherwise regenerates.
 * Use this inside components to avoid recomputing on every render.
 */
export function getOrComputeProfile(checked = {}, dayStatus = {}, date = new Date()) {
  const cached = loadPatternProfile()
  const todayKey = getDateKey(date)
  if (cached?.generatedAt && new Date(cached.generatedAt).toDateString() === date.toDateString()) {
    return cached
  }
  return analyzePatterns(checked, dayStatus, date)
}
