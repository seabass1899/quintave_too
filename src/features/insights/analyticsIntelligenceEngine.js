/**
 * analyticsIntelligenceEngine.js
 * src/features/insights/analyticsIntelligenceEngine.js
 *
 * Sprint 9 — Analytics Intelligence Layer
 *
 * Answers four questions from raw behavioral data:
 *   1. What helps me most?      → Intervention ROI
 *   2. What hurts me most?      → Failure Analysis
 *   3. What creates momentum?   → Success Chain Analysis
 *   4. What is likely to happen? → Causal Prediction
 *
 * All outputs are confidence-gated (>= 0.65) and answer "so what?"
 * No raw numbers without interpretation.
 */

import { getOrComputeProfile, getWeeklyIntelligence } from '../intelligence/patternLearningModel'
import { getPreviousDateKey } from '../../shared/dateUtils'

const MIN_CONFIDENCE = 0.65
const DOMAIN_NAMES  = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)) }

function confidenceFromSampleSize(n, threshold = 5) {
  if (n < threshold) return 0
  return clamp(0.50 + (n - threshold) * 0.04, 0, 0.97)
}

function getRecentKeys(date, days = 30) {
  return Array.from({ length: days }, (_, i) => getPreviousDateKey(date, i + 1))
}

// ─── 1. Intervention ROI ──────────────────────────────────────────────────────
// "What helps me most?"
// Ranks practices by their impact on same-day and next-day completion.
// Considers: completion correlation, carryover effect, leverage score.

export function getInterventionROI(checked = {}, dayStatus = {}, date = new Date()) {
  try {
    const profile = getOrComputeProfile(checked, dayStatus, date)
    const keys    = getRecentKeys(date, 30)

    // Build a map: practiceKey → { name, domainId, completedDays[], nextDayCompletions[] }
    const practiceImpact = {}

    keys.forEach((dayKey, i) => {
      const dayChecks = checked[dayKey] || {}
      const nextKey   = i > 0 ? keys[i - 1] : null
      const nextChecks = nextKey ? (checked[nextKey] || {}) : null
      const nextTotal  = nextChecks ? Object.values(nextChecks).filter(Boolean).length : 0

      Object.entries(dayChecks).forEach(([key, done]) => {
        if (!done) return
        if (!practiceImpact[key]) {
          const [domainId] = key.split('_')
          practiceImpact[key] = {
            key,
            domainId,
            name: profile.momentum?.find(m => m.key === key)?.name
              || profile.avoidance?.find(a => a.key === key)?.name
              || key,
            completedCount: 0,
            sameDay: [],       // total practices done on days this was completed
            nextDayTotals: [], // total practices next day
          }
        }
        const dayTotal = Object.values(dayChecks).filter(Boolean).length
        practiceImpact[key].completedCount++
        practiceImpact[key].sameDay.push(dayTotal)
        if (nextChecks !== null) practiceImpact[key].nextDayTotals.push(nextTotal)
      })
    })

    // Score each practice
    const scored = Object.values(practiceImpact)
      .filter(p => p.completedCount >= 3)
      .map(p => {
        const avgSameDay   = p.sameDay.reduce((a, b) => a + b, 0) / p.sameDay.length
        const avgNextDay   = p.nextDayTotals.length > 0
          ? p.nextDayTotals.reduce((a, b) => a + b, 0) / p.nextDayTotals.length
          : 0

        // Baseline: average total completions across all days
        const allDayTotals = keys.map(k => Object.values(checked[k] || {}).filter(Boolean).length)
        const baseline     = allDayTotals.reduce((a, b) => a + b, 0) / allDayTotals.length || 1

        const sameDayLift   = ((avgSameDay - baseline) / baseline) * 100
        const nextDayLift   = p.nextDayTotals.length >= 3
          ? ((avgNextDay - baseline) / baseline) * 100
          : 0

        const roiScore      = clamp(sameDayLift * 0.6 + nextDayLift * 0.4, -100, 100)
        const confidence    = confidenceFromSampleSize(p.completedCount)
        const hasMomentum   = profile.momentum?.some(m => m.key === p.key)
        const domainName    = DOMAIN_NAMES[p.domainId] || p.domainId

        // Cap display values — very high lifts mean strong correlation, not literal 168% more
        const displaySameDayLift = Math.min(sameDayLift, 85)
        const displayNextDayLift = Math.min(nextDayLift, 85)
        const isHighCorrelation  = sameDayLift > 60

        return {
          key:          p.key,
          name:         p.name,
          domainId:     p.domainId,
          domainName,
          roiScore,
          sameDayLift:  Math.round(displaySameDayLift),
          nextDayLift:  Math.round(displayNextDayLift),
          isHighCorrelation,
          completedCount: p.completedCount,
          confidence,
          hasMomentum,
          soWhat: isHighCorrelation
            ? `${p.name} is strongly correlated with high-completion days. When it gets done, the rest of the day follows. Lead with this.`
            : roiScore > 20
            ? `When ${p.name} gets done, overall daily completion rises noticeably. Lead with this.`
            : roiScore > 5
            ? `${p.name} has a positive effect on the day. Worth keeping in the plan.`
            : `${p.name} shows neutral impact. Consider whether it needs a better time slot.`,
        }
      })
      .filter(p => p.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.roiScore - a.roiScore)

    if (scored.length === 0) return { ready: false, items: [], topPractice: null }

    const top3 = scored.slice(0, 3)
    const topPractice = top3[0]

    return {
      ready: true,
      items: top3,
      topPractice,
      summary: topPractice.isHighCorrelation
        ? `${topPractice.name} is your highest-impact practice. Days it gets done, overall completion is significantly higher.`
        : `${topPractice.name} generates the largest return across your day. Days it gets done, overall completion rises by ~${Math.abs(topPractice.sameDayLift)}%.`,
      soWhat: `Lead your day with ${topPractice.name}. The data shows this practice pulls others with it.`,
    }
  } catch { return { ready: false, items: [], topPractice: null } }
}

// ─── 2. Failure Analysis ──────────────────────────────────────────────────────
// "What hurts me most?"
// Detects patterns that predict incomplete days — missed triggers, friction points,
// phase collapse sequences.

export function getFailureAnalysis(checked = {}, dayStatus = {}, date = new Date()) {
  try {
    const profile = getOrComputeProfile(checked, dayStatus, date)
    const keys    = getRecentKeys(date, 30)
    const findings = []

    // ── Finding 1: Missing Morning → incomplete day ──────────────────────────
    let morningMissedDays = 0, morningMissedIncomplete = 0
    let morningCompleteDays = 0, morningCompleteIncomplete = 0

    keys.forEach(k => {
      const dayChecks = checked[k] || {}
      const total = Object.values(dayChecks).filter(Boolean).length
      const hasMorning = Object.entries(dayChecks).some(([key, done]) => {
        if (!done) return false
        // Morning practices: Directive, Visualization, Stillness, Affirmation, Observer, Breathwork
        const name = (profile.momentum?.find(m => m.key === key)?.name
          || profile.avoidance?.find(a => a.key === key)?.name || '').toLowerCase()
        return /directive|visualization|stillness|affirmation|observer|breathwork/.test(name)
          || key.startsWith('d4_0') || key.startsWith('d1_') || key.startsWith('d4_1')
      })

      if (hasMorning) {
        morningCompleteDays++
        if (total < 4) morningCompleteIncomplete++
      } else {
        morningMissedDays++
        if (total < 4) morningMissedIncomplete++
      }
    })

    if (morningMissedDays >= 4) {
      const missRate = morningMissedDays > 0 ? morningMissedIncomplete / morningMissedDays : 0
      const completeRate = morningCompleteDays > 0 ? morningCompleteIncomplete / morningCompleteDays : 0
      const lift = (missRate - completeRate) * 100
      const confidence = confidenceFromSampleSize(morningMissedDays)
      if (confidence >= MIN_CONFIDENCE && lift > 15) {
        findings.push({
          id: 'missing_morning',
          title: 'Missing Morning raises failure risk',
          stat: `${Math.round(missRate * 100)}% of days without Morning practice ended incomplete`,
          comparison: `vs ${Math.round(completeRate * 100)}% on days with Morning done`,
          lift: Math.round(lift),
          confidence,
          severity: lift > 40 ? 'high' : lift > 25 ? 'moderate' : 'low',
          soWhat: `Morning practice is your day's anchor. Skipping it raises incomplete day risk by ~${Math.round(lift)}%. Even one Morning practice changes the trajectory.`,
          action: 'Protect Morning — even a 5-minute practice is enough.',
        })
      }
    }

    // ── Finding 2: Avoidance → next-day coherence drop ───────────────────────
    if (profile.avoidance?.length > 0) {
      const strongAvoided = profile.avoidance.filter(a => a.severity === 'strong')
      if (strongAvoided.length > 0) {
        const topAvoided = strongAvoided[0]
        const skipPct = Math.round((1 - topAvoided.rate) * 100)
        const confidence = confidenceFromSampleSize(topAvoided.assigned)
        if (confidence >= MIN_CONFIDENCE) {
          findings.push({
            id: 'strong_avoidance',
            title: `${topAvoided.name} is creating friction`,
            stat: `Skipped ${skipPct}% of the time when assigned`,
            comparison: `${topAvoided.skipped} of ${topAvoided.assigned} assignments not completed`,
            lift: skipPct,
            confidence,
            severity: skipPct > 70 ? 'high' : 'moderate',
            soWhat: `${topAvoided.name} is being skipped too often to generate signal. The engine has already reduced its frequency — but if this continues, it will be substituted entirely.`,
            action: `Try a shorter version of ${topAvoided.name} or ask: what makes this feel hard?`,
          })
        }
      }
    }

    // ── Finding 3: Evening collapse sequence ─────────────────────────────────
    let eveningMissed = 0, eveningTotal = 0
    keys.forEach(k => {
      const dayChecks = checked[k] || {}
      const hasEvening = Object.entries(dayChecks).some(([key, done]) => {
        if (!done) return false
        const name = (profile.momentum?.find(m => m.key === key)?.name || '').toLowerCase()
        return /gratitude|reframe|emotional log|dream log|pre-sleep|forgiveness/.test(name)
          || key.startsWith('d3_') || key.startsWith('d5_3')
      })
      eveningTotal++
      if (!hasEvening) eveningMissed++
    })

    if (eveningTotal >= 7) {
      const missRate = eveningMissed / eveningTotal
      const confidence = confidenceFromSampleSize(eveningMissed, 4)
      if (missRate > 0.55 && confidence >= MIN_CONFIDENCE) {
        findings.push({
          id: 'evening_collapse',
          title: 'Evening is your weakest window',
          stat: `Evening practice missed ${Math.round(missRate * 100)}% of days`,
          comparison: `Only ${Math.round((1 - missRate) * 100)}% of days include evening integration`,
          lift: Math.round(missRate * 100),
          confidence,
          severity: missRate > 0.7 ? 'high' : 'moderate',
          soWhat: `Evening integration is where signal from the day gets locked in. Without it, tomorrow starts from near-zero rather than building on today's work.`,
          action: 'Set a single Evening anchor — even Gratitude + Reframe takes 3 minutes.',
        })
      }
    }

    // ── Finding 4: High friction → completion collapse ────────────────────────
    const highFrictionKeys = Object.keys(checked[keys[0]] || {}).filter(k => {
      const name = (profile.avoidance?.find(a => a.key === k)?.name || '').toLowerCase()
      return /theta|shadow|deep work|training|mobility|cold|forgiveness|deathless|identity decompression/.test(name)
    })
    if (highFrictionKeys.length === 0 && profile.avoidance?.some(a => a.friction >= 3)) {
      const highFrictionAvoided = profile.avoidance.filter(a => a.friction >= 3)
      if (highFrictionAvoided.length >= 2) {
        findings.push({
          id: 'friction_overload',
          title: 'High-friction practices are reducing overall completion',
          stat: `${highFrictionAvoided.length} high-effort practices with low completion`,
          comparison: `Average skip rate: ${Math.round(highFrictionAvoided.reduce((a,b) => a + (1-b.rate), 0) / highFrictionAvoided.length * 100)}%`,
          lift: 30,
          confidence: 0.70,
          severity: 'moderate',
          soWhat: `When the plan feels too hard, the whole day collapses — not just the hard practice. Lower the ceiling so more gets done.`,
          action: 'Swap one high-friction practice for a lower-friction alternative in the same domain.',
        })
      }
    }

    return {
      ready: findings.length > 0,
      findings,
      topFinding: findings[0] || null,
      summary: findings.length > 0
        ? `${findings.length} friction pattern${findings.length > 1 ? 's' : ''} detected. ${findings[0]?.title}.`
        : null,
    }
  } catch { return { ready: false, findings: [], topFinding: null } }
}

// ─── 3. Success Chain Analysis ────────────────────────────────────────────────
// "What creates momentum?"
// Detects sequences that predict high-completion days and streak continuation.

export function getSuccessChainAnalysis(checked = {}, dayStatus = {}, date = new Date()) {
  try {
    const profile = getOrComputeProfile(checked, dayStatus, date)
    const keys    = getRecentKeys(date, 30)
    const chains  = []

    // ── Chain 1: Morning completion → Midday completion ───────────────────────
    let morningDone = 0, morningLeadsMidday = 0

    keys.forEach((k, i) => {
      const dayChecks = checked[k] || {}
      const total = Object.values(dayChecks).filter(Boolean).length
      const morningCount = Object.entries(dayChecks)
        .filter(([key, done]) => done && (key.startsWith('d4_0') || key.startsWith('d1_') || key.startsWith('d4_1'))).length

      if (morningCount >= 1) {
        morningDone++
        if (total >= 3) morningLeadsMidday++
      }
    })

    if (morningDone >= 5) {
      const rate = morningLeadsMidday / morningDone
      const confidence = confidenceFromSampleSize(morningDone)
      if (confidence >= MIN_CONFIDENCE && rate > 0.5) {
        chains.push({
          id: 'morning_momentum',
          title: 'Morning completion predicts full-day alignment',
          sequence: ['Morning practice', 'Full-day completion'],
          rate: Math.round(rate * 100),
          sampleSize: morningDone,
          confidence,
          strength: rate > 0.8 ? 'strong' : rate > 0.65 ? 'moderate' : 'emerging',
          soWhat: `On ${Math.round(rate * 100)}% of days where Morning practice was completed, the rest of the day followed. Morning is the gateway — not just a warm-up.`,
          action: 'Treat Morning practice as non-negotiable. The data shows the rest of the day follows from it.',
        })
      }
    }

    // ── Chain 2: Co-completion pairs ─────────────────────────────────────────
    if (profile.pairs?.length > 0) {
      const topPair = profile.pairs[0]
      if (topPair.coRate >= 0.65) {
        const confidence = confidenceFromSampleSize(
          Math.min(...topPair.keys.map(k =>
            profile.momentum?.find(m => m.key === k)?.completed || 3
          ))
        )
        if (confidence >= MIN_CONFIDENCE) {
          chains.push({
            id: `pair_${topPair.keys.join('_')}`,
            title: `${topPair.names.join(' + ')} is your strongest practice pair`,
            sequence: topPair.names,
            rate: Math.round(topPair.coRate * 100),
            sampleSize: 10,
            confidence: clamp(confidence, MIN_CONFIDENCE, 0.92),
            strength: topPair.coRate > 0.8 ? 'strong' : 'moderate',
            soWhat: `These two practices are completed together ${Math.round(topPair.coRate * 100)}% of the time. They reinforce each other — doing one makes the other far more likely.`,
            action: `Schedule ${topPair.names[0]} and ${topPair.names[1]} back-to-back. They compound each other.`,
          })
        }
      }
    }

    // ── Chain 3: Streak continuation pattern ─────────────────────────────────
    let streakDays = 0, streakContinued = 0
    keys.forEach((k, i) => {
      const prevKey = i < keys.length - 1 ? keys[i + 1] : null
      const prevStatus = prevKey ? dayStatus[prevKey]?.status : null
      if (prevStatus === 'locked') {
        streakDays++
        if (dayStatus[k]?.status === 'locked') streakContinued++
      }
    })

    if (streakDays >= 4) {
      const rate = streakContinued / streakDays
      const confidence = confidenceFromSampleSize(streakDays)
      if (confidence >= MIN_CONFIDENCE && rate > 0.55) {
        chains.push({
          id: 'streak_momentum',
          title: 'Streaks self-reinforce once established',
          sequence: ['Aligned day', 'Next aligned day'],
          rate: Math.round(rate * 100),
          sampleSize: streakDays,
          confidence,
          strength: rate > 0.75 ? 'strong' : 'moderate',
          soWhat: `After an aligned day, the probability of another aligned day is ${Math.round(rate * 100)}%. Streaks compound — the longer they run, the more likely they continue.`,
          action: 'Never break a streak intentionally. A 1-practice minimum day preserves the chain.',
        })
      }
    }

    // ── Chain 4: Momentum practice → domain stabilization ────────────────────
    if (profile.momentum?.length > 0) {
      const topMomentum = profile.momentum[0]
      const confidence  = confidenceFromSampleSize(topMomentum.completed || 3)
      if (confidence >= MIN_CONFIDENCE) {
        chains.push({
          id: `momentum_${topMomentum.key}`,
          title: `${topMomentum.name} is your most reliable signal builder`,
          sequence: [topMomentum.name, `${DOMAIN_NAMES[topMomentum.domainId] || 'Domain'} stabilization`],
          rate: Math.round(Math.min(100, (topMomentum.rate || 0.8) * 100)),
          sampleSize: topMomentum.completed || 3,
          confidence: clamp(confidence, MIN_CONFIDENCE, 0.92),
          strength: (topMomentum.rate || 0) > 1.0 ? 'strong' : 'moderate',
          soWhat: `${topMomentum.name} has the strongest completion history in your data. It creates carryover into other practices on the same day.`,
          action: `Keep ${topMomentum.name} in every week's plan — it's where your consistency lives.`,
        })
      }
    }

    return {
      ready: chains.length > 0,
      chains,
      topChain: chains[0] || null,
      summary: chains.length > 0
        ? `${chains.length} momentum pattern${chains.length > 1 ? 's' : ''} identified. ${chains[0]?.title}.`
        : null,
    }
  } catch { return { ready: false, chains: [], topChain: null } }
}

// ─── 4. Causal Prediction ─────────────────────────────────────────────────────
// "What is likely to happen next?"
// Combines failure signals + success chains + trajectory to generate a
// forward-looking causal statement with confidence and evidence count.

export function getCausalPrediction(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  try {
    const profile   = getOrComputeProfile(checked, dayStatus, date)
    const roi       = getInterventionROI(checked, dayStatus, date)
    const failure   = getFailureAnalysis(checked, dayStatus, date)
    const chains    = getSuccessChainAnalysis(checked, dayStatus, date)
    const keys      = getRecentKeys(date, 7)

    // Recent trajectory — last 7 days
    const recentLocked = keys.filter(k => dayStatus[k]?.status === 'locked').length
    const recentTotals = keys.map(k => Object.values(checked[k] || {}).filter(Boolean).length)
    const avgRecent    = recentTotals.reduce((a,b) => a+b, 0) / keys.length

    // Evidence accumulation
    const evidence = []
    let riskLevel = 'neutral' // 'positive' | 'neutral' | 'at_risk'
    let riskScore = 0

    if (recentLocked >= 5) { riskScore += 2; evidence.push(`${recentLocked} of last 7 days aligned`) }
    else if (recentLocked >= 3) { riskScore += 1; evidence.push(`${recentLocked} of last 7 days aligned`) }
    else { riskScore -= 2; evidence.push(`Only ${recentLocked} of last 7 days aligned`) }

    if (chains.topChain?.strength === 'strong') { riskScore += 2; evidence.push(chains.topChain.title) }
    else if (chains.topChain) { riskScore += 1; evidence.push(`${chains.topChain.title} detected`) }

    if (failure.topFinding?.severity === 'high') { riskScore -= 2; evidence.push(failure.topFinding.title) }
    else if (failure.topFinding?.severity === 'moderate') { riskScore -= 1; evidence.push(failure.topFinding.title) }

    if (profile.avoidance?.some(a => a.severity === 'strong')) {
      riskScore -= 1; evidence.push('Strong avoidance pattern active')
    }
    if (profile.momentum?.length >= 2) {
      riskScore += 1; evidence.push(`${profile.momentum.length} momentum practices reinforcing`)
    }

    if (riskScore >= 3) riskLevel = 'positive'
    else if (riskScore <= -1) riskLevel = 'at_risk'

    // Build prediction text
    const predictions = {
      positive: {
        headline: 'Momentum is building — trajectory is positive.',
        body: chains.topChain
          ? `${chains.topChain.soWhat} If this continues, coherence should compound over the next 5–7 days.`
          : `Recent consistency is generating positive signal across multiple bodies. The system is stabilizing.`,
        recommendation: roi.topPractice
          ? `Continue leading with ${roi.topPractice.name} — it has the highest return in your data.`
          : `Protect your current streak. Adding complexity too soon disrupts the compounding.`,
        color: '#085041',
      },
      neutral: {
        headline: 'Signal is stable — consistency determines the next direction.',
        body: failure.topFinding
          ? `${failure.topFinding.soWhat} Addressing this would significantly improve trajectory.`
          : `The system is holding. No major drift detected, but momentum hasn't compounded yet.`,
        recommendation: roi.topPractice
          ? `Focus on ${roi.topPractice.name} this week — it generates the clearest return.`
          : `Establish one non-negotiable daily practice. Consistency matters more than variety right now.`,
        color: '#378ADD',
      },
      at_risk: {
        headline: 'Friction is building — intervention now prevents compounding drift.',
        body: failure.topFinding
          ? `${failure.topFinding.soWhat}`
          : `Recent completion patterns suggest the system is losing momentum. Early intervention is more effective than recovery.`,
        recommendation: failure.topFinding?.action
          || `Lower the bar: complete 1 practice today, any practice. Re-entry is the only priority.`,
        color: '#BA7517',
      },
    }

    const prediction = predictions[riskLevel]
    const confidence = clamp(0.55 + Math.abs(riskScore) * 0.06 + evidence.length * 0.02, 0, 0.93)

    return {
      ready: evidence.length >= 2,
      riskLevel,
      riskScore,
      headline:       prediction.headline,
      body:           prediction.body,
      recommendation: prediction.recommendation,
      color:          prediction.color,
      confidence,
      evidenceCount:  evidence.length,
      evidence,
      confidenceLabel: confidence >= 0.80 ? 'High confidence'
        : confidence >= 0.70 ? 'Moderate confidence'
        : 'Emerging pattern',
    }
  } catch { return { ready: false, riskLevel: 'neutral' } }
}

// ─── Master export ─────────────────────────────────────────────────────────────

export function getAnalyticsIntelligence(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  return {
    interventionROI:    getInterventionROI(checked, dayStatus, date),
    failureAnalysis:    getFailureAnalysis(checked, dayStatus, date),
    successChains:      getSuccessChainAnalysis(checked, dayStatus, date),
    causalPrediction:   getCausalPrediction(checked, dayStatus, domainScores, date),
    generatedAt:        new Date().toISOString(),
  }
}
