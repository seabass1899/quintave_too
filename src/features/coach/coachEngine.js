/**
 * coachEngine.js
 * src/features/coach/coachEngine.js
 *
 * Sprint 8: Dynamic Coach Layer
 *
 * Generates a dynamic daily coach voice based on actual system state —
 * not static tips. Three modes:
 *   getDailyCoachMessage()   — the primary coach card (replaces static tuning focus)
 *   getPatternBreakMessage() — celebrates when a behavioral loop is interrupted
 *   getTomorrowCoachMessage()— forward-looking sentence based on today's completion
 *
 * Rules:
 * - Never generic. Every message references actual system state.
 * - Never punitive. Coaching frames difficulty as signal, not failure.
 * - Never verbose. 2-3 sentences maximum per message.
 * - Tone shifts with state: warm in recovery, direct in momentum, measured in stability.
 */

import { getPreviousDateKey } from '../../shared/dateUtils'
// behavioralIntelligenceEngine signals come through plan.behavioralIntel

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}

// ─── State classification ─────────────────────────────────────────────────────

function classifyWeekState(dayStatus, date) {
  let locked = 0, missed = 0
  for (let i = 0; i < 7; i++) {
    const key = getPreviousDateKey(date, i)
    const s = dayStatus?.[key]?.status
    if (s === 'locked') locked++
    else if (s === 'missed') missed++
  }
  if (locked >= 5) return 'strong'
  if (locked >= 3) return 'building'
  if (locked >= 1) return 'early'
  return 'reset'
}

function classifyStreakState(streak) {
  if (streak >= 7) return 'compounding'
  if (streak >= 3) return 'building'
  if (streak >= 1) return 'active'
  return 'reset'
}

function classifyCompletionState(plan) {
  const pct = plan?.completionState?.pct || 0
  const met = plan?.completionState?.dailyMinimumMet
  if (met) return 'complete'
  if (pct >= 50) return 'halfway'
  if (pct > 0) return 'started'
  return 'not_started'
}

// ─── Daily Coach Message ──────────────────────────────────────────────────────

/**
 * The primary coach card — dynamic voice based on system state.
 * Replaces the static domain-based coaching tip.
 *
 * Returns: { headline, body, action, tone }
 * tone: 'warm' | 'direct' | 'measured' | 'celebratory'
 */
export function getDailyCoachMessage(plan, dayStatus, domainScores, date = new Date()) {
  const streak       = plan?.streak?.current || 0
  const adaptations  = plan?.adaptations || []
  const decision     = plan?.decision
  const ai           = plan?.adaptiveIntelligence
  const weekState    = classifyWeekState(dayStatus, date)
  const streakState  = classifyStreakState(streak)
  const completion   = classifyCompletionState(plan)
  const phase        = plan?.currentPhase || 'morning'
  const strategy     = decision?.strategy || ''
  const behaviorMode = decision?.behaviorMode || ''
  const primaryBody  = decision?.primaryBlockerId
  const bodyNames    = { d1:'Source', d2:'Form', d3:'Field', d4:'Mind', d5:'Code' }
  const primary      = bodyNames[primaryBody] || 'the system'

  // ── Recovery arc coaching (Sprint 10) ────────────────────────────────────
  // Uses behavioralIntelligenceEngine signals for more precise arc-aware coaching
  const bi = plan?.behavioralIntel
  const recoveryArc = bi?.recoveryArc

  // Sudden drop — external disruption detected
  if (recoveryArc?.type === 'sudden_drop') {
    return {
      headline: `A disruption was detected — not a failure.`,
      body: `The pattern shows a strong aligned period followed by a sudden stop. This is an external disruption pattern, not motivation failure. The system does not need catching up — it needs re-entry.`,
      action: `Complete one practice today. That is the entire goal. The streak rebuilds from here.`,
      tone: 'warm',
      source: 'sudden_drop_arc',
    }
  }

  // Gradual fade — friction accumulation
  if (recoveryArc?.type === 'gradual_fade') {
    return {
      headline: `Friction has been building gradually.`,
      body: `Completion has declined slowly over the past week. This is not a motivation problem — the plan has become subtly harder than available energy. The engine is adjusting accordingly.`,
      action: `Focus on the lowest-friction practice first. Completion restores momentum more than intensity.`,
      tone: 'warm',
      source: 'gradual_fade_arc',
    }
  }

  // Volatile pattern — schedule instability
  if (recoveryArc?.type === 'volatile') {
    return {
      headline: `The pattern needs an anchor.`,
      body: `Completion alternates between aligned and missed days without stabilizing. This suggests schedule or environment variability. One fixed daily practice — regardless of everything else — creates the stability the system can build on.`,
      action: `Choose one practice as non-negotiable today. Everything else is optional.`,
      tone: 'direct',
      source: 'volatile_arc',
    }
  }

  // Upstream domain risk — address cause, not symptom
  const upstreamRisk = adaptations.find(a => a.type === 'upstream_risk')
  if (upstreamRisk && upstreamRisk.severity === 'high') {
    const sourceNames = { d1:'Source', d2:'Form', d3:'Field', d4:'Mind', d5:'Code' }
    const sourceName = sourceNames[upstreamRisk.sourceId] || 'an upstream body'
    const targetName = sourceNames[upstreamRisk.targetId] || 'a downstream body'
    return {
      headline: `${sourceName} is driving the ${targetName} drift.`,
      body: `The system detected a causal pattern: ${sourceName} depletion is generating interference in ${targetName}. Correcting ${targetName} directly will not hold — the source needs to be addressed first.`,
      action: `Prioritize the ${sourceName} practice today. It resolves the cause, not just the symptom.`,
      tone: 'measured',
      source: 'upstream_risk',
    }
  }

  // Load reduction fired — special recovery message
  const loadReduced = adaptations.find(a => a.type === 'load_reduced')
  if (loadReduced) {
    return {
      headline: `Today's load was reduced.`,
      body: `The engine detected that ${loadReduced.phase} completion has been consistently low. One practice today builds more signal than a full plan you won't complete.`,
      action: `Complete the ${loadReduced.phase} minimum — that's the entire goal today.`,
      tone: 'warm',
      source: 'load_reduction',
    }
  }

  // Avoidance pattern adapted
  const deprioritized = adaptations.find(a => a.type === 'deprioritized')
  if (deprioritized && ai?.isAdapted) {
    return {
      headline: `The plan was adapted for your patterns.`,
      body: `${deprioritized.practiceName} was deprioritized — it's been skipped ${deprioritized.skipRate}% of the time it was assigned. A lower-friction path to the same signal was selected instead.`,
      action: `The engine is learning your resistance points. Follow the adapted plan today.`,
      tone: 'measured',
      source: 'avoidance_adaptation',
    }
  }

  // Strong momentum — accelerating
  if (streakState === 'compounding' && weekState === 'strong') {
    return {
      headline: `${streak}-day streak. The signal is compounding.`,
      body: `This is the phase where consistency stops being effort and starts becoming identity. Do not increase complexity — repeat what is working.`,
      action: `Protect the streak. ${primary} is your anchor today.`,
      tone: 'celebratory',
      source: 'compounding_momentum',
    }
  }

  // Building momentum
  if (streakState === 'building' && weekState !== 'reset') {
    return {
      headline: `Momentum is stabilizing.`,
      body: `${streak} aligned days in a row. The system is beginning to compound. Do not add complexity — the consistency itself is the signal.`,
      action: `Complete today's minimum. That's the only move that matters right now.`,
      tone: 'direct',
      source: 'building_momentum',
    }
  }

  // Recovery mode — strategy is recovery first
  if (strategy === 'recovery_first' || behaviorMode === 'lower_friction') {
    return {
      headline: `Today is a recovery day.`,
      body: `${primary} needs stabilization before expansion. The engine selected lower-friction practices — not because the system is failing, but because recovery is the correct move.`,
      action: `One completed practice today changes tomorrow\'s baseline. Begin with what is easiest.`,
      tone: 'warm',
      source: 'recovery_mode',
    }
  }

  // Collapse / rebuild phase
  if (decision?.phaseSummary?.phase === 'collapse_rebuild' || strategy === 'elevate_red_zone_body') {
    return {
      headline: `The system is rebuilding.`,
      body: `You are not unstable — the system is clearing interference before expanding. This phase has a ceiling: get through it with consistency and expansion follows automatically.`,
      action: `${primary} is the correction point. Start there and let the rest follow.`,
      tone: 'warm',
      source: 'collapse_rebuild',
    }
  }

  // Reset state — no streak, low week
  if (streakState === 'reset' && weekState === 'reset') {
    return {
      headline: `Re-entry is the only priority.`,
      body: `The streak reset. That is information, not failure. The system does not punish gaps — it responds to what happens next.`,
      action: `Complete one practice today. Not four. One. That starts the signal.`,
      tone: 'warm',
      source: 'reset_reentry',
    }
  }

  // Early streak — first few days
  if (streakState === 'active' && streak <= 2) {
    return {
      headline: `The signal is forming.`,
      body: `Day ${streak + 1} of building consistency. The pattern learning engine needs 5+ aligned days to detect your behavioral laws. You are building the foundation it reads from.`,
      action: `Complete today\'s minimum. Every aligned day teaches the system something real about you.`,
      tone: 'measured',
      source: 'early_streak',
    }
  }

  // Midday correction
  if (phase === 'midday') {
    return {
      headline: `Midday is the correction window.`,
      body: `This is where automatic patterns get interrupted before they compound. One conscious action here changes the trajectory of the rest of the day.`,
      action: `${primary} is drifting. Correct it now before the day runs on autopilot.`,
      tone: 'direct',
      source: 'midday_correction',
    }
  }

  // Evening integration
  if (phase === 'evening') {
    return {
      headline: `Evening primes tomorrow.`,
      body: `What you complete tonight determines tomorrow's starting coherence. Integration here is not optional — it is the mechanism by which today's signal carries forward.`,
      action: `Complete the evening practice. It compounds into tomorrow.`,
      tone: 'measured',
      source: 'evening_integration',
    }
  }

  // Stable / advancing
  if (weekState === 'building' || weekState === 'strong') {
    return {
      headline: `The system is holding.`,
      body: `${primary} is the focus today. Stability at this level means the foundation is forming — not that the work is done.`,
      action: `Add one degree of depth to one practice this week. The consistency earned that.`,
      tone: 'measured',
      source: 'stable_advancing',
    }
  }

  // Default fallback
  return {
    headline: `Today\'s alignment begins here.`,
    body: `${primary} is today's correction point. The practices selected are specific to your current state — not generic recommendations.`,
    action: `Complete the minimum. Signal compounds through repetition, not intensity.`,
    tone: 'measured',
    source: 'default',
  }
}

// ─── Pattern Break Message ────────────────────────────────────────────────────

/**
 * Surfaces when a behavioral loop was interrupted.
 * Returns null if no pattern breaks detected.
 */
export function getPatternBreakMessage(plan) {
  const breaks = plan?.patternBreaks || []
  if (breaks.length === 0) return null

  const top = breaks.sort((a, b) => b.strength === 'strong' ? 1 : -1)[0]

  if (top.type === 'streak_recovery') {
    return {
      headline: `◈ Alignment restored.`,
      body: top.message,
      tone: 'celebratory',
    }
  }

  if (top.type === 'avoidance_break') {
    return {
      headline: `◈ Resistance overcome.`,
      body: top.message,
      tone: 'celebratory',
    }
  }

  return {
    headline: `◈ Pattern interrupted.`,
    body: top.message,
    tone: 'celebratory',
  }
}

// ─── Tomorrow Coach Message ───────────────────────────────────────────────────

/**
 * Forward-looking sentence based on today's actual completion.
 * Replaces generic "highest leverage move" with conversational coaching.
 */
export function getTomorrowCoachMessage(plan, dayStatus, date = new Date()) {
  if (!plan) return null

  const met       = plan?.completionState?.dailyMinimumMet
  const streak    = plan?.streak?.current || 0
  const tomorrow  = plan?.tomorrowPrime
  const ai        = plan?.adaptiveIntelligence
  const bodyNames = { d1:'Source', d2:'Form', d3:'Field', d4:'Mind', d5:'Code' }

  // Day completed
  if (met) {
    const tomorrowBody = tomorrow?.domain || null
    const bodyName = bodyNames[tomorrowBody] || null

    if (streak >= 6) {
      return `Day ${streak + 1} tomorrow. The pattern is no longer random — it is becoming structural. ${bodyName ? `Begin with ${bodyName}.` : ''}`
    }
    if (streak >= 3) {
      return `${streak + 1} aligned days builds measurable momentum. ${bodyName ? `Tomorrow's entry point: ${bodyName}.` : 'The signal is compounding.'}`
    }
    if (ai?.topMomentumPractice) {
      return `Lead tomorrow with ${ai.topMomentumPractice} — your most reliable practice. The rest of the day follows from there.`
    }
    return `Today's signal carries into tomorrow. ${bodyName ? `${bodyName} is the next correction point.` : 'Begin with the Source anchor.'}`
  }

  // Day incomplete
  const pct = plan?.completionState?.pct || 0
  if (pct >= 50) {
    return `Half the minimum complete. Finishing tonight means tomorrow starts from signal, not noise.`
  }
  if (pct > 0) {
    return `One practice completed. The signal has been initiated — one more anchors it.`
  }
  return `The day is still open. One practice changes tomorrow's starting coherence.`
}

// ─── Causal Narrative Coach ───────────────────────────────────────────────────

/**
 * getCausalNarrativeMessage()
 *
 * Generates a multi-day causal narrative that explains WHY the plan
 * looks the way it does — connecting past behavioral patterns to
 * present decisions. This is the "the system understands me" moment.
 *
 * Returns: { headline, narrative, implication, timeframe, confidence } | null
 *
 * Only fires when there is enough signal to be specific and accurate.
 * Never generates generic statements — if the data isn't there, returns null.
 */
export function getCausalNarrativeMessage(plan, patternProfile, checked = {}, dayStatus = {}, date = new Date()) {
  if (!plan || !patternProfile) return null

  const bi          = plan?.behavioralIntel
  const adaptations = plan?.adaptations || []
  const decision    = plan?.decision
  const bodyNames   = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
  const bodyDesc    = {
    d1: 'your reference field',
    d2: 'your physical foundation',
    d3: 'your emotional processing',
    d4: 'your cognitive direction',
    d5: 'your behavioral patterns',
  }

  // ── Narrative 1: Upstream domain causing downstream drift ────────────────
  // "Form has been low for 4 days → Field is now drifting as a result"
  const upstreamRisk = bi?.domainRisks?.find(r => r.severity === 'high' || r.severity === 'moderate')
  if (upstreamRisk && upstreamRisk.daysLow >= 2) {
    const sourceName = bodyNames[upstreamRisk.sourceId] || 'an upstream body'
    const targetName = bodyNames[upstreamRisk.targetId] || 'a downstream body'
    const sourceDesc = bodyDesc[upstreamRisk.sourceId] || ''
    const daysText   = upstreamRisk.daysLow === 1 ? 'yesterday' : `${upstreamRisk.daysLow} days`

    return {
      headline: `${sourceName} has been low for ${daysText} — ${targetName} is responding.`,
      narrative: `${upstreamRisk.mechanism} This is not two separate problems — it is one pattern with two visible effects.`,
      implication: `The engine is prioritizing ${sourceName} (${sourceDesc}) because correcting ${targetName} directly will not hold while its upstream source remains depleted.`,
      timeframe: `Expect ${targetName} to stabilize within ${upstreamRisk.lag + 1}–${upstreamRisk.lag + 3} days of consistent ${sourceName} practice.`,
      confidence: upstreamRisk.riskScore / 100,
      type: 'upstream_cascade',
      primaryBody: upstreamRisk.sourceId,
    }
  }

  // ── Narrative 2: Sustained avoidance creating systemic drag ─────────────
  // "Emotional Log has been skipped 5 of 7 assignments → Field is carrying charge"
  const strongAvoidance = patternProfile?.avoidance?.filter(a => a.severity === 'strong') || []
  if (strongAvoidance.length >= 1) {
    const top = strongAvoidance[0]
    const domainName = bodyNames[top.domainId] || 'a frequency body'
    const skipPct    = Math.round((1 - top.rate) * 100)
    const skipCount  = top.skipped || 0

    if (skipCount >= 3) {
      return {
        headline: `${top.name} has been consistently avoided — ${domainName} is running without it.`,
        narrative: `${top.name} has been skipped ${skipPct}% of the time it was assigned. Over ${skipCount} skips, ${domainName} has been operating without this correction. The signal gap is accumulating.`,
        implication: `The engine has already reduced the frequency of ${top.name} and substituted a lower-friction alternative. If avoidance continues, ${domainName} practices will be restructured around what you will actually do.`,
        timeframe: `Three consistent completions of the substitute practice will begin restoring ${domainName} signal.`,
        confidence: Math.min(0.92, 0.65 + skipCount * 0.03),
        type: 'sustained_avoidance',
        primaryBody: top.domainId,
      }
    }
  }

  // ── Narrative 3: Recovery arc — explaining the shape of the decline ──────
  // "This is not random — the pattern shows friction accumulation over 8 days"
  const arc = bi?.recoveryArc
  if (arc?.type === 'gradual_fade' && arc.fadePct >= 20) {
    const primary = decision?.primaryBlockerId
    const primaryName = bodyNames[primary] || 'the system'

    return {
      headline: `Completion has been declining gradually — not suddenly.`,
      narrative: `Over the past week, practice completion dropped by ~${arc.fadePct}% without any outright missed days. This is the signature of friction accumulation — the plan became subtly harder than available energy over time, not all at once.`,
      implication: `This pattern is different from external disruption. It responds to load reduction and substitution — not motivation. The engine has already adjusted: ${primaryName} practices are now lower-friction than last week.`,
      timeframe: `Friction-based declines typically reverse within 5–7 days when load is reduced. The engine has made that adjustment automatically.`,
      confidence: 0.78,
      type: 'gradual_fade_narrative',
      primaryBody: primary,
    }
  }

  if (arc?.type === 'sudden_drop' && arc.peakStreak >= 3) {
    return {
      headline: `A strong aligned period was interrupted — the system remembers it.`,
      narrative: `You had ${arc.peakStreak} consecutive aligned days before the stop. That pattern is stored in the behavioral engine. The interruption reads as external disruption, not pattern collapse — the baseline was real.`,
      implication: `Re-entry from a genuine disruption is faster than building from zero because the behavioral memory is intact. The engine is treating this as reconnection, not restart.`,
      timeframe: `Expect to return to your previous completion rate within 3–5 aligned days. The momentum is easier to restore than it was to build.`,
      confidence: 0.75,
      type: 'sudden_drop_narrative',
      primaryBody: decision?.primaryBlockerId,
    }
  }

  // ── Narrative 4: Co-completion pattern driving today's plan ─────────────
  // "Breathwork and Morning Directive are completed together 78% of the time"
  const topPair = patternProfile?.pairs?.[0]
  if (topPair && topPair.coRate >= 0.70) {
    const [nameA, nameB] = topPair.names || []
    if (nameA && nameB) {
      return {
        headline: `${nameA} and ${nameB} work together — the engine is building on that.`,
        narrative: `These two practices are completed together ${Math.round(topPair.coRate * 100)}% of the time in your history. The engine detected this behavioral law and has structured today's plan to preserve the pair.`,
        implication: `When these two practices appear together, completion of both is significantly more likely than either alone. Separating them across phases would reduce the probability of both getting done.`,
        timeframe: null,
        confidence: Math.min(0.90, topPair.coRate),
        type: 'copair_narrative',
        primaryBody: null,
      }
    }
  }

  // ── Narrative 5: Phase performance driving timing decisions ─────────────
  // "Morning is your 90% window — the engine routes critical practices there"
  const phasePerf = patternProfile?.phasePerformance || []
  const bestPhase = phasePerf.sort((a, b) => (b.rate || 0) - (a.rate || 0))[0]
  const worstPhase = phasePerf.sort((a, b) => (a.rate || 0) - (b.rate || 0))[0]

  if (bestPhase && worstPhase && bestPhase.phase !== worstPhase.phase) {
    const gap = ((bestPhase.rate || 0) - (worstPhase.rate || 0)) * 100
    if (gap >= 30) {
      const primaryBody = decision?.primaryBlockerId
      const primaryName = bodyNames[primaryBody] || 'critical'

      return {
        headline: `${bestPhase.label || bestPhase.phase} is your strongest window — the engine routes accordingly.`,
        narrative: `${bestPhase.label || bestPhase.phase} completion runs at ${Math.round((bestPhase.rate || 0) * 100)}% vs ${Math.round((worstPhase.rate || 0) * 100)}% in ${worstPhase.label || worstPhase.phase} — a ${Math.round(gap)}-point gap. This is a consistent behavioral pattern, not random variation.`,
        implication: `The engine places ${primaryName} practices in ${bestPhase.label || bestPhase.phase} because that is when your completion probability is highest. ${worstPhase.label || worstPhase.phase} receives lower-friction or optional work.`,
        timeframe: null,
        confidence: Math.min(0.88, 0.60 + gap / 100),
        type: 'phase_routing_narrative',
        primaryBody,
      }
    }
  }

  // ── Narrative 6: Momentum compounding explanation ────────────────────────
  // "You are in a compounding phase — here is what the data shows"
  const streak = plan?.streak?.current || 0
  const topMomentum = patternProfile?.momentum?.[0]
  if (streak >= 5 && topMomentum) {
    return {
      headline: `${streak} aligned days — the signal is compounding structurally.`,
      narrative: `${topMomentum.name} has a ${Math.round(Math.min(100, (topMomentum.rate || 0.8) * 100))}% completion rate in your history and is actively reinforcing today's plan. At ${streak} days, consistency is transitioning from effort into behavioral identity.`,
      implication: `The engine is holding the current structure rather than increasing complexity. Compounding phases are disrupted more easily by adding practices than by maintaining them. Stability is the strategy.`,
      timeframe: `At 7+ aligned days the engine may introduce one depth practice if velocity holds. Until then: repeat what is working.`,
      confidence: Math.min(0.92, 0.70 + streak * 0.02),
      type: 'momentum_compounding',
      primaryBody: topMomentum.domainId,
    }
  }

  return null
}
