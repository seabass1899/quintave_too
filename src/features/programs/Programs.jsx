import React, { useMemo } from 'react'
import { DOMAINS, PRACTICES } from '../../data'
import { generateTodayPlan, getDateKey } from '../today/todayEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function domainById(id) {
  return DOMAINS.find(d => d.id === id) || DOMAINS[0]
}

function practiceKey(domainId, index) {
  return `${domainId}_${index}`
}

function leverageFor(practice) {
  const count = Array.isArray(practice?.cross) ? practice.cross.length : 0
  return {
    high: count >= 2,
    count,
    label: count >= 2 ? `High leverage · affects ${count + 1} domains` : 'Single-domain support',
  }
}

function classifyPractice(domainId, practice) {
  const name = practice.name || ''
  if (['Stillness Exposure','Breathwork','Pattern Interrupt','Morning Directive','Pre-Sleep Programming','Affirmation Installation','Visualization Practice','Name + Locate Emotion'].some(x => name.includes(x))) return 'Conditional Critical'
  if (practice.cross?.length >= 2) return 'High-Leverage Support'
  return 'Support Practice'
}

function selectionRule(domainId, practice) {
  const name = practice.name || ''
  if (name.includes('Stillness')) return 'Selected when Source access needs anchoring or mental noise is destabilizing the day.'
  if (name.includes('Morning Directive')) return 'Selected to initialize conscious direction before the day pulls attention outward.'
  if (name.includes('Visualization')) return 'Selected when Mind or Code needs directed rehearsal before action.'
  if (name.includes('Affirmation')) return 'Selected when Code requires a stronger identity signal.'
  if (name.includes('Pattern Interrupt')) return 'Selected when automatic behavior loops are the primary correction point.'
  if (name.includes('Breath')) return 'Selected when Form or Field needs nervous-system regulation.'
  if (name.includes('Emotion')) return 'Selected when Field charge needs to be named, located, and processed.'
  if (name.includes('Pre-Sleep')) return 'Selected to close the day and seed the next cycle before sleep.'
  return `${domainById(domainId).name} support practice used when this domain needs reinforcement.`
}

function effectText(domainId, practice) {
  const cross = (practice.cross || []).map(domainById).map(d => d.name)
  const domain = domainById(domainId)
  if (cross.length) return `Primary effect: ${domain.name}. Ripple effect: ${cross.join(', ')}.`
  return `Primary effect: ${domain.name}. Minimal cross-domain ripple.`
}

function DomainBadge({ domain }) {
  return <span style={{ fontSize: 10, fontWeight: 850, borderRadius: 999, padding: '3px 7px', background: domain.bg, color: domain.text }}>{domain.name}</span>
}

function PriorityBadge({ label }) {
  const critical = /critical/i.test(label)
  const high = /high/i.test(label)
  return <span style={{ fontSize: 10, fontWeight: 900, borderRadius: 999, padding: '3px 7px', background: critical ? '#FAECE7' : high ? '#FFF3E0' : '#F4F3F0', color: critical ? '#712B13' : high ? '#E65100' : '#666', border: critical ? '1px solid #D85A3030' : high ? '1px solid #FFB74D55' : bdr }}>{label}</span>
}

function ProgramCard({ item, activeToday = false, activeMeta = null }) {
  const impactDomains = [item.domain, ...(item.practice.cross || []).map(domainById)]
  return (
    <div style={{ background: '#fff', border: activeToday ? `1.5px solid ${item.domain.color}50` : bdr, borderRadius: 14, padding: '14px 16px', boxShadow: activeToday ? `0 10px 24px ${item.domain.color}10` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 950, letterSpacing: '-0.02em' }}>{item.practice.name}</div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PriorityBadge label={activeMeta?.priority || item.classification} />
            {item.leverage.high && <PriorityBadge label="High leverage" />}
            {impactDomains.map(d => <DomainBadge key={`${item.key}-${d.id}`} domain={d} />)}
          </div>
        </div>
        {activeToday && <div style={{ fontSize: 11, fontWeight: 950, color: item.domain.text, background: item.domain.bg, borderRadius: 999, padding: '6px 9px', whiteSpace: 'nowrap' }}>Active today ✓</div>}
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {activeMeta && <div style={{ fontSize: 12, color: item.domain.text, fontWeight: 850 }}>Why selected today: {activeMeta.why}</div>}
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.55 }}><strong>System uses this when:</strong> {item.rule}</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.55 }}><strong>Effect:</strong> {item.effect}</div>
        <div style={{ fontSize: 11, color: item.leverage.high ? '#BA7517' : '#888', fontWeight: item.leverage.high ? 850 : 650 }}>{item.leverage.label}</div>
      </div>
    </div>
  )
}

export default function Programs({ checked = {}, domainScores = {} }) {
  const today = getDateKey(new Date())
  const dayStatus = readLS('q_day_status', {})
  const todayPlans = readLS('q_today_plan', {})
  const plan = useMemo(() => generateTodayPlan({
    domainScores,
    checked,
    dayStatus,
    phaseLocking: true,
    planSnapshot: todayPlans?.[today],
  }), [domainScores, checked, dayStatus, todayPlans, today])

  const activeItems = Object.values(plan?.phases || {}).flatMap(phase => phase.items || [])
  const activeByKey = activeItems.reduce((acc, item) => {
    acc[item.key] = { priority: item.priority, why: item.why, phase: item.phase || null }
    return acc
  }, {})

  const library = DOMAINS.flatMap(domain => (PRACTICES[domain.id] || []).map((practice, index) => ({
    key: practiceKey(domain.id, index),
    domain,
    practice,
    leverage: leverageFor(practice),
    classification: classifyPractice(domain.id, practice),
    rule: selectionRule(domain.id, practice),
    effect: effectText(domain.id, practice),
  })))

  const sortedLibrary = [...library].sort((a, b) => {
    const activeDiff = (activeByKey[b.key] ? 1 : 0) - (activeByKey[a.key] ? 1 : 0)
    if (activeDiff) return activeDiff
    const leverageDiff = (b.leverage.high ? 1 : 0) - (a.leverage.high ? 1 : 0)
    if (leverageDiff) return leverageDiff
    return a.domain.id.localeCompare(b.domain.id)
  })

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', border: bdr, borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Programs</div>
        <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-0.04em', marginTop: 4 }}>System Intelligence Layer</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: 6, maxWidth: 760 }}>
          Programs are read-only intervention models. The system selects from this library based on domain state, leverage, phase timing, and today’s correction path. You execute the selected alignment; you do not manually steer the engine from here.
        </div>
      </div>

      <div style={{ background: '#FCFBF8', border: bdr, borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>Active Today</div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 3 }}>These are the interventions currently prescribed by the Today Engine.</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#3C3489', background: '#EEEDFE', borderRadius: 999, padding: '6px 10px' }}>{activeItems.length} active</div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {activeItems.map(item => {
            const [domainId, idx] = item.key.split('_')
            const practice = PRACTICES[domainId]?.[Number(idx)] || item
            const domain = domainById(domainId)
            const libItem = { key: item.key, domain, practice, leverage: leverageFor(practice), classification: item.priority, rule: selectionRule(domainId, practice), effect: effectText(domainId, practice) }
            return <ProgramCard key={`active-${item.key}`} item={libItem} activeToday activeMeta={{ priority: item.priority, why: item.why }} />
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: bdr, borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 4 }}>Program Library</div>
        <div style={{ fontSize: 12, color: '#777', marginBottom: 14 }}>Read-only reference. These cards explain what each program does and when the system uses it.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {sortedLibrary.map(item => <ProgramCard key={item.key} item={item} activeToday={!!activeByKey[item.key]} activeMeta={activeByKey[item.key]} />)}
        </div>
      </div>
    </div>
  )
}
