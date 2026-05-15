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
import { getDateKey, getPreviousDateKey } from '../../shared/dateUtils'

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

/**
 * Invalidate the cached profile so the next getOrComputeProfile call
 * forces a full recompute. Call this whenever checked state changes
 * (i.e. on every practice check/uncheck).
 */
export function invalidatePatternProfile() {
  try {
    const cached = localStorage.getItem('q_pattern_profile')
    if (!cached) return
    const profile = JSON.parse(cached)
    // Mark as stale by clearing generatedAt — getOrComputeProfile will recompute
    profile.generatedAt = null
    localStorage.setItem('q_pattern_profile', JSON.stringify(profile))
  } catch {}
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

// ─── Tomorrow Prediction Layer ────────────────────────────────────────────────

const DOMAIN_NAMES_PLM = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }

/**
 * Predict tomorrow's likely state based on:
 * - today's completion
 * - current streak
 * - avoidance patterns
 * - domain trends
 * - feedback sentiment
 *
 * Returns a TomorrowPrediction object for display.
 */
export function predictTomorrow(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  const profile = getOrComputeProfile(checked, dayStatus, date)
  const { avoidance, momentum, phasePerformance, domainTrends, feedback } = profile

  const today = date.toDateString()
  const todayChecks = checked[today] || {}
  const todayDone  = Object.values(todayChecks).filter(Boolean).length
  const todayStatus = dayStatus[today]?.status || 'open'

  // Streak and continuity
  let currentStreak = 0
  for (let i = 0; i < 30; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus[key]?.status === 'locked') currentStreak++
    else break
  }

  // Likely drift body tomorrow — highest-risk movable body
  const risingDomains = domainTrends.filter(d => d.id !== 'd1' && d.trend === 'falling')
    .sort((a, b) => (a.score7 - a.score14Normalized) - (b.score7 - b.score14Normalized))
  const likelyDrift = risingDomains[0] || domainTrends.find(d => d.id !== 'd1') || null

  // Most avoided body — highest friction risk tomorrow
  const topAvoidance = avoidance.filter(a => a.severity !== 'mild')[0] || null

  // Highest leverage move for tomorrow
  const bestPhase = phasePerformance.find(p => p.rate !== null)
  const topMomentum = momentum[0] || null
  const highestLeverageMove = topMomentum
    ? `Begin with ${topMomentum.name} — your most reliable practice.`
    : bestPhase
      ? `Prioritize ${bestPhase.label} practices — your strongest completion window.`
      : 'Begin with a Source anchor practice before anything else.'

  // Risk factors
  const risks = []

  if (todayStatus !== 'locked' && todayDone < 2) {
    risks.push({
      label: 'Low completion today',
      desc: 'Completing fewer than 2 practices today increases tomorrow\'s coherence drag.',
      severity: 'high',
    })
  }

  if (topAvoidance && topAvoidance.severity === 'strong') {
    risks.push({
      label: `${DOMAIN_NAMES_PLM[topAvoidance.domainId] || 'Domain'} avoidance pattern`,
      desc: `${topAvoidance.name} has been consistently skipped. This will compound if not addressed.`,
      severity: 'moderate',
    })
  }

  const worstPhase = phasePerformance.slice().reverse().find(p => p.rate !== null && p.rate < 0.35)
  if (worstPhase) {
    risks.push({
      label: `${worstPhase.label} window consistently weak`,
      desc: `${worstPhase.label} has a ${Math.round(worstPhase.rate * 100)}% completion rate. Consider reducing load in that window.`,
      severity: 'moderate',
    })
  }

  // Opportunity signals
  const opportunities = []

  if (currentStreak >= 2) {
    opportunities.push({
      label: `${currentStreak}-day streak`,
      desc: `Continuing tomorrow locks in a ${currentStreak + 1}-day alignment. Momentum compounds after day 3.`,
    })
  }

  if (topMomentum) {
    opportunities.push({
      label: `${topMomentum.name} momentum`,
      desc: `${Math.round(topMomentum.rate * 100)}% completion rate. This practice is building real signal.`,
    })
  }

  if (domainTrends.some(d => d.id !== 'd1' && d.trend === 'rising')) {
    const rising = domainTrends.find(d => d.id !== 'd1' && d.trend === 'rising')
    opportunities.push({
      label: `${rising.name} rising`,
      desc: `${rising.name} practices are trending up. Continue building momentum here.`,
    })
  }

  // Predicted coherence direction
  const predictedDirection = todayStatus === 'locked'
    ? (currentStreak >= 3 ? 'stable_or_rising' : 'stable')
    : (todayDone >= 2 ? 'stable' : 'likely_declining')

  const directionLabel = {
    stable_or_rising: 'Stable or rising — momentum is compounding.',
    stable:           'Stable — system is holding, not yet compounding.',
    likely_declining: 'At risk — incomplete today creates drag tomorrow.',
  }[predictedDirection]

  return {
    generatedAt: new Date().toISOString(),
    predictedDirection,
    directionLabel,
    likelyDrift: likelyDrift ? {
      id: likelyDrift.id,
      name: DOMAIN_NAMES_PLM[likelyDrift.id] || likelyDrift.name,
      trend: likelyDrift.trend,
    } : null,
    highestLeverageMove,
    risks: risks.slice(0, 2),
    opportunities: opportunities.slice(0, 2),
    hasSufficientData: profile.hasEnoughData,
  }
}

// ─── Predictive Intelligence Layer ───────────────────────────────────────────
// Three functions added to complete Sprint 4:
//   getTrajectoryForecast()  — per-body stabilization/drift prediction
//   getBehavioralRisks()     — if-A-then-B correlation detection
//   getMomentumState()       — named momentum state with days-to-stabilization

const DOMAIN_LABELS = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
const MOVABLE_IDS   = ['d2', 'd3', 'd4', 'd5']

// ─── Gap 1: Trajectory Forecast ───────────────────────────────────────────────

/**
 * Per-body trajectory forecast with confidence scores.
 * Answers: "If current behavior continues, what happens to each body?"
 *
 * Returns an array of body forecasts, each with:
 *   - status: 'stabilizing' | 'stable' | 'drifting' | 'recovering' | 'at_risk'
 *   - daysToChange: estimated days until status changes (null if unknown)
 *   - confidence: 0–1
 *   - label: human-readable forecast
 *   - soWhat: "so what" interpretation
 */
export function getTrajectoryForecast(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  const profile = getOrComputeProfile(checked, dayStatus, date)
  const { domainTrends, avoidance, momentum, phasePerformance } = profile

  // Compute per-body completion velocity over last 7 days vs 3 days
  // Velocity = rate of change in completion, not just current level
  const plans = (() => {
    try { return JSON.parse(localStorage.getItem('q_today_plan') || '{}') } catch { return {} }
  })()

  const domainVelocity = {}
  MOVABLE_IDS.forEach(id => {
    const recent3 = []
    const recent7 = []
    for (let i = 1; i <= 7; i++) {
      const key = getPreviousDateKey(date, i)
      const checks = checked[key] || {}
      const practices = Object.keys(checks).filter(k => k.startsWith(id + '_') && checks[k]).length
      if (i <= 3) recent3.push(practices)
      recent7.push(practices)
    }
    const avg3 = recent3.reduce((a, b) => a + b, 0) / Math.max(recent3.length, 1)
    const avg7 = recent7.reduce((a, b) => a + b, 0) / Math.max(recent7.length, 1)
    // Positive velocity = improving, negative = declining
    domainVelocity[id] = avg7 > 0 ? (avg3 - avg7) / avg7 : 0
  })

  const forecasts = MOVABLE_IDS.map(id => {
    const trend = domainTrends.find(d => d.id === id)
    const isAvoided = avoidance.some(a => a.domainId === id && a.severity !== 'mild')
    const hasMomentum = momentum.some(m => m.domainId === id)
    const velocity = domainVelocity[id] || 0
    const score7 = trend?.score7 || 0
    const name = DOMAIN_LABELS[id] || id

    // Determine forecast status and days-to-change
    let status, daysToChange, label, soWhat, confidence

    if (trend?.trend === 'rising' && velocity > 0 && !isAvoided) {
      status = 'stabilizing'
      // Higher velocity = faster stabilization
      daysToChange = velocity > 0.3 ? 2 : velocity > 0.1 ? 4 : 6
      confidence = Math.min(0.88, 0.6 + velocity * 0.9)
      label = `${name} stabilizing — ~${daysToChange} days`
      soWhat = `${name} is responding to consistent input. Continue current practices.`

    } else if (trend?.trend === 'stable' && hasMomentum && !isAvoided) {
      status = 'stable'
      daysToChange = null
      confidence = 0.82
      label = `${name} stable`
      soWhat = `${name} is holding. No intervention needed — maintain current frequency.`

    } else if (trend?.trend === 'falling' && velocity < -0.1) {
      status = 'at_risk'
      daysToChange = Math.abs(velocity) > 0.3 ? 2 : 4
      confidence = Math.min(0.90, 0.65 + Math.abs(velocity) * 0.8)
      label = `${name} drift risk elevated`
      soWhat = `${name} is declining with negative momentum. One targeted practice tomorrow significantly reduces drift risk.`

    } else if (trend?.trend === 'falling' || isAvoided) {
      status = 'drifting'
      daysToChange = null
      confidence = isAvoided ? 0.78 : 0.70
      label = `${name} drifting`
      soWhat = `${name} needs direct attention. Avoidance patterns are compounding — lower-friction entry point recommended.`

    } else if (trend?.trend === 'rising' && velocity <= 0) {
      status = 'recovering'
      daysToChange = 3
      confidence = 0.72
      label = `${name} recovering slowly`
      soWhat = `${name} is improving but velocity is low. Consistency over the next 3 days will accelerate recovery.`

    } else {
      status = 'stable'
      daysToChange = null
      confidence = 0.65
      label = `${name} baseline`
      soWhat = `${name} is at baseline. Engagement here creates the largest coherence return right now.`
    }

    return {
      id,
      name,
      status,
      daysToChange,
      label,
      soWhat,
      confidence,
      velocity,
      trend: trend?.trend || 'stable',
      color: { d2: '#1D9E75', d3: '#BA7517', d4: '#378ADD', d5: '#E24B4A' }[id] || '#7F77DD',
    }
  })

  // Overall confidence = average of all body confidences
  const overallConfidence = Math.round(
    (forecasts.reduce((a, b) => a + b.confidence, 0) / forecasts.length) * 100
  )

  return {
    forecasts,
    overallConfidence,
    hasSufficientData: profile.hasEnoughData,
    generatedAt: date.toISOString(),
  }
}

// ─── Gap 2: Behavioral Risk Detection ────────────────────────────────────────

/**
 * If-A-then-B behavioral correlation detection.
 * Answers: "What usually breaks my coherence?"
 *
 * Looks for sequential day patterns:
 *   IF [condition on day N] → [outcome on day N+1] occurs 3+ times
 *   → surface as a behavioral risk pattern
 *
 * Confidence threshold: 0.65 (never surface below this)
 */
export function getBehavioralRisks(checked = {}, dayStatus = {}, date = new Date()) {
  const risks = []
  const DAYS_BACK = 21

  // Build per-day signals
  const daySignals = []
  for (let i = 1; i <= DAYS_BACK; i++) {
    const key = getPreviousDateKey(date, i)
    const prevKey = getPreviousDateKey(date, i + 1)
    const checks = checked[key] || {}
    const prevChecks = checked[prevKey] || {}
    const status = dayStatus[key]?.status || 'open'

    // Domain completion counts
    const domainDone = {}
    MOVABLE_IDS.forEach(id => {
      domainDone[id] = Object.keys(checks).filter(k => k.startsWith(id + '_') && checks[k]).length
    })

    // Phase completion (from plan snapshot)
    const plans = (() => {
      try { return JSON.parse(localStorage.getItem('q_today_plan') || '{}') } catch { return {} }
    })()
    const plan = plans[key]
    const phasesDone = {}
    if (plan?.phases) {
      Object.entries(plan.phases).forEach(([phase, p]) => {
        const items = p?.items || []
        const done = items.filter(item => item?.key && checks[item.key]).length
        phasesDone[phase] = items.length > 0 ? done / items.length : null
      })
    }

    // Total done
    const totalDone = Object.values(checks).filter(Boolean).length

    daySignals.push({
      key,
      domainDone,
      phasesDone,
      totalDone,
      status,
      isLocked: status === 'locked',
    })
  }

  // ── Rule 1: Low Form → poor Evening completion next day ────────────────────
  let lowFormThenPoorEvening = 0
  let lowFormCount = 0
  for (let i = 0; i < daySignals.length - 1; i++) {
    const today = daySignals[i]
    const tomorrow = daySignals[i + 1]
    if (today.domainDone.d2 === 0) {
      lowFormCount++
      if (tomorrow.phasesDone?.evening !== null && (tomorrow.phasesDone?.evening || 0) < 0.5) {
        lowFormThenPoorEvening++
      }
    }
  }
  if (lowFormCount >= 3 && lowFormThenPoorEvening / lowFormCount >= 0.6) {
    const confidence = Math.min(0.90, 0.5 + (lowFormThenPoorEvening / lowFormCount) * 0.6)
    if (confidence >= 0.65) {
      risks.push({
        id: 'form_evening_link',
        severity: 'moderate',
        headline: 'Low Form days predict weak Evening alignment.',
        detail: `On ${lowFormThenPoorEvening} of ${lowFormCount} days with no Form practices, Evening completion dropped below 50% the following day.`,
        soWhat: 'Completing even one Form practice changes the trajectory of the day. Form stability is the foundation the evening builds on.',
        confidence,
        rule: 'IF no Form → next-day Evening weak',
      })
    }
  }

  // ── Rule 2: Two missed evenings → next-day drift ──────────────────────────
  let twoMissedEveningsThenDrift = 0
  let twoMissedEveningsCount = 0
  for (let i = 1; i < daySignals.length - 1; i++) {
    const yesterday = daySignals[i]
    const dayBefore  = daySignals[i + 1]
    const tomorrow   = daySignals[i - 1]
    const yEve = yesterday.phasesDone?.evening
    const dbEve = dayBefore.phasesDone?.evening
    if (yEve !== null && yEve < 0.4 && dbEve !== null && dbEve < 0.4) {
      twoMissedEveningsCount++
      if (tomorrow.totalDone < 2) twoMissedEveningsThenDrift++
    }
  }
  if (twoMissedEveningsCount >= 2 && twoMissedEveningsThenDrift / Math.max(twoMissedEveningsCount, 1) >= 0.55) {
    const confidence = Math.min(0.85, 0.55 + (twoMissedEveningsThenDrift / twoMissedEveningsCount) * 0.5)
    if (confidence >= 0.65) {
      risks.push({
        id: 'evening_drift_chain',
        severity: 'high',
        headline: 'Two missed Evening sessions predict next-day drift.',
        detail: `This pattern appeared ${twoMissedEveningsThenDrift} times in your history. Missing Evening integration two days in a row reduces next-day completion significantly.`,
        soWhat: 'Evening is where tomorrow gets primed. Even completing one Evening practice breaks this chain.',
        confidence,
        rule: 'IF evening missed 2x → next-day drift',
      })
    }
  }

  // ── Rule 3: High-friction overload → completion collapse ──────────────────
  const profile = getOrComputeProfile(checked, dayStatus, date)
  const highFrictionAvoided = profile.avoidance?.filter(a => a.friction >= 2 && a.severity !== 'mild') || []
  if (highFrictionAvoided.length >= 2) {
    // Check if days with multiple high-friction assignments have lower completion
    let highFrictionDays = 0
    let highFrictionLowCompletion = 0
    daySignals.forEach(day => {
      const hfDone = highFrictionAvoided.filter(a => {
        const [dId, idx] = a.key.split('_')
        return day.domainDone[dId] > 0
      }).length
      if (hfDone === 0 && day.totalDone < 2) {
        highFrictionDays++
        if (day.totalDone < 2) highFrictionLowCompletion++
      }
    })
    if (highFrictionDays >= 3) {
      risks.push({
        id: 'friction_overload',
        severity: 'moderate',
        headline: 'High-friction practices are reducing overall completion.',
        detail: `${highFrictionAvoided.map(a => a.name).join(', ')} — these practices are being consistently skipped and dragging down daily totals.`,
        soWhat: 'The engine is already deprioritizing these. Replacing them with lower-friction alternatives in the same domain generates comparable signal with higher follow-through.',
        confidence: 0.78,
        rule: 'IF high-friction assigned → completion drops',
      })
    }
  }

  // ── Rule 4: Morning momentum predicts whole-day success ───────────────────
  let morningHighThenSuccess = 0
  let morningHighCount = 0
  daySignals.forEach(day => {
    const mRate = day.phasesDone?.morning
    if (mRate !== null && mRate >= 0.75) {
      morningHighCount++
      if (day.totalDone >= 3) morningHighThenSuccess++
    }
  })
  if (morningHighCount >= 3 && morningHighThenSuccess / morningHighCount >= 0.7) {
    const confidence = Math.min(0.92, 0.6 + (morningHighThenSuccess / morningHighCount) * 0.4)
    if (confidence >= 0.65) {
      risks.push({
        id: 'morning_momentum',
        severity: 'opportunity',
        headline: 'Strong Morning completion predicts whole-day success.',
        detail: `On ${morningHighThenSuccess} of ${morningHighCount} days with high Morning completion, total daily practices were 3 or more.`,
        soWhat: 'Morning is your highest-leverage window. Completing Morning fully creates a cascade effect through Midday and Evening.',
        confidence,
        rule: 'IF morning high → whole-day success',
      })
    }
  }

  return risks
    .filter(r => r.confidence >= 0.65)
    .sort((a, b) => {
      const order = { high: 3, moderate: 2, opportunity: 1 }
      return (order[b.severity] || 0) - (order[a.severity] || 0)
    })
    .slice(0, 4)
}

// ─── Gap 3: Momentum State ────────────────────────────────────────────────────

/**
 * Named momentum state distinct from streak.
 * Streak = consecutive days. Momentum = signal quality and trajectory.
 *
 * States: accelerating | stable | fragile | declining | recovering
 * Includes days-to-stabilization estimate when relevant.
 */
export function getMomentumState(checked = {}, dayStatus = {}, date = new Date()) {
  const profile = getOrComputeProfile(checked, dayStatus, date)
  const { momentum, avoidance, phasePerformance, domainTrends } = profile

  // Compute streak
  let currentStreak = 0
  for (let i = 0; i < 30; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus[key]?.status === 'locked') currentStreak++
    else break
  }

  // Completion velocity over last 7 days (are we getting more done each day?)
  const dailyTotals = []
  for (let i = 1; i <= 7; i++) {
    const key = getPreviousDateKey(date, i)
    const checks = checked[key] || {}
    dailyTotals.push(Object.values(checks).filter(Boolean).length)
  }
  const recent3Avg = dailyTotals.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const older4Avg  = dailyTotals.slice(3).reduce((a, b) => a + b, 0) / 4
  const velocityTrend = older4Avg > 0 ? (recent3Avg - older4Avg) / older4Avg : 0

  // Fragility indicators
  const hasStrongAvoidance  = avoidance.some(a => a.severity === 'strong')
  const worstPhase = phasePerformance.find(p => p.rate !== null && p.rate < 0.3)
  const risingBodies = domainTrends.filter(d => d.id !== 'd1' && d.trend === 'rising').length
  const fallingBodies = domainTrends.filter(d => d.id !== 'd1' && d.trend === 'falling').length

  // Determine momentum state
  let state, label, detail, soWhat, daysToStabilization, color

  if (currentStreak >= 3 && velocityTrend > 0.1 && risingBodies >= 2) {
    state = 'accelerating'
    label = 'Signal accelerating'
    daysToStabilization = Math.max(1, 4 - Math.floor(velocityTrend * 5))
    detail = `${currentStreak}-day streak with increasing completion velocity. ${risingBodies} bodies trending up. You are ${daysToStabilization}–${daysToStabilization + 2} days from stable momentum.`
    soWhat = 'Do not add complexity right now. The system is building itself. Protect the streak.'
    color = '#085041'

  } else if (currentStreak >= 2 && velocityTrend >= -0.1 && !hasStrongAvoidance) {
    state = 'stable'
    label = 'Signal stable'
    daysToStabilization = null
    detail = `${currentStreak}-day streak holding. Completion rate is consistent. No significant drift detected.`
    soWhat = 'The system is holding. Add one degree of depth to one practice this week to begin compounding.'
    color = '#378ADD'

  } else if (currentStreak >= 1 && (worstPhase || hasStrongAvoidance) && velocityTrend >= -0.2) {
    state = 'fragile'
    label = 'Momentum fragile'
    daysToStabilization = 3
    detail = `Streak is active but ${worstPhase ? worstPhase.label + ' window is weak' : 'avoidance patterns are present'}. Momentum exists but has a structural weak point.`
    soWhat = `Protect the streak first. Address the ${worstPhase ? worstPhase.label.toLowerCase() : 'avoidance'} pattern second. Don't try to fix both simultaneously.`
    color = '#BA7517'

  } else if (currentStreak === 0 && velocityTrend < -0.1) {
    state = 'declining'
    label = 'Signal declining'
    daysToStabilization = null
    detail = `No active streak. Completion velocity is dropping. ${fallingBodies > 0 ? fallingBodies + ' bodies trending down.' : ''} Re-entry is the priority.`
    soWhat = 'Lower the bar. Complete 1 practice tomorrow — any practice. Re-entry beats optimization.'
    color = '#E24B4A'

  } else if (currentStreak === 0 && velocityTrend >= -0.1) {
    state = 'recovering'
    label = 'Signal recovering'
    daysToStabilization = 3
    detail = `Streak reset recently but completion is stabilizing. Velocity is neutral to slightly positive. ${daysToStabilization} consistent days will re-enter momentum.`
    soWhat = `${daysToStabilization} more aligned days re-enters active momentum. Focus on minimum completion — not performance.`
    color = '#7F77DD'

  } else {
    state = 'stable'
    label = 'Building baseline'
    daysToStabilization = 5
    detail = 'System is still building enough data for reliable momentum tracking. Continue consistent practice.'
    soWhat = 'Every aligned day adds to the signal quality. The engine learns faster with consistency.'
    color = '#888'
  }

  return {
    state,
    label,
    detail,
    soWhat,
    daysToStabilization,
    color,
    currentStreak,
    velocityTrend,
    risingBodies,
    fallingBodies,
    hasStrongAvoidance,
    hasSufficientData: profile.hasEnoughData,
  }
}
