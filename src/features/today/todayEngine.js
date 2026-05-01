import { DOMAINS, PRACTICES } from '../../data'

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

function uniqueByKey(items) {
  const seen = new Set()
  return items.filter(item => {
    if (!item || seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

function weakestDomains(domainScores = {}) {
  return [...DOMAINS]
    .sort((a, b) => (domainScores[a.id] ?? 0) - (domainScores[b.id] ?? 0))
    .map(d => d.id)
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
  // Weighted signal model: Source is the root calibrator, Code/Field carry behavior/regulation weight.
  const baseByPriority = { Critical: 4, Required: 3, Adaptive: 2, Optional: 1 }
  const domainWeight = { d1: 1.5, d2: 1.0, d3: 1.15, d4: 1.1, d5: 1.25 }
  const primary = item?.phaseDomainId || item?.domain?.id || 'd1'
  const base = baseByPriority[priority] || 1
  const impact = { [primary]: Math.round(base * (domainWeight[primary] || 1)) }

  ;(item?.cross || []).forEach(domainId => {
    const ripple = Math.max(1, Math.round(base * 0.45 * (domainWeight[domainId] || 1)))
    impact[domainId] = (impact[domainId] || 0) + ripple
  })
  return impact
}

function getIdentityFeedback(item) {
  const name = item?.name || ''
  if (name.includes('Stillness')) return 'You returned to the observer behind the noise.'
  if (name.includes('Morning Directive')) return 'You claimed the day before the day claimed you.'
  if (name.includes('Pattern Interrupt')) return 'You interrupted an automatic loop and chose differently.'
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
  const scoreImpact = getScoreImpact(item, priority)
  return {
    ...item,
    priority,
    why,
    scoreImpact,
    scoreTotal: Object.values(scoreImpact).reduce((sum, value) => sum + value, 0),
    identityFeedback: getIdentityFeedback(item),
    analyticFeedback: getAnalyticFeedback(item, scoreImpact),
  }
}

function buildPhaseItems(phase, domainScores, todayChecks, primedDomainId = null) {
  const weak = weakestDomains(domainScores)
  const pool = PHASE_POOLS[phase] || []
  const items = []

  if (phase === 'morning') {
    const primedPick = primedDomainId ? MORNING_DOMAIN_ANCHORS[primedDomainId] : null
    const weakPick = primedPick || pool.find(([domainId]) => domainId === weak[0]) || ['d1', 'Stillness Exposure']
    items.push(labelPractice(findPractice(...weakPick), 'Critical', primedPick ? 'Yesterday\'s correction anchor' : 'Weakest-domain anchor'))
    items.push(labelPractice(findPractice('d4', 'Morning Directive'), 'Required', 'Initialize the conscious director'))
    items.push(labelPractice(findPractice('d2', 'Sun + Circadian Anchor'), 'Optional', 'Stabilize Form early'))
  }

  if (phase === 'midday') {
    const morningPool = buildPhaseItems('morning', domainScores, todayChecks, primedDomainId)
    const morningDone = morningPool.filter(i => !!todayChecks[i.key]).length
    let primary = ['d2', 'Breathwork']
    let reason = 'Midday nervous-system correction'
    if (morningDone === 0) { primary = ['d1', '5 Recall Triggers']; reason = 'Recover the morning signal' }
    else if (weak[0] === 'd5') { primary = ['d5', 'Pattern Interrupt']; reason = 'Primary Code correction' }
    else if (weak[0] === 'd3') { primary = ['d3', 'Name + Locate Emotion']; reason = 'Field charge correction' }
    else if (weak[0] === 'd4') { primary = ['d4', 'Thought Audit']; reason = 'Mind drift correction' }
    items.push(labelPractice(findPractice(...primary), 'Critical', reason))
    items.push(labelPractice(findPractice('d5', 'Pattern Interrupt'), 'Adaptive', 'Interrupt reactive drift'))
    items.push(labelPractice(findPractice('d2', 'Hydration Protocol'), 'Optional', 'Maintain physical signal'))
  }

  if (phase === 'evening') {
    const undoneWeak = weak.find(domainId => {
      const allKeys = Object.keys(todayChecks).filter(k => todayChecks[k])
      return !allKeys.some(k => k.startsWith(`${domainId}_`))
    }) || weak[0]
    const byDomain = {
      d1: ['d5', 'Pre-Sleep Programming'],
      d2: ['d5', 'Pre-Sleep Programming'],
      d3: ['d3', 'Emotional Log'],
      d4: ['d4', 'Thought Audit'],
      d5: ['d5', 'Pre-Sleep Programming'],
    }
    items.push(labelPractice(findPractice(...(byDomain[undoneWeak] || ['d5', 'Pre-Sleep Programming'])), 'Critical', 'Close the day’s weakest open loop'))
    items.push(labelPractice(findPractice('d3', 'Gratitude + Reframe'), 'Optional', 'Shift the final emotional tone'))
  }

  return uniqueByKey(items).filter(Boolean)
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

export function calculateTodayStreak(dayStatus = {}, date = new Date()) {
  const todayKey = getDateKey(date)
  const todayStatus = dayStatus?.[todayKey]?.status
  if (todayStatus === 'missed') return 0

  let streak = todayStatus === 'locked' ? 1 : 0
  const startBack = todayStatus === 'locked' ? 1 : 1

  for (let i = startBack; i < 365; i++) {
    const key = getPreviousDateKey(date, i)
    if (dayStatus?.[key]?.status === 'locked') streak += 1
    else break
  }
  return streak
}

export function calculateLongestStreak(dayStatus = {}) {
  const lockedDates = Object.entries(dayStatus || {})
    .filter(([, record]) => record?.status === 'locked')
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

export function generateTodayPlan({ domainScores = {}, checked = {}, dayStatus = {}, date = new Date(), phaseLocking = true } = {}) {
  const dateKey = getDateKey(date)
  const previousDateKey = getPreviousDateKey(date, 1)
  const todayChecks = checked?.[dateKey] || {}
  const previousStatus = dayStatus?.[previousDateKey] || null
  const primedDomainId = previousStatus?.correctionDomain || null
  const currentPhase = getCurrentPhase(date)
  const phases = {}

  PHASES.forEach(p => {
    const items = buildPhaseItems(p.id, domainScores, todayChecks, primedDomainId)
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
  const weak = weakestDomains(domainScores)[0]
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
        ? 'The operating loop is incomplete. Finish the minimum before the day closes or tomorrow begins from drift.'
        : '',
    },
  }
}
