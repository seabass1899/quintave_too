import React, { useMemo, useState, useEffect } from 'react'
import { generateTodayPlan, PHASES } from '../today/todayEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function firstUnlockedPhase(plan) {
  return PHASES.find(p => !plan.phases[p.id]?.locked)?.id || 'morning'
}

function getResolvedPhaseId(plan, requestedPhase) {
  const requested = requestedPhase || plan.currentPhase || 'morning'
  if (!plan.phases[requested]?.locked) return requested
  return firstUnlockedPhase(plan)
}

function PhasePill({ phase, active, onClick }) {
  const done = phase.completion.completeRequired
  const req = phase.completion.required
  const locked = !!phase.locked
  return (
    <button
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={locked ? phase.lockReason : `${phase.label}: ${done}/${req} complete`}
      style={{
        border: active ? '1.5px solid #1a1a18' : bdr,
        background: locked ? '#F4F3F0' : active ? '#1a1a18' : '#fff',
        color: locked ? '#AAA' : active ? '#fff' : '#555',
        borderRadius: 999,
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: active ? 800 : 600,
        cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
      <span>{phase.label}</span>
      <span style={{ opacity: 0.8 }}>{done}/{req}</span>
      {locked && <span style={{ opacity: 0.7 }}>locked</span>}
    </button>
  )
}

function PriorityBadge({ priority }) {
  const styles = {
    Critical: { bg: '#D85A30', color: '#fff', border: '#D85A30', icon: '⚡' },
    Required: { bg: '#EEEDFE', color: '#3C3489', border: '#7F77DD40', icon: '◆' },
    Adaptive: { bg: '#E6F1FB', color: '#0C447C', border: '#378ADD40', icon: '↻' },
    Optional: { bg: '#F4F3F0', color: '#777', border: '#00000010', icon: '○' },
  }
  const s = styles[priority] || styles.Required
  return (
    <span style={{
      fontSize: 10,
      padding: priority === 'Critical' ? '3px 8px' : '2px 7px',
      borderRadius: 99,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      fontWeight: 800,
      letterSpacing: priority === 'Critical' ? '0.03em' : 0,
      textTransform: priority === 'Critical' ? 'uppercase' : 'none',
    }}>
      {s.icon} {priority}
    </span>
  )
}

function pickDomainFromScores(domainScores, type = 'strongest') {
  const entries = Object.entries(domainScores || {}).filter(([, v]) => typeof v === 'number')
  if (!entries.length) return null
  entries.sort((a, b) => type === 'strongest' ? b[1] - a[1] : a[1] - b[1])
  return entries[0][0]
}

export default function DailyFocus({ checked = {}, setChecked, domainScores = {}, onBreathwork, selectedPhaseOverride = null }) {
  const today = new Date().toDateString()
  const [selectedPhase, setSelectedPhase] = useState(selectedPhaseOverride)
  const [lastFeedback, setLastFeedback] = useState(null)

  useEffect(() => {
    if (selectedPhaseOverride) setSelectedPhase(selectedPhaseOverride)
  }, [selectedPhaseOverride])

  const plan = useMemo(() => generateTodayPlan({ domainScores, checked, phaseLocking: true }), [domainScores, checked])
  const requestedPhaseId = selectedPhase || selectedPhaseOverride || plan.currentPhase
  const activePhaseId = getResolvedPhaseId(plan, requestedPhaseId)
  const activePhase = plan.phases[activePhaseId]
  const requestedWasLocked = requestedPhaseId && requestedPhaseId !== activePhaseId && plan.phases[requestedPhaseId]?.locked

  const strongestId = pickDomainFromScores(domainScores, 'strongest')
  const weakest = plan.weakestDomain
  const strongestName = plan.phases.morning.items.find(i => i.domain.id === strongestId)?.domain?.name || 'Coherence'
  const tomorrowCorrection = weakest?.name || 'the weakest open loop'

  const handleCheck = (item) => {
    const wasChecked = !!checked?.[today]?.[item.key]
    setChecked(prev => ({
      ...prev,
      [today]: { ...(prev?.[today] || {}), [item.key]: !wasChecked }
    }))
    if (!wasChecked) {
      setLastFeedback({
        title: item.identityFeedback,
        detail: item.analyticFeedback,
        domain: item.domain,
        practice: item.name,
      })
      window.setTimeout(() => setLastFeedback(null), 4200)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: bdr, padding: '18px 20px', marginBottom: 16, boxShadow: '0 10px 26px rgba(0,0,0,0.035)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: '-0.03em' }}>Today’s Execution Loop</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Complete the operating loop. Minimum required: <strong>{plan.completionState.completeRequired}/{plan.dailyMinimum}</strong>.
          </div>
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 850,
          color: plan.completionState.dailyMinimumMet ? '#085041' : '#3C3489',
          background: plan.completionState.dailyMinimumMet ? '#E1F5EE' : '#EEEDFE',
          border: `1px solid ${plan.completionState.dailyMinimumMet ? '#1D9E7530' : '#7F77DD30'}`,
          borderRadius: 999,
          padding: '7px 11px',
          whiteSpace: 'nowrap'
        }}>
          {plan.completionState.dailyMinimumMet ? 'Daily Minimum Complete ✓' : `Daily Minimum: ${plan.completionState.completeRequired}/${plan.dailyMinimum}`}
        </div>
      </div>

      <div style={{ height: 10, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden', marginBottom: 13 }}>
        <div style={{ width: `${plan.completionState.pct}%`, height: '100%', background: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#7F77DD', transition: 'width 220ms ease' }} />
      </div>

      {requestedWasLocked && (
        <div style={{ background: '#FAECE7', color: '#712B13', border: '1px solid #D85A3030', borderRadius: 10, padding: '9px 12px', marginBottom: 11, fontSize: 12 }}>
          {plan.phases[requestedPhaseId].label} is locked. {plan.phases[requestedPhaseId].lockReason} Showing {activePhase.label} first.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {PHASES.map(p => (
          <PhasePill
            key={p.id}
            phase={plan.phases[p.id]}
            active={activePhaseId === p.id}
            onClick={() => setSelectedPhase(p.id)}
          />
        ))}
      </div>

      <div style={{
        background: activePhase.locked ? '#FAECE7' : '#F8F7F4',
        border: bdr,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: activePhase.locked ? '#D85A30' : '#555' }}>
              {activePhase.label} · {activePhase.role}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4, lineHeight: 1.45 }}>
              {activePhase.id === 'morning'
                ? `Complete ${activePhase.completion.required} Morning actions to set the day's signal.`
                : activePhase.id === 'midday'
                  ? 'Correct drift and interrupt automatic loops before the day runs you.'
                  : 'Close the loop, integrate the signal, and prime tomorrow.'}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 850, color: '#1a1a18', whiteSpace: 'nowrap' }}>
            {activePhase.completion.completeRequired}/{activePhase.completion.required}
          </div>
        </div>
      </div>

      {lastFeedback && (
        <div style={{
          borderRadius: 12,
          border: `1px solid ${lastFeedback.domain.color}35`,
          background: lastFeedback.domain.bg,
          padding: '12px 14px',
          marginBottom: 12,
          boxShadow: `0 8px 18px ${lastFeedback.domain.color}12`
        }}>
          <div style={{ fontSize: 13, fontWeight: 850, color: lastFeedback.domain.text }}>✓ {lastFeedback.title}</div>
          <div style={{ fontSize: 12, color: lastFeedback.domain.color, marginTop: 4 }}>{lastFeedback.detail}</div>
        </div>
      )}

      {activePhase.items.map(item => (
        <div key={`${activePhase.id}-${item.key}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: item.priority === 'Critical' ? '13px 0' : '11px 0',
          borderBottom: bdr,
          background: item.priority === 'Critical' && !item.isDone ? 'linear-gradient(90deg, rgba(216,90,48,0.055), transparent 60%)' : 'transparent',
          borderRadius: item.priority === 'Critical' ? 10 : 0
        }}>
          <button onClick={() => handleCheck(item)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: `1.8px solid ${item.priority === 'Critical' ? '#D85A30' : item.domain.color}`,
              background: item.isDone ? item.domain.color : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
            }}>
            {item.isDone ? '✓' : ''}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18' }}>{item.name}</span>
              <PriorityBadge priority={item.priority} />
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: item.domain.bg, color: item.domain.text }}>{item.domain.name}</span>
            </div>
            <div style={{ fontSize: 12, color: item.domain.color, marginTop: 3 }}>{item.why}</div>
            {item.isDone && <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 3 }}>✓ {item.identityFeedback}</div>}
          </div>
          {item.hasTimer && (
            <button onClick={onBreathwork}
              style={{ fontSize: 11, padding: '5px 9px', borderRadius: 8, border: `0.5px solid ${item.domain.color}40`, background: item.domain.bg, color: item.domain.text, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}>
              Start
            </button>
          )}
        </div>
      ))}

      {plan.completionState.dailyMinimumMet && (
        <div style={{ marginTop: 14, borderRadius: 14, background: '#E1F5EE', border: '1px solid #1D9E7535', padding: '14px 15px' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#085041' }}>Day Locked In ✓</div>
          <div style={{ fontSize: 13, color: '#085041', marginTop: 5, lineHeight: 1.55 }}>
            You completed the minimum operating loop. Strongest signal: <strong>{strongestName}</strong>. Tomorrow’s correction starts with <strong>{tomorrowCorrection}</strong>.
          </div>
        </div>
      )}
    </div>
  )
}
