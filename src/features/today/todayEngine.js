import { DOMAINS, PRACTICES } from '../../data'

export const PHASES = [
  { id: 'morning', label: 'Morning', role: 'Initialize', required: 2, proceedMinimum: 1, unlockHour: 0 },
  { id: 'midday', label: 'Midday', role: 'Correct', required: 1, proceedMinimum: 1, unlockHour: 11 },
  { id: 'evening', label: 'Evening', role: 'Integrate', required: 1, proceedMinimum: 1, unlockHour: 17 },
]

export const DAILY_MINIMUM = 4

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
  const baseByPriority = { Critical: 3, Required: 2, Adaptive: 1, Optional: 1 }
  const primary = item?.phaseDomainId || item?.domain?.id || 'd1'
  const impact = { [primary]: baseByPriority[priority] || 1 }
  ;(item?.cross || []).forEach(domainId => {
    impact[domainId] = (impact[domainId] || 0) + 1
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

function buildPhaseItems(phase, domainScores, todayChecks) {
  const weak = weakestDomains(domainScores)
  const pool = PHASE_POOLS[phase] || []
  const items = []

  if (phase === 'morning') {
    const weakPick = pool.find(([domainId]) => domainId === weak[0]) || ['d1', 'Stillness Exposure']
    items.push(labelPractice(findPractice(...weakPick), 'Critical', 'Weakest-domain anchor'))
    items.push(labelPractice(findPractice('d4', 'Morning Directive'), 'Required', 'Initialize the conscious director'))
    items.push(labelPractice(findPractice('d2', 'Sun + Circadian Anchor'), 'Optional', 'Stabilize Form early'))
  }

  if (phase === 'midday') {
    const morningPool = buildPhaseItems('morning', domainScores, todayChecks)
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

export function generateTodayPlan({ domainScores = {}, checked = {}, date = new Date(), phaseLocking = true } = {}) {
  const dateKey = date.toDateString()
  const todayChecks = checked?.[dateKey] || {}
  const currentPhase = getCurrentPhase(date)
  const phases = {}

  PHASES.forEach(p => {
    const items = buildPhaseItems(p.id, domainScores, todayChecks)
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

  return {
    dailyMinimum: DAILY_MINIMUM,
    currentPhase,
    weakestDomain: domainById(weak),
    phases,
    impactSummary,
    completionState: {
      completeRequired,
      totalRequired: requiredItems.length,
      totalComplete,
      dailyMinimumMet: completeRequired >= DAILY_MINIMUM,
      pct: Math.min(100, Math.round((completeRequired / DAILY_MINIMUM) * 100)),
    },
  }
}
