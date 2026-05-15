/**
 * weeklyInsightsEngine.js
 * src/features/insights/weeklyInsightsEngine.js
 *
 * Generates the Weekly Intelligence Report with confidence-gated pattern detection.
 *
 * Rules:
 * - Never surface a pattern below 0.65 confidence
 * - Every insight answers "so what?" — interpretation not analytics
 * - No raw numbers without context
 * - False insight destroys trust — when uncertain, stay silent
 */

import { getDateKey, getPreviousDateKey } from '../../shared/dateUtils'
import { DOMAINS, PRACTICES } from '../../data'

const CONFIDENCE_THRESHOLD = 0.65
const MIN_DAYS_FOR_PATTERN = 5     // need at least 5 days of data for pattern claims
const MIN_COMPLETIONS_FOR_SIGNAL = 3

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function getPracticeName(key) {
  const [domainId, indexRaw] = key.split('_')
  return PRACTICES[domainId]?.[Number(indexRaw)]?.name || key
}

function getDomainName(id) {
  return DOMAINS.find(d => d.id === id)?.name || id
}

function getRecentDays(checked, date, count) {
  const days = []
  for (let i = 0; i < count; i++) {
    const key = getPreviousDateKey(date, i)
    days.push({ dateKey: key, checks: checked[key] || {} })
  }
  return days
}

// ─── Section 1: Weekly Summary ────────────────────────────────────────────────

function buildWeeklySummary(checked, dayStatus, date) {
  let locked = 0, missed = 0, open = 0
  const days7 = []
  for (let i = 0; i < 7; i++) {
    const key = getPreviousDateKey(date, i)
    const status = dayStatus?.[key]?.status || 'open'
    if (status === 'locked') locked++
    else if (status === 'missed') missed++
    else open++
    days7.push({ key, status, checks: checked[key] || {} })
  }

  const completionRate = locked / 7
  const trend = locked >= 5 ? 'rising' : locked >= 3 ? 'stable' : 'declining'

  // Total signal this week
  let weeklySignal = 0
  days7.forEach(({ checks }) => {
    weeklySignal += Object.values(checks).filter(Boolean).length
  })

  // Compare to prior week
  let priorLocked = 0
  for (let i = 7; i < 14; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus?.[key]?.status === 'locked') priorLocked++
  }
  const weekOverWeek = priorLocked > 0
    ? Math.round(((locked - priorLocked) / priorLocked) * 100)
    : null

  const headline = locked >= 6 ? 'Strong coherence week. Momentum is becoming predictable.'
    : locked >= 4 ? 'Building momentum. Consistency is beginning to compound.'
    : locked >= 2 ? 'Foundation week. Consistency has not stabilized yet.'
    : 'Reset week. Recovery and re-entry are the only priorities.'

  const soWhat = locked >= 5
    ? 'Consistency at this level creates durable coherence — the system is learning your patterns faster.'
    : locked >= 3
      ? 'The baseline is forming. Three more consistent days will create compounding momentum.'
      : 'Every completed day this week carries more weight than usual. Tomorrow matters most.'

  return {
    locked,
    missed,
    open,
    weeklySignal,
    completionRate,
    trend,
    weekOverWeek,
    headline,
    soWhat,
    confidence: locked >= 3 ? 0.9 : 0.7,
  }
}

// ─── Section 2: Body Trends ───────────────────────────────────────────────────

function buildBodyTrends(checked, date) {
  const days14 = getRecentDays(checked, date, 14)
  const days7  = getRecentDays(checked, date, 7)

  const domainData = DOMAINS.filter(d => d.id !== 'd1').map(d => {
    const count7  = days7.reduce((a, { checks }) =>
      a + PRACTICES[d.id].filter((_, i) => checks[`${d.id}_${i}`]).length, 0)
    const count14 = days14.reduce((a, { checks }) =>
      a + PRACTICES[d.id].filter((_, i) => checks[`${d.id}_${i}`]).length, 0)
    const weekly14Avg = count14 / 2 // normalize to weekly rate

    const trend = count7 > weekly14Avg * 1.25 ? 'rising'
      : count7 < weekly14Avg * 0.75 ? 'falling'
      : 'stable'

    const pct7  = Math.min(100, Math.round((count7  / (7  * PRACTICES[d.id].length)) * 100))
    const pct14 = Math.min(100, Math.round((count14 / (14 * PRACTICES[d.id].length)) * 100))

    return { ...d, count7, count14, pct7, pct14, weekly14Avg, trend }
  })

  const strongest  = [...domainData].sort((a, b) => b.pct7 - a.pct7)[0]
  const weakest    = [...domainData].sort((a, b) => a.pct7 - b.pct7)[0]
  const fastestRise = domainData.filter(d => d.trend === 'rising')
    .sort((a, b) => (b.pct7 - b.pct14) - (a.pct7 - a.pct14))[0] || null
  const leastEngaged = [...domainData].sort((a, b) => a.count7 - b.count7)[0]

  // Only surface if we have meaningful data
  const hasSufficientData = domainData.some(d => d.count7 >= 2)

  const soWhat = strongest && weakest && strongest.id !== weakest.id
    ? `${strongest.name} is your anchor body this week. ${weakest.name} needs attention — when this body stays low, coherence drag compounds into the bodies that depend on it.`
    : 'Build body engagement across all domains before focusing on depth in any single one.'

  return {
    domains: domainData,
    strongest,
    weakest,
    fastestRise,
    leastEngaged,
    soWhat,
    hasSufficientData,
    confidence: hasSufficientData ? 0.8 : 0.5,
  }
}

// ─── Section 3: Most Effective Practice ──────────────────────────────────────

function buildEffectivePractice(checked, date) {
  // Read from pattern profile if available — already has completion rates
  const profile = safeRead('q_pattern_profile', null)
  const momentum = profile?.momentum || []
  const avoidance = profile?.avoidance || []

  const topMomentum = momentum[0] || null
  const topAvoided  = avoidance[0] || null

  if (!topMomentum) return null

  // Cap display at 100% — rates above 100% mean library completions > assignments,
  // which is valid data but breaks user trust if shown raw.
  const rawRate = topMomentum.rate
  const rate = Math.min(100, Math.round(rawRate * 100))
  const isHighCarryover = rawRate > 1.0
  const ripple = topMomentum.domainId

  const impact = isHighCarryover
    ? `${topMomentum.name} has a strong carryover effect — completing it early tends to pull other practices into completion.`
    : `Completing ${topMomentum.name} correlates with higher same-day completion across other practices.`
  const soWhat = `When ${topMomentum.name} gets done, the rest of the day holds better. Lead with it.`

  return {
    practice: topMomentum,
    avoided: topAvoided,
    rate,
    isHighCarryover,
    rippleDomain: getDomainName(ripple),
    impact,
    soWhat,
    confidence: rawRate >= 0.7 ? 0.85 : 0.7,
  }
}

// ─── Section 4: Pattern Detection (confidence-gated) ─────────────────────────

function buildPatternDetection(checked, dayStatus, date) {
  const patterns = []
  const days14 = getRecentDays(checked, date, 14)
  const days7  = getRecentDays(checked, date, 7)

  // Pattern A: Time-of-day consistency
  // Compare morning vs evening completion rates
  const plans = safeRead('q_today_plan', {})
  const phaseCompletion = { morning: { done: 0, assigned: 0 }, midday: { done: 0, assigned: 0 }, evening: { done: 0, assigned: 0 } }

  for (let i = 1; i < 14; i++) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    const checks = checked?.[key] || {}
    if (!plan?.phases) continue
    Object.entries(plan.phases).forEach(([phaseId, phase]) => {
      if (!phaseCompletion[phaseId]) return
      ;(phase?.items || []).forEach(item => {
        if (!item?.key) return
        phaseCompletion[phaseId].assigned++
        if (checks[item.key]) phaseCompletion[phaseId].done++
      })
    })
  }

  const phaseRates = Object.entries(phaseCompletion)
    .map(([phase, { done, assigned }]) => ({
      phase,
      rate: assigned >= 3 ? done / assigned : null,
      label: phase.charAt(0).toUpperCase() + phase.slice(1),
    }))
    .filter(p => p.rate !== null)
    .sort((a, b) => b.rate - a.rate)

  if (phaseRates.length >= 2) {
    const best  = phaseRates[0]
    const worst = phaseRates[phaseRates.length - 1]
    const gap   = best.rate - worst.rate

    if (gap >= 0.3) {
      // Significant time-of-day pattern
      const confidence = Math.min(0.95, 0.6 + gap)
      if (confidence >= CONFIDENCE_THRESHOLD) {
        patterns.push({
          id: 'time_of_day',
          type: 'strength',
          headline: `${best.label} is your strongest alignment window.`,
          detail: `${Math.round(best.rate * 100)}% completion in ${best.label} vs ${Math.round(worst.rate * 100)}% in ${worst.label}. A ${Math.round(gap * 100)}-point gap — this is a consistent behavioral pattern, not random variation.`,
          soWhat: `Prioritize your most important practices in the ${best.label.toLowerCase()} window. Avoid scheduling high-friction corrections in ${worst.label.toLowerCase()} unless necessary.`,
          confidence,
        })
      }
    }
  }

  // Pattern B: Drift-completion correlation
  // When Body A is low, does Body B tend to follow?
  const domainDailyDone = {}
  days14.forEach(({ dateKey, checks }) => {
    DOMAINS.filter(d => d.id !== 'd1').forEach(d => {
      if (!domainDailyDone[d.id]) domainDailyDone[d.id] = []
      const done = PRACTICES[d.id].filter((_, i) => checks[`${d.id}_${i}`]).length
      domainDailyDone[d.id].push(done)
    })
  })

  // Find the strongest correlation between domains
  const domainIds = DOMAINS.filter(d => d.id !== 'd1').map(d => d.id)
  let topCorrelation = null
  for (let i = 0; i < domainIds.length; i++) {
    for (let j = i + 1; j < domainIds.length; j++) {
      const a = domainDailyDone[domainIds[i]] || []
      const b = domainDailyDone[domainIds[j]] || []
      if (a.length < MIN_DAYS_FOR_PATTERN) continue

      // Simple correlation coefficient
      const n = a.length
      const meanA = a.reduce((s, v) => s + v, 0) / n
      const meanB = b.reduce((s, v) => s + v, 0) / n
      const cov = a.reduce((s, v, k) => s + (v - meanA) * (b[k] - meanB), 0) / n
      const stdA = Math.sqrt(a.reduce((s, v) => s + (v - meanA) ** 2, 0) / n)
      const stdB = Math.sqrt(b.reduce((s, v) => s + (v - meanB) ** 2, 0) / n)
      const corr = stdA > 0 && stdB > 0 ? cov / (stdA * stdB) : 0

      if (Math.abs(corr) > 0.55 && (!topCorrelation || Math.abs(corr) > Math.abs(topCorrelation.corr))) {
        topCorrelation = { a: domainIds[i], b: domainIds[j], corr }
      }
    }
  }

  if (topCorrelation && Math.abs(topCorrelation.corr) >= 0.55) {
    const confidence = Math.min(0.92, 0.5 + Math.abs(topCorrelation.corr) * 0.8)
    if (confidence >= CONFIDENCE_THRESHOLD) {
      const nameA = getDomainName(topCorrelation.a)
      const nameB = getDomainName(topCorrelation.b)
      const positive = topCorrelation.corr > 0

      patterns.push({
        id: 'domain_correlation',
        type: positive ? 'synergy' : 'interference',
        headline: positive
          ? `${nameA} and ${nameB} move together.`
          : `${nameA} and ${nameB} are in tension.`,
        detail: positive
          ? `On days when ${nameA} practices are completed, ${nameB} completion tends to follow. These bodies reinforce each other.`
          : `When ${nameA} practices increase, ${nameB} practices tend to decrease, and vice versa. These bodies are competing for attention.`,
        soWhat: positive
          ? `Completing one ${nameA} practice early tends to carry momentum into ${nameB}. Use this pair strategically.`
          : `Don't try to correct both ${nameA} and ${nameB} heavily on the same day — focus on the weaker one first.`,
        confidence,
      })
    }
  }

  // Pattern C: Recovery response pattern
  // Does the user respond better to low-friction or high-intensity correction?
  const profile = safeRead('q_pattern_profile', null)
  if (profile?.avoidance?.length >= 2) {
    const highFrictionAvoided = profile.avoidance.filter(a => a.friction >= 2).length
    const lowFrictionMomentum = (profile.momentum || []).filter(m => m.friction <= 1).length

    if (highFrictionAvoided >= 2 && lowFrictionMomentum >= 1) {
      const confidence = Math.min(0.88, 0.6 + highFrictionAvoided * 0.07)
      if (confidence >= CONFIDENCE_THRESHOLD) {
        patterns.push({
          id: 'friction_response',
          type: 'behavioral',
          headline: 'You respond better to low-friction correction than high-intensity practices.',
          detail: `${highFrictionAvoided} high-friction practices show avoidance patterns. Your highest-completion practices are lower-friction — and they generate comparable signal.`,
          soWhat: 'The engine is already adapting to this. Continue with the lower-friction approach — building the habit consistency matters more than practice intensity at this stage.',
          confidence,
        })
      }
    }
  }

  // Pattern D: Streak behavior
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  for (let i = 0; i < 30; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus?.[key]?.status === 'locked') {
      if (i === 0 || dayStatus?.[getPreviousDateKey(date, i - 1)]?.status === 'locked' || i === 0) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      }
    } else {
      tempStreak = 0
    }
  }

  for (let i = 0; i < 30; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus?.[key]?.status === 'locked') currentStreak++
    else break
  }

  if (currentStreak >= 3 && longestStreak > 0) {
    const isPersonalBest = currentStreak >= longestStreak
    const confidence = 0.95
    patterns.push({
      id: 'streak',
      type: 'momentum',
      headline: isPersonalBest
        ? `${currentStreak}-day streak — this is your longest sustained alignment period.`
        : `${currentStreak}-day streak — momentum is compounding.`,
      detail: `Alignment at this consistency level begins creating structural change, not just daily signal. The system is learning your patterns faster when you are consistent.`,
      soWhat: `Tomorrow's completion is now higher-leverage than any individual practice. The streak itself is a signal amplifier.`,
      confidence,
    })
  }

  // Filter to high-confidence patterns only, cap at 3
  return patterns
    .filter(p => p.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

// ─── Section 5: Risk Prediction ───────────────────────────────────────────────

function buildRiskPrediction(checked, dayStatus, date) {
  const risks = []
  const profile = safeRead('q_pattern_profile', null)

  // Risk A: Declining evening completion
  const plans = safeRead('q_today_plan', {})
  const last7EveningCompletion = []
  for (let i = 1; i <= 7; i++) {
    const key = getPreviousDateKey(date, i)
    const plan = plans?.[key]
    const checks = checked?.[key] || {}
    if (!plan?.phases?.evening) continue
    const items = plan.phases.evening?.items || []
    if (items.length === 0) continue
    const done = items.filter(item => item?.key && checks[item.key]).length
    last7EveningCompletion.push(done / items.length)
  }

  if (last7EveningCompletion.length >= 3) {
    const recentAvg = last7EveningCompletion.slice(0, 3).reduce((a, b) => a + b, 0) / 3
    const olderAvg  = last7EveningCompletion.slice(-3).reduce((a, b) => a + b, 0) / 3
    if (recentAvg < olderAvg - 0.2 && recentAvg < 0.5) {
      risks.push({
        id: 'evening_decline',
        severity: 'moderate',
        headline: 'Evening alignment completion is declining.',
        detail: 'Evening practices have dropped below 50% completion over the last 3 days. This window is where integration and tomorrow-priming happen.',
        consequence: 'If this continues, next week\'s Mind drift is likely to increase — evening is where cognitive correction happens.',
        action: 'Reduce Evening to 1 practice this week. One completed beats zero attempted.',
        confidence: 0.78,
      })
    }
  }

  // Risk B: Sustained avoidance of a body
  if (profile?.avoidance?.length >= 1) {
    const strongAvoidance = profile.avoidance.filter(a => a.severity === 'strong')
    if (strongAvoidance.length >= 1) {
      const top = strongAvoidance[0]
      risks.push({
        id: 'body_avoidance',
        severity: 'high',
        headline: `${getDomainName(top.domainId)} is being consistently avoided.`,
        detail: `${top.name} has been skipped ${top.skipped} of ${top.assigned} times it was assigned. Sustained avoidance of one body creates coherence drag that compounds over time.`,
        consequence: `Without intervention, ${getDomainName(top.domainId)} will continue to be the ceiling on your overall coherence score.`,
        action: `Replace ${top.name} with a lower-friction ${getDomainName(top.domainId)} practice this week. The goal is re-engagement, not performance.`,
        confidence: 0.85,
      })
    }
  }

  // Risk C: Streak break risk (no check-in today and it's late)
  const todayKey = getDateKey(date)
  const todayStatus = dayStatus?.[todayKey]?.status
  const hour = date.getHours()
  if (todayStatus !== 'locked' && hour >= 20) {
    risks.push({
      id: 'streak_risk',
      severity: 'low',
      headline: 'Today\'s alignment is not yet locked in.',
      detail: 'Completing at least the daily minimum tonight maintains the streak and prevents tomorrow\'s coherence from starting at a lower baseline.',
      consequence: 'A missed day resets momentum and typically creates a 2–3 day recovery period.',
      action: 'Complete 1 practice before sleep. Even one keeps the signal alive.',
      confidence: 0.9,
    })
  }

  // Risk D: Declining week-over-week
  let thisWeekLocked = 0, lastWeekLocked = 0
  for (let i = 0; i < 7; i++) {
    if (dayStatus?.[getPreviousDateKey(date, i)]?.status === 'locked') thisWeekLocked++
    if (dayStatus?.[getPreviousDateKey(date, i + 7)]?.status === 'locked') lastWeekLocked++
  }
  if (lastWeekLocked >= 3 && thisWeekLocked < lastWeekLocked - 2) {
    risks.push({
      id: 'week_decline',
      severity: 'moderate',
      headline: 'This week is trending below last week.',
      detail: `Last week: ${lastWeekLocked}/7 aligned. This week so far: ${thisWeekLocked}/7. A two-day gap at this stage means the consistency pattern is weakening.`,
      consequence: 'Two consecutive declining weeks typically leads to practice abandonment within 10 days.',
      action: 'Focus on completion rate over practice quality this week. Done matters more than perfect.',
      confidence: 0.82,
    })
  }

  return risks
    .filter(r => r.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => (b.severity === 'high' ? 1 : b.severity === 'moderate' ? 0 : -1) - (a.severity === 'high' ? 1 : a.severity === 'moderate' ? 0 : -1))
    .slice(0, 2)
}

// ─── Section 6: Next Week Recommendation ─────────────────────────────────────

function buildRecommendation(summary, bodyTrends, effectivePractice, patterns, risks) {
  const weakest = bodyTrends?.weakest
  const strongest = bodyTrends?.strongest
  const topPattern = patterns[0]
  const topRisk = risks[0]
  const topPractice = effectivePractice?.practice

  let focus = ''
  let priority = ''
  let reason = ''
  let action = ''

  if (topRisk?.severity === 'high') {
    focus = `Address ${topRisk.headline.split(' ')[0]} ${topRisk.headline.split(' ')[1]} avoidance`
    priority = topRisk.action
    reason = topRisk.consequence
    action = topRisk.action
  } else if (weakest && weakest.pct7 < 20) {
    focus = `Restore ${weakest.name} engagement`
    priority = `1 ${weakest.name} practice per day — no more`
    reason = `${weakest.name} is your lowest-engaged body. Small consistent input here creates the largest coherence return.`
    action = `Find the lowest-friction ${weakest.name} practice and assign it daily for 5 days.`
  } else if (topPattern?.id === 'time_of_day') {
    focus = 'Protect your strongest alignment window'
    priority = topPattern.soWhat
    reason = topPattern.detail
    action = 'Batch your 2 most important practices into your strongest window.'
  } else if (topPractice) {
    focus = `Build on ${topPractice.name} momentum`
    priority = `Lead every day with ${topPractice.name}`
    reason = effectivePractice.soWhat
    action = `${topPractice.name} first, every day, regardless of phase. It anchors everything else.`
  } else {
    focus = 'Build consistency before adding complexity'
    priority = 'Complete the daily minimum every day this week'
    reason = 'Consistency at the minimum creates more durable signal than high performance with gaps.'
    action = 'Remove one practice from your plan if needed to make daily completion easier.'
  }

  return { focus, priority, reason, action }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function generateWeeklyReport(checked = {}, dayStatus = {}, domainScores = {}, date = new Date()) {
  const summary          = buildWeeklySummary(checked, dayStatus, date)
  const bodyTrends       = buildBodyTrends(checked, date)
  const effectivePractice = buildEffectivePractice(checked, date)
  const patterns         = buildPatternDetection(checked, dayStatus, date)
  const risks            = buildRiskPrediction(checked, dayStatus, date)
  const recommendation   = buildRecommendation(summary, bodyTrends, effectivePractice, patterns, risks)

  return {
    generatedAt: date.toISOString(),
    weekOf: getPreviousDateKey(date, 6),
    summary,
    bodyTrends,
    effectivePractice,
    patterns,
    risks,
    recommendation,
    hasSufficientData: summary.locked >= 2 || Object.keys(checked).length >= 3,
  }
}
