/**
 * coherenceProfileEngine.js
 * src/features/profile/coherenceProfileEngine.js
 *
 * Sprint 7: Personal Coherence Profile
 *
 * Generates a living behavioral identity model from existing engine data.
 * Never fabricates — only surfaces patterns with sufficient evidence.
 *
 * Exports:
 *   generateCoherenceProfile()  — full profile object
 */

import { getDateKey, getPreviousDateKey } from '../../shared/dateUtils'
import { DOMAINS, PRACTICES } from '../../data'

const CONFIDENCE_THRESHOLD = 0.65
const MIN_DAYS = 5

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}

const DOMAIN_NAMES  = { d1:'Source', d2:'Form', d3:'Field', d4:'Mind', d5:'Code' }
const DOMAIN_COLORS = { d1:'#7F77DD', d2:'#1D9E75', d3:'#BA7517', d4:'#378ADD', d5:'#E24B4A' }

// ─── Alignment Type derivation ────────────────────────────────────────────────

const ALIGNMENT_TYPES = [
  {
    id: 'recovery_stabilizer',
    label: 'Recovery-first stabilizer',
    description: 'You build coherence by clearing interference before adding complexity. Stability is your foundation — not intensity.',
    match: p => p.dominantPhase === 'morning' && p.frictionProfile === 'low' && p.recoveryVelocity === 'fast',
  },
  {
    id: 'morning_expander',
    label: 'Morning-anchored expander',
    description: 'You generate your strongest signal early and build on it. Morning completion is your most reliable leverage point.',
    match: p => p.dominantPhase === 'morning' && p.frictionProfile !== 'high' && p.momentumState === 'accelerating',
  },
  {
    id: 'fragmented_rebuilder',
    label: 'Fragmented rebuilder',
    description: 'Your signal tends to build in bursts rather than streaks. Recovery speed is high — the gap is sustained consistency.',
    match: p => p.streakPattern === 'fragmented' && p.recoveryVelocity === 'fast',
  },
  {
    id: 'midday_anchor',
    label: 'Midday correction specialist',
    description: 'Your strongest alignment happens at correction points — interrupting automatic patterns before they compound.',
    match: p => p.dominantPhase === 'midday' && p.avoidanceCount < 2,
  },
  {
    id: 'overload_sensitive',
    label: 'Overload-sensitive optimizer',
    description: 'Your system responds strongly to volume. Fewer, higher-quality practices generate more signal than comprehensive plans.',
    match: p => p.frictionProfile === 'high' && p.avoidanceCount >= 3,
  },
  {
    id: 'baseline_builder',
    label: 'Baseline consistency builder',
    description: 'You are in the signal-building phase. Each aligned day adds to a foundation that will compound into momentum.',
    match: () => true, // fallback
  },
]

// ─── Data gathering ───────────────────────────────────────────────────────────

function getDailyData(checked, dayStatus, date, daysBack = 30) {
  const days = []
  const plans = safeRead('q_today_plan', {})
  for (let i = 1; i <= daysBack; i++) {
    const key = getPreviousDateKey(date, i)
    const checks = checked[key] || {}
    const plan = plans[key]
    const status = dayStatus[key]?.status || 'open'
    const totalDone = Object.values(checks).filter(Boolean).length
    const phasesDone = {}
    if (plan?.phases) {
      Object.entries(plan.phases).forEach(([phase, p]) => {
        const items = p?.items || []
        const done = items.filter(it => it?.key && checks[it.key]).length
        phasesDone[phase] = items.length > 0 ? done / items.length : null
      })
    }
    const domainDone = {}
    ;['d2','d3','d4','d5'].forEach(id => {
      domainDone[id] = Object.keys(checks).filter(k => k.startsWith(id+'_') && checks[k]).length
    })
    days.push({ key, checks, status, totalDone, phasesDone, domainDone })
  }
  return days
}

function getPhasePerformance(days) {
  const phases = { morning: { done: 0, assigned: 0 }, midday: { done: 0, assigned: 0 }, evening: { done: 0, assigned: 0 } }
  days.forEach(({ phasesDone }) => {
    Object.entries(phasesDone).forEach(([phase, rate]) => {
      if (rate === null || !phases[phase]) return
      phases[phase].assigned++
      phases[phase].done += rate
    })
  })
  return Object.entries(phases).map(([phase, { done, assigned }]) => ({
    phase,
    label: phase.charAt(0).toUpperCase() + phase.slice(1),
    rate: assigned >= 3 ? done / assigned : null,
    assigned,
  })).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
}

function getDomainEngagement(days) {
  const totals = { d2: 0, d3: 0, d4: 0, d5: 0 }
  const maxPossible = { d2: 0, d3: 0, d4: 0, d5: 0 }
  days.forEach(({ domainDone }) => {
    Object.entries(domainDone).forEach(([id, count]) => {
      if (totals[id] !== undefined) {
        totals[id] += count
        maxPossible[id] += PRACTICES[id]?.length || 1
      }
    })
  })
  return ['d2','d3','d4','d5'].map(id => ({
    id,
    name: DOMAIN_NAMES[id],
    color: DOMAIN_COLORS[id],
    total: totals[id],
    rate: maxPossible[id] > 0 ? Math.min(1, totals[id] / maxPossible[id]) : 0,
    pct: Math.min(100, Math.round((totals[id] / Math.max(maxPossible[id], 1)) * 100)),
  })).sort((a, b) => b.rate - a.rate)
}

function getStreakPattern(dayStatus, date) {
  const statuses = []
  for (let i = 1; i <= 30; i++) {
    statuses.push(dayStatus[getPreviousDateKey(date, i)]?.status || 'open')
  }
  const locked = statuses.filter(s => s === 'locked').length
  // Count streak breaks
  let breaks = 0
  let inStreak = false
  statuses.forEach(s => {
    if (s === 'locked') inStreak = true
    else if (inStreak) { breaks++; inStreak = false }
  })
  if (locked < MIN_DAYS) return 'insufficient'
  if (breaks === 0) return 'consistent'
  if (breaks <= 2) return 'mostly_consistent'
  return 'fragmented'
}

function getRecoveryVelocity(dayStatus, date) {
  // How quickly does the user re-enter after a missed day?
  const statuses = []
  for (let i = 1; i <= 30; i++) {
    statuses.push({ key: getPreviousDateKey(date, i), status: dayStatus[getPreviousDateKey(date, i)]?.status || 'open' })
  }
  const recoveryTimes = []
  for (let i = 0; i < statuses.length - 1; i++) {
    if (statuses[i].status === 'missed') {
      let daysToRecover = 0
      for (let j = i - 1; j >= 0; j--) {
        if (statuses[j].status === 'locked') break
        daysToRecover++
      }
      if (daysToRecover > 0) recoveryTimes.push(daysToRecover)
    }
  }
  if (recoveryTimes.length === 0) return 'unknown'
  const avg = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
  return avg <= 1.5 ? 'fast' : avg <= 3 ? 'moderate' : 'slow'
}

// ─── Behavioral Laws ──────────────────────────────────────────────────────────

function generateBehavioralLaws(days, phasePerf, domainEngagement, profile) {
  const laws = []

  // Law: Morning → full day completion
  const morningHighDays = days.filter(d => d.phasesDone?.morning !== null && d.phasesDone?.morning >= 0.75)
  const morningHighSuccess = morningHighDays.filter(d => d.totalDone >= 3).length
  if (morningHighDays.length >= 5) {
    const rate = Math.round((morningHighSuccess / morningHighDays.length) * 100)
    const confidence = Math.min(0.95, 0.5 + (morningHighSuccess / morningHighDays.length) * 0.5)
    if (confidence >= CONFIDENCE_THRESHOLD) {
      laws.push({
        id: 'morning_predicts_day',
        law: `When Morning completes fully, there is a ${rate}% chance of full-day alignment.`,
        implication: 'Morning is your highest-leverage window. Protect it first.',
        confidence,
        strength: rate >= 80 ? 'strong' : rate >= 65 ? 'moderate' : 'emerging',
      })
    }
  }

  // Law: Best leverage domain
  const topDomain = domainEngagement[0]
  if (topDomain && topDomain.rate >= 0.3) {
    // Check if this domain correlates with better overall days
    const daysWithTopDomain = days.filter(d => (d.domainDone[topDomain.id] || 0) > 0)
    const avgWithout = days.filter(d => (d.domainDone[topDomain.id] || 0) === 0).reduce((a, d) => a + d.totalDone, 0) / Math.max(days.filter(d => !d.domainDone[topDomain.id]).length, 1)
    const avgWith = daysWithTopDomain.reduce((a, d) => a + d.totalDone, 0) / Math.max(daysWithTopDomain.length, 1)
    const lift = avgWith - avgWithout
    if (lift >= 0.8 && daysWithTopDomain.length >= 5) {
      const liftPct = Math.round((lift / Math.max(avgWithout, 1)) * 100)
      laws.push({
        id: 'leverage_domain',
        law: `${topDomain.name} practices correlate with ${liftPct}% more total daily completion.`,
        implication: `${topDomain.name} creates downstream momentum. Lead with it when possible.`,
        confidence: 0.78,
        strength: liftPct >= 30 ? 'strong' : 'moderate',
      })
    }
  }

  // Law: Volume sensitivity (overload detection)
  const highVolumeDays = days.filter(d => d.totalDone >= 5)
  const lowVolumeDays  = days.filter(d => d.totalDone >= 2 && d.totalDone <= 4)
  if (highVolumeDays.length >= 3 && lowVolumeDays.length >= 3) {
    const nextDayAfterHigh = highVolumeDays.map(d => {
      const idx = days.findIndex(x => x.key === d.key)
      return idx > 0 ? days[idx - 1].totalDone : null
    }).filter(v => v !== null)
    const nextDayAfterLow = lowVolumeDays.map(d => {
      const idx = days.findIndex(x => x.key === d.key)
      return idx > 0 ? days[idx - 1].totalDone : null
    }).filter(v => v !== null)
    const avgAfterHigh = nextDayAfterHigh.reduce((a, b) => a + b, 0) / Math.max(nextDayAfterHigh.length, 1)
    const avgAfterLow  = nextDayAfterLow.reduce((a, b) => a + b, 0) / Math.max(nextDayAfterLow.length, 1)
    if (avgAfterLow > avgAfterHigh + 0.5 && nextDayAfterHigh.length >= 3) {
      const dropPct = Math.round(((avgAfterHigh - avgAfterLow) / Math.max(avgAfterLow, 1)) * 100)
      laws.push({
        id: 'volume_sensitivity',
        law: `Days with 5+ practices reduce next-day completion by ~${Math.abs(dropPct)}%.`,
        implication: 'Your system responds better to consistent moderate volume than occasional high volume.',
        confidence: 0.72,
        strength: Math.abs(dropPct) >= 25 ? 'strong' : 'moderate',
      })
    }
  }

  // Law: Form → Evening link (from profile)
  const formEveningLink = safeRead('q_pattern_profile', null)?.avoidance?.find(a => a.domainId === 'd2')
  if (formEveningLink) {
    const formZeroDays = days.filter(d => d.domainDone.d2 === 0)
    const poorEveningAfter = formZeroDays.filter(d => {
      const idx = days.findIndex(x => x.key === d.key)
      return idx > 0 && (days[idx-1].phasesDone?.evening ?? 1) < 0.5
    }).length
    if (formZeroDays.length >= 3) {
      const rate = Math.round((poorEveningAfter / formZeroDays.length) * 100)
      const confidence = Math.min(0.88, 0.5 + (poorEveningAfter / formZeroDays.length) * 0.5)
      if (confidence >= CONFIDENCE_THRESHOLD) {
        laws.push({
          id: 'form_evening_law',
          law: `Skipping Form practices creates poor Evening alignment ${rate}% of the time.`,
          implication: 'Form stability is the platform Evening builds on. One Form practice anchors the rest of the day.',
          confidence,
          strength: rate >= 70 ? 'strong' : 'moderate',
        })
      }
    }
  }

  // Law: Visualization / top momentum practice impact
  const topMomentum = safeRead('q_pattern_profile', null)?.momentum?.[0]
  if (topMomentum && topMomentum.rate > 0.7) {
    const practiceDays = days.filter(d => d.checks[topMomentum.key])
    const noPracticeDays = days.filter(d => !d.checks[topMomentum.key] && d.totalDone > 0)
    if (practiceDays.length >= 5 && noPracticeDays.length >= 3) {
      const avgWith    = practiceDays.reduce((a, d) => a + d.totalDone, 0) / practiceDays.length
      const avgWithout = noPracticeDays.reduce((a, d) => a + d.totalDone, 0) / noPracticeDays.length
      const liftPct = Math.round(((avgWith - avgWithout) / Math.max(avgWithout, 1)) * 100)
      if (liftPct >= 15) {
        laws.push({
          id: 'momentum_practice_law',
          law: `${topMomentum.name} increases same-day total completion by ${liftPct}%.`,
          implication: `${topMomentum.name} is your highest-carryover practice. Leading with it changes how the rest of the day unfolds.`,
          confidence: 0.80,
          strength: liftPct >= 30 ? 'strong' : 'moderate',
        })
      }
    }
  }

  return laws
    .filter(l => l.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

// ─── Optimal correction order ─────────────────────────────────────────────────

function deriveCorrectionalOrder(domainEngagement, phasePerf) {
  const profile = safeRead('q_pattern_profile', null)
  const avoidance = profile?.avoidance || []
  const momentum  = profile?.momentum  || []
  const pairs     = profile?.pairs     || []

  // Score each domain for "should come first"
  const scores = domainEngagement.map(d => {
    let score = 0
    // Higher engagement = place later (already doing well)
    score -= d.rate * 10
    // Avoidance = needs earlier attention
    const avoided = avoidance.find(a => a.domainId === d.id)
    if (avoided) score += avoided.severity === 'strong' ? 15 : 8
    // Momentum = can go later, it will complete anyway
    const hasMomentum = momentum.some(m => m.domainId === d.id)
    if (hasMomentum) score -= 5
    // Source always first
    if (d.id === 'd1') score = 999
    return { ...d, orderScore: score }
  })

  return scores.sort((a, b) => b.orderScore - a.orderScore).map(d => ({
    id: d.id, name: d.name, color: d.color,
  }))
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateCoherenceProfile(checked = {}, dayStatus = {}, domainScores = {}, onboardingProfile = null, date = new Date()) {
  const days            = getDailyData(checked, dayStatus, date)
  const phasePerf       = getPhasePerformance(days)
  const domainEngagement = getDomainEngagement(days)
  const streakPattern   = getStreakPattern(dayStatus, date)
  const recoveryVelocity = getRecoveryVelocity(dayStatus, date)
  const profile         = safeRead('q_pattern_profile', null)

  // Intermediate signals for alignment type matching
  const dominantPhase = phasePerf.find(p => p.rate !== null)?.phase || 'morning'
  const frictionProfile = (profile?.avoidance?.filter(a => a.friction >= 2) || []).length >= 2 ? 'high'
    : (profile?.avoidance?.filter(a => a.friction >= 2) || []).length === 1 ? 'medium' : 'low'
  const avoidanceCount = profile?.avoidance?.length || 0
  const momentumState = (() => {
    let streak = 0
    for (let i = 0; i < 30; i++) {
      if (dayStatus[getPreviousDateKey(date, i)]?.status === 'locked') streak++
      else break
    }
    return streak >= 3 ? 'accelerating' : streak >= 1 ? 'stable' : 'recovering'
  })()

  const typeSignals = { dominantPhase, frictionProfile, avoidanceCount, streakPattern, recoveryVelocity, momentumState }
  const alignmentType = ALIGNMENT_TYPES.find(t => t.match(typeSignals)) || ALIGNMENT_TYPES[ALIGNMENT_TYPES.length - 1]

  // Behavioral laws
  const laws = generateBehavioralLaws(days, phasePerf, domainEngagement, typeSignals)

  // Correction order
  const correctionOrder = deriveCorrectionalOrder(domainEngagement, phasePerf)

  // Coherence signature — behavioral reality bars
  const totalPracticesDone = days.reduce((a, d) => a + d.totalDone, 0)
  const signatureBars = [
    { id: 'd1', name: 'Source', color: '#7F77DD', pct: Math.min(100, Math.round((safeRead('q_onboarding', null)?.scores?.d1 || 5) * 10)) },
    ...domainEngagement.map(d => ({ id: d.id, name: d.name, color: d.color, pct: d.pct })),
  ]

  // Adaptive style
  const adaptiveStyle = {
    recoveryResponse: frictionProfile === 'high' ? 'Low-friction re-entry' : 'Direct correction',
    growthResponse: momentumState === 'accelerating' ? 'Progressive challenge' : 'Consistency first',
    failureTrigger: phasePerf.slice().reverse().find(p => p.rate !== null && p.rate < 0.4)
      ? `${phasePerf.slice().reverse().find(p => p.rate !== null && p.rate < 0.4).label} window weakness`
      : 'Extended breaks from practice',
    bestWindow: phasePerf.find(p => p.rate !== null)?.label || 'Morning',
  }

  // Count days with actual practice completions — more reliable than status field
  const daysWithPractices = days.filter(d => d.totalDone > 0).length
  const hasSufficientData = daysWithPractices >= MIN_DAYS

  return {
    generatedAt: date.toISOString(),
    hasSufficientData,
    alignmentType,
    laws,
    correctionOrder,
    signatureBars,
    adaptiveStyle,
    phasePerformance: phasePerf,
    domainEngagement,
    streakPattern,
    recoveryVelocity,
    momentumState,
    totalDaysTracked: days.filter(d => d.totalDone > 0).length,
    totalPracticesDone,
  }
}
