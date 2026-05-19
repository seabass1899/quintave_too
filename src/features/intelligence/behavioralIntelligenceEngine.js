/**
 * behavioralIntelligenceEngine.js
 * src/features/intelligence/behavioralIntelligenceEngine.js
 *
 * Six precision improvements to Quintave's behavioral engine:
 *
 *  1. Signal Quality      — weights practice completions by user-rated quality
 *  2. Domain Interactions — causal graph: Form→Field→Mind→Code dependency chain
 *  3. Time-of-Day Weight  — routes struggling domains to the user's strongest phase
 *  4. Recovery Arc        — distinguishes sudden drops from gradual fades
 *  5. Feedback Loop       — accuracy ratings reduce domain confidence weights
 *  6. Onboarding Baseline — separates typical vs current state for Day 1 accuracy
 */

import { getPreviousDateKey, getDateKey } from '../../shared/dateUtils'

// ─── Storage helpers ───────────────────────────────────────────────────────────
function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}
function safeWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIGNAL QUALITY
// Practice completions rated 'landed' | 'neutral' | 'forced'
// Stored as: q_practice_ratings = { [dateKey]: { [practiceKey]: 'landed'|'neutral'|'forced' } }
// The pattern model uses quality weights when computing momentum and ROI.
// ─────────────────────────────────────────────────────────────────────────────

export const QUALITY_WEIGHTS = {
  landed:  1.0,   // full signal
  neutral: 0.65,  // partial signal
  forced:  0.25,  // minimal signal — practice happened but didn't land
  unrated: 0.80,  // default when no rating exists
}

export function savePracticeRating(practiceKey, rating, date = new Date()) {
  const dateKey = getDateKey(date)
  const ratings = safeRead('q_practice_ratings', {})
  if (!ratings[dateKey]) ratings[dateKey] = {}
  ratings[dateKey][practiceKey] = rating
  safeWrite('q_practice_ratings', ratings)
}

export function getPracticeRating(practiceKey, dateKey) {
  const ratings = safeRead('q_practice_ratings', {})
  return ratings[dateKey]?.[practiceKey] || 'unrated'
}

export function getQualityWeight(practiceKey, dateKey) {
  return QUALITY_WEIGHTS[getPracticeRating(practiceKey, dateKey)] ?? QUALITY_WEIGHTS.unrated
}

/**
 * Compute quality-weighted completion rate for a practice across recent days.
 * Unlike raw completion rate (done/assigned), this weights each completion
 * by how well it landed — producing a more accurate momentum signal.
 */
export function getQualityWeightedRate(practiceKey, checked = {}, date = new Date(), days = 21) {
  const ratings = safeRead('q_practice_ratings', {})
  let totalWeight = 0
  let completedWeight = 0

  for (let i = 0; i < days; i++) {
    const dateKey = getPreviousDateKey(date, i + 1)
    const dayChecks = checked[dateKey] || {}
    if (practiceKey in dayChecks) {
      const done = dayChecks[practiceKey]
      if (done) {
        const rating = ratings[dateKey]?.[practiceKey] || 'unrated'
        completedWeight += QUALITY_WEIGHTS[rating]
      }
      totalWeight += 1
    }
  }

  if (totalWeight < 3) return null // insufficient data
  return completedWeight / totalWeight
}

/**
 * Get quality summary for today's completed practices.
 * Used by the coach to calibrate message tone.
 */
export function getTodayQualitySummary(checked = {}, date = new Date()) {
  const dateKey = getDateKey(date)
  const dayChecks = checked[dateKey] || {}
  const ratings = safeRead('q_practice_ratings', {})
  const todayRatings = ratings[dateKey] || {}

  const completed = Object.entries(dayChecks).filter(([, done]) => done)
  if (completed.length === 0) return { avgWeight: null, ratedCount: 0, totalDone: 0 }

  let totalWeight = 0
  let ratedCount = 0

  completed.forEach(([key]) => {
    const r = todayRatings[key]
    if (r) {
      totalWeight += QUALITY_WEIGHTS[r]
      ratedCount++
    } else {
      totalWeight += QUALITY_WEIGHTS.unrated
    }
  })

  return {
    avgWeight: totalWeight / completed.length,
    ratedCount,
    totalDone: completed.length,
    qualityLabel: totalWeight / completed.length >= 0.85 ? 'high'
      : totalWeight / completed.length >= 0.65 ? 'moderate' : 'low',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DOMAIN INTERACTION MODELING
// Causal dependency chain: Form → Field → Mind → Code
// When upstream domains are depleted, downstream domains are at predictive risk
// even before their own scores drop.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Domain causal graph — each domain affects those downstream.
 * Strength values represent how much a depleted upstream body
 * raises risk in the downstream body.
 */
const DOMAIN_CAUSAL_GRAPH = {
  d2: { // Form → Field, Mind
    affects: [
      { id: 'd3', strength: 0.70, lag: 1, mechanism: 'Nervous system dysregulation from low Form amplifies emotional reactivity in Field.' },
      { id: 'd4', strength: 0.45, lag: 2, mechanism: 'Chronic Form depletion reduces cognitive bandwidth, increasing Mind drift risk.' },
    ],
  },
  d3: { // Field → Mind, Code
    affects: [
      { id: 'd4', strength: 0.65, lag: 1, mechanism: 'Unprocessed emotional charge in Field disrupts focused attention in Mind.' },
      { id: 'd5', strength: 0.50, lag: 2, mechanism: 'Field charge embeds directly into Code as automatic behavioral programs.' },
    ],
  },
  d4: { // Mind → Code
    affects: [
      { id: 'd5', strength: 0.60, lag: 1, mechanism: 'Without conscious Mental direction, Code defaults to subconscious patterns.' },
    ],
  },
  d1: { // Source → all (access only, not causation)
    affects: [],
  },
  d5: { // Code → Form (behavioral loops affect physical patterns)
    affects: [
      { id: 'd2', strength: 0.35, lag: 3, mechanism: 'Entrenched behavioral Code patterns can undermine sleep and recovery habits.' },
    ],
  },
}

const DOMAIN_NAMES_BIE = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }

/**
 * Compute predictive risk for each domain based on upstream depletion.
 * Returns an array of risk predictions sorted by severity.
 *
 * @param domainScores  - current scores { d1:7, d2:3, d3:6, ... }
 * @param checked       - completion history
 * @param date          - reference date
 */
export function getDomainInteractionRisks(domainScores = {}, checked = {}, date = new Date()) {
  const risks = []
  const LOW_THRESHOLD = 4.5 // score below this is considered depleted

  Object.entries(DOMAIN_CAUSAL_GRAPH).forEach(([sourceId, { affects }]) => {
    const sourceScore = domainScores[sourceId] || 5
    if (sourceScore > LOW_THRESHOLD) return // upstream is healthy, no risk propagation

    const depletionDepth = (LOW_THRESHOLD - sourceScore) / LOW_THRESHOLD // 0–1

    affects.forEach(({ id: targetId, strength, lag, mechanism }) => {
      const targetScore = domainScores[targetId] || 5
      const targetAlreadyLow = targetScore <= LOW_THRESHOLD

      // How many days has the upstream been low?
      let daysLow = 0
      for (let i = 0; i < 7; i++) {
        const prevKey = getPreviousDateKey(date, i + 1)
        // Use checked completion as proxy for domain health on that day
        const dayChecks = checked[prevKey] || {}
        const domainPracticesDone = Object.entries(dayChecks)
          .filter(([k, done]) => done && k.startsWith(sourceId)).length
        if (domainPracticesDone === 0) daysLow++
        else break
      }

      const riskScore = depletionDepth * strength * Math.min(1, daysLow / 3)
      if (riskScore < 0.20) return // below meaningful threshold

      risks.push({
        sourceId,
        sourceName: DOMAIN_NAMES_BIE[sourceId],
        targetId,
        targetName: DOMAIN_NAMES_BIE[targetId],
        riskScore: Math.round(riskScore * 100),
        daysLow,
        lag,
        mechanism,
        targetAlreadyLow,
        severity: riskScore > 0.55 ? 'high' : riskScore > 0.35 ? 'moderate' : 'emerging',
        prediction: targetAlreadyLow
          ? `${DOMAIN_NAMES_BIE[targetId]} is already low and at risk of compounding — ${DOMAIN_NAMES_BIE[sourceId]} depletion is driving it deeper.`
          : `${DOMAIN_NAMES_BIE[sourceId]} has been low ${daysLow}+ days — expect ${DOMAIN_NAMES_BIE[targetId]} drift within ${lag} day${lag > 1 ? 's' : ''} if not addressed.`,
      })
    })
  })

  return risks.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Get the highest-priority upstream intervention.
 * Instead of correcting the symptom (the downstream body), correct the cause.
 */
export function getUpstreamIntervention(domainScores = {}, checked = {}, date = new Date()) {
  const risks = getDomainInteractionRisks(domainScores, checked, date)
  if (risks.length === 0) return null

  const top = risks[0]
  return {
    ...top,
    intervention: `Address ${top.sourceName} first — it is causing the ${top.targetName} drift, not the other way around.`,
    priority: 'upstream',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TIME-OF-DAY WEIGHTING
// Routes struggling domains to the user's strongest completion window.
// Builds on existing phasePerformance data in the pattern profile.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given phase performance rates and a domain that needs attention,
 * return the optimal phase to assign that domain's practices.
 *
 * @param phasePerformance - from pattern profile: [{ phase, rate, label }]
 * @param domainId         - domain to route
 * @param currentPhase     - where it's currently assigned
 */
export function getOptimalPhaseForDomain(phasePerformance = [], domainId, currentPhase = 'morning') {
  if (phasePerformance.length === 0) return { phase: currentPhase, reason: null }

  // Find the best-performing phase
  const sorted = [...phasePerformance]
    .filter(p => p.rate !== null && p.rate !== undefined)
    .sort((a, b) => b.rate - a.rate)

  if (sorted.length === 0) return { phase: currentPhase, reason: null }

  const best = sorted[0]
  const current = phasePerformance.find(p => p.phase === currentPhase)
  const currentRate = current?.rate ?? 0.5

  // Only suggest a change if the best phase is meaningfully better
  const improvement = best.rate - currentRate
  if (improvement < 0.20 || best.phase === currentPhase) {
    return { phase: currentPhase, shouldMove: false, reason: null }
  }

  return {
    phase: best.phase,
    shouldMove: true,
    currentRate: Math.round(currentRate * 100),
    bestRate: Math.round(best.rate * 100),
    improvement: Math.round(improvement * 100),
    reason: `${DOMAIN_NAMES_BIE[domainId]} practices complete ${Math.round(best.rate * 100)}% of the time in ${best.label} vs ${Math.round(currentRate * 100)}% in ${current?.label || currentPhase}. Moving to ${best.label} increases completion probability significantly.`,
  }
}

/**
 * Generate phase routing recommendations for all struggling domains.
 * Returns actionable routing changes the engine can apply.
 */
export function getPhaseRoutingRecommendations(domainScores = {}, phasePerformance = [], checked = {}, date = new Date()) {
  const LOW_THRESHOLD = 4.5
  const recommendations = []

  const DOMAIN_DEFAULT_PHASES = {
    d1: 'morning',
    d2: 'morning',
    d3: 'evening',
    d4: 'morning',
    d5: 'midday',
  }

  Object.entries(domainScores).forEach(([domainId, score]) => {
    if (domainId === 'd1') return // Source always stays in morning
    if (score > LOW_THRESHOLD) return // only route struggling domains

    const currentPhase = DOMAIN_DEFAULT_PHASES[domainId] || 'morning'
    const routing = getOptimalPhaseForDomain(phasePerformance, domainId, currentPhase)

    if (routing.shouldMove) {
      recommendations.push({
        domainId,
        domainName: DOMAIN_NAMES_BIE[domainId],
        fromPhase: currentPhase,
        toPhase: routing.phase,
        reason: routing.reason,
        improvement: routing.improvement,
      })
    }
  })

  return recommendations.sort((a, b) => b.improvement - a.improvement)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RECOVERY ARC MODELING
// Distinguishes sudden drops from gradual fades.
// Different causes require different interventions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify the shape of a decline pattern.
 *
 * sudden_drop  = 2+ missed days after a run of 3+ aligned days
 *                Likely cause: external event, disruption, travel, crisis
 *                Intervention: re-entry anchor, minimum viable plan
 *
 * gradual_fade = 5+ days of declining completion (not missed, just declining)
 *                Likely cause: friction accumulation, motivation drift, overload
 *                Intervention: friction audit, substitution, load reduction
 *
 * volatile     = alternating aligned/missed with no stable pattern
 *                Likely cause: inconsistent schedule, environment instability
 *                Intervention: anchor one fixed practice regardless of everything else
 *
 * stable       = no significant decline
 */
export function classifyRecoveryArc(checked = {}, dayStatus = {}, date = new Date()) {
  const days = 14
  const keys = Array.from({ length: days }, (_, i) => getPreviousDateKey(date, i + 1))

  // Build completion series (most recent last)
  const series = keys.reverse().map(k => {
    const status = dayStatus[k]?.status
    const total = Object.values(checked[k] || {}).filter(Boolean).length
    return { key: k, status, total, locked: status === 'locked', missed: status === 'missed' }
  })

  // ── Sudden drop detection ─────────────────────────────────────────────────
  // Look for: 3+ aligned, then 2+ missed
  let alignedRun = 0, peakRun = 0, postPeakMissed = 0
  let foundPeak = false

  series.forEach(day => {
    if (!foundPeak) {
      if (day.locked) { alignedRun++; peakRun = Math.max(peakRun, alignedRun) }
      else { if (alignedRun >= 3) foundPeak = true; alignedRun = 0 }
    } else {
      if (day.missed || day.total === 0) postPeakMissed++
    }
  })

  if (peakRun >= 3 && postPeakMissed >= 2) {
    return {
      type: 'sudden_drop',
      peakStreak: peakRun,
      missedAfter: postPeakMissed,
      intervention: 'external_disruption',
      message: `A strong aligned period was followed by a sudden stop. This pattern suggests an external disruption rather than motivation failure.`,
      coachTone: 'warm_reentry',
      recommendations: [
        'Reduce to minimum viable plan — 1 practice per phase only',
        'Use the lowest-friction practice available as the re-entry anchor',
        'Do not attempt to "make up" missed days',
      ],
    }
  }

  // ── Gradual fade detection ────────────────────────────────────────────────
  // Look for: declining totals over 5+ days without outright misses
  const recentTotals = series.slice(-7).map(d => d.total)
  const olderTotals  = series.slice(0, 7).map(d => d.total)
  const recentAvg = recentTotals.reduce((a,b)=>a+b,0) / recentTotals.length
  const olderAvg  = olderTotals.reduce((a,b)=>a+b,0) / olderTotals.length
  const outright_misses = series.slice(-7).filter(d => d.missed).length

  if (recentAvg < olderAvg * 0.70 && outright_misses <= 1) {
    return {
      type: 'gradual_fade',
      recentAvg: Math.round(recentAvg * 10) / 10,
      olderAvg:  Math.round(olderAvg * 10) / 10,
      fadePct:   Math.round((1 - recentAvg / olderAvg) * 100),
      intervention: 'friction_accumulation',
      message: `Completion has been declining steadily without outright misses. This is friction accumulation — the plan has become subtly harder than the available energy.`,
      coachTone: 'friction_audit',
      recommendations: [
        'Identify which practices are being done last (most likely to be skipped)',
        'Substitute 1 high-friction practice for a lower-friction alternative',
        'Reduce total daily practices by 20% for one week',
      ],
    }
  }

  // ── Volatile pattern detection ────────────────────────────────────────────
  let alternations = 0
  for (let i = 1; i < series.length; i++) {
    const prev = series[i-1].locked
    const curr = series[i].locked
    if (prev !== curr) alternations++
  }

  if (alternations >= series.length * 0.6) {
    return {
      type: 'volatile',
      alternations,
      intervention: 'anchor_stabilization',
      message: `Completion alternates between aligned and missed days without stabilizing. This suggests schedule or environment instability rather than motivation issues.`,
      coachTone: 'anchor_focus',
      recommendations: [
        'Choose one practice that happens every day regardless of everything else',
        'Use that practice as the completion anchor — everything else is optional',
        'Stability comes before expansion in this arc',
      ],
    }
  }

  return {
    type: 'stable',
    intervention: null,
    message: null,
    coachTone: null,
    recommendations: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEEDBACK LOOP CLOSURE
// Accuracy ratings from beta feedback reduce domain confidence weights.
// Consistent "not accurate" for a domain → engine trusts its own signals less
// and defers more to behavioral data.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute domain confidence modifiers from feedback accuracy ratings.
 * Returns a map: domainId → confidence modifier (0.5–1.0)
 * 1.0 = full confidence, 0.5 = significant doubt, trust behavioral data over model
 */
export function getDomainConfidenceModifiers(date = new Date()) {
  const feedback = safeRead('q_beta_feedback', {})
  const keys = Object.keys(feedback)
  if (keys.length === 0) return {}

  // Collect recent feedback entries (last 21 days)
  const recent = keys
    .filter(k => {
      try {
        const d = new Date(k)
        const daysAgo = (date - d) / (1000 * 60 * 60 * 24)
        return daysAgo <= 21
      } catch { return false }
    })
    .map(k => feedback[k])

  if (recent.length < 3) return {} // need at least 3 entries for signal

  // Aggregate accuracy ratings
  const domainAccuracy = {}

  recent.forEach(entry => {
    // Strategy maps to primary domain
    const strategyDomainMap = {
      recovery_first:                  'd2',
      elevate_red_zone_body:           'any',
      reduce_overload:                 'd4',
      stabilize_interference_pressure: 'd3',
      restore_source_attunement:       'd1',
      advance_with_balance:            'any',
    }

    const strategy  = entry.strategy || 'any'
    const domainId  = strategyDomainMap[strategy] || 'any'
    const accuracy  = entry.accuracy || 'somewhat_accurate'
    const weight    = accuracy === 'very_accurate' ? 1.0
      : accuracy === 'somewhat_accurate' ? 0.5
      : accuracy === 'not_accurate' ? 0 : 0.5

    if (!domainAccuracy[domainId]) domainAccuracy[domainId] = { total: 0, count: 0 }
    domainAccuracy[domainId].total += weight
    domainAccuracy[domainId].count++
  })

  // Convert to confidence modifiers
  const modifiers = {}
  Object.entries(domainAccuracy).forEach(([domainId, { total, count }]) => {
    if (count < 2) return
    const accuracyRate = total / count
    // Map accuracy → confidence modifier (poor accuracy → lower confidence → engine defers to behavior)
    modifiers[domainId] = Math.max(0.50, Math.min(1.0, 0.50 + accuracyRate * 0.50))
  })

  return modifiers
}

/**
 * Apply domain confidence modifiers to domain scores.
 * When feedback says the engine is wrong about a domain,
 * pull its effective score toward a neutral midpoint (5.0).
 */
export function applyConfidenceModifiers(domainScores = {}, modifiers = {}) {
  const adjusted = { ...domainScores }
  const NEUTRAL = 5.0

  Object.entries(modifiers).forEach(([domainId, modifier]) => {
    if (domainId === 'any' || !adjusted[domainId]) return
    const raw = adjusted[domainId]
    // Blend toward neutral based on how low confidence is
    // modifier=1.0 → no change, modifier=0.5 → 50% blend toward neutral
    adjusted[domainId] = raw * modifier + NEUTRAL * (1 - modifier)
  })

  return adjusted
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ONBOARDING BASELINE SEPARATION
// Separates typical state from current state for Day 1 accuracy.
// The engine uses typical as reference and current as starting coherence.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process enhanced onboarding scores that include both typical and current dimensions.
 * Standard onboarding: { d1: 7, d2: 5, ... } (single score average)
 * Enhanced onboarding: { d1: { typical: 8, current: 5, behavioral: 6 }, ... }
 *
 * Returns:
 * - baselineScores: what the engine uses as the reference (typical state)
 * - startingScores: Day 1 coherence state (current state)
 * - gapAnalysis:    domains with largest gap between typical and current
 * - contextProfile: time availability, primary goal, best window
 */
export function processEnhancedOnboardingScores(detailedScores = {}) {
  const domains = ['d1', 'd2', 'd3', 'd4', 'd5']
  const baselineScores = {}
  const startingScores = {}
  const gaps = []

  domains.forEach(id => {
    const s = detailedScores[id]
    if (!s || typeof s !== 'object') {
      // Legacy format — single array of 3 scores
      const avg = Array.isArray(s)
        ? s.reduce((a,b) => a+b, 0) / s.length
        : (s || 5)
      baselineScores[id] = avg
      startingScores[id] = avg
      return
    }

    // Enhanced format
    const typical    = s.typical ?? s[0] ?? 5
    const current    = s.current ?? s[1] ?? 5
    const behavioral = s.behavioral ?? s[2] ?? 5

    // Baseline = weighted average of typical + behavioral context
    // (behavioral context asks: "when things are hard, what tends to suffer most?")
    baselineScores[id] = Math.round((typical * 0.6 + behavioral * 0.4) * 10) / 10
    startingScores[id] = current

    const gap = typical - current
    if (Math.abs(gap) >= 2) {
      gaps.push({
        domainId: id,
        typical,
        current,
        gap,
        direction: gap > 0 ? 'below_baseline' : 'above_baseline',
        priority: gap > 0 ? 'high' : 'low',
      })
    }
  })

  return {
    baselineScores,
    startingScores,
    gapAnalysis: gaps.sort((a,b) => Math.abs(b.gap) - Math.abs(a.gap)),
    hasEnhancedData: Object.values(detailedScores).some(s => typeof s === 'object' && !Array.isArray(s)),
  }
}

/**
 * Generate a Day 1 coaching message based on onboarding gap analysis.
 * Used instead of the generic "the system is learning" message.
 */
export function getOnboardingGapMessage(gapAnalysis = [], contextProfile = {}) {
  if (gapAnalysis.length === 0) return null

  const topGap = gapAnalysis[0]
  const DOMAIN_NAMES = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
  const domainName = DOMAIN_NAMES[topGap.domainId] || topGap.domainId

  if (topGap.direction === 'below_baseline') {
    return {
      headline: `${domainName} is below your typical state right now.`,
      body: `Your baseline for ${domainName} is ${topGap.typical}/10 — currently at ${topGap.current}/10. Today's plan addresses this gap directly. The engine has already adjusted your practices accordingly.`,
      tone: 'warm',
    }
  }

  return {
    headline: `You are in a strong state for ${domainName} right now.`,
    body: `Your current ${domainName} state (${topGap.current}/10) is above your baseline (${topGap.typical}/10). The engine will build on this momentum.`,
    tone: 'measured',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER BEHAVIORAL INTELLIGENCE EXPORT
// Single function that returns all six improvement outputs for use in
// todayEngine, coachEngine, and UI components.
// ─────────────────────────────────────────────────────────────────────────────

export function getBehavioralIntelligence(
  domainScores = {},
  checked = {},
  dayStatus = {},
  onboardingProfile = null,
  date = new Date()
) {
  try {
    const phasePerformance = safeRead('q_pattern_profile', {})?.phasePerformance || []
    const feedbackModifiers = getDomainConfidenceModifiers(date)
    const adjustedScores   = applyConfidenceModifiers(domainScores, feedbackModifiers)
    const domainRisks      = getDomainInteractionRisks(adjustedScores, checked, date)
    const phaseRouting     = getPhaseRoutingRecommendations(adjustedScores, phasePerformance, checked, date)
    const recoveryArc      = classifyRecoveryArc(checked, dayStatus, date)
    const todayQuality     = getTodayQualitySummary(checked, date)
    const upstreamRisk     = domainRisks[0] || null

    // Enhanced onboarding processing
    let onboardingEnhanced = null
    if (onboardingProfile?.detailedScores) {
      onboardingEnhanced = processEnhancedOnboardingScores(onboardingProfile.detailedScores)
    }

    return {
      // Adjusted scores (feedback-corrected)
      adjustedScores,
      feedbackModifiers,

      // Domain interaction risks
      domainRisks,
      upstreamRisk,

      // Phase routing
      phaseRouting,
      topPhaseRouting: phaseRouting[0] || null,

      // Recovery arc
      recoveryArc,

      // Signal quality
      todayQuality,

      // Onboarding
      onboardingEnhanced,

      // Summary flags for quick access in todayEngine
      hasUpstreamRisk:    domainRisks.some(r => r.severity === 'high'),
      hasSuddenDrop:      recoveryArc.type === 'sudden_drop',
      hasGradualFade:     recoveryArc.type === 'gradual_fade',
      isVolatile:         recoveryArc.type === 'volatile',
      hasPhaseImprovement: phaseRouting.length > 0,
      hasFeedbackSignal:  Object.keys(feedbackModifiers).length > 0,
    }
  } catch (e) {
    console.error('behavioralIntelligenceEngine error:', e)
    return {
      adjustedScores: domainScores,
      feedbackModifiers: {},
      domainRisks: [],
      upstreamRisk: null,
      phaseRouting: [],
      topPhaseRouting: null,
      recoveryArc: { type: 'stable', recommendations: [] },
      todayQuality: { avgWeight: null, ratedCount: 0, totalDone: 0 },
      onboardingEnhanced: null,
      hasUpstreamRisk: false,
      hasSuddenDrop: false,
      hasGradualFade: false,
      isVolatile: false,
      hasPhaseImprovement: false,
      hasFeedbackSignal: false,
    }
  }
}
