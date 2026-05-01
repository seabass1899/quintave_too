import React, { useMemo, useState, useEffect } from 'react'
import { generateTodayPlan, PHASES } from '../today/todayEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function PhasePill({ phase, active, onClick }) {
  const done = phase.completion.completeRequired
  const req = phase.completion.required
  return (
    <button onClick={onClick}
      style={{
        border: active ? '1.5px solid #1a1a18' : bdr,
        background: active ? '#1a1a18' : '#fff',
        color: active ? '#fff' : '#555',
        borderRadius: 999,
        padding: '7px 11px',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
      <span>{phase.label}</span>
      <span style={{ opacity: 0.75 }}>{done}/{req}</span>
      {phase.locked && <span style={{ opacity: 0.6 }}>locked</span>}
    </button>
  )
}

function PriorityBadge({ priority }) {
  const colors = {
    Critical: ['#FAECE7', '#D85A30'],
    Required: ['#EEEDFE', '#7F77DD'],
    Adaptive: ['#E6F1FB', '#378ADD'],
    Optional: ['#F4F3F0', '#777'],
  }
  const [bg, color] = colors[priority] || colors.Required
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: bg, color, fontWeight: 700 }}>{priority}</span>
}

export default function DailyFocus({ checked = {}, setChecked, domainScores = {}, onBreathwork, selectedPhaseOverride = null }) {
  const today = new Date().toDateString()
  const [selectedPhase, setSelectedPhase] = useState(selectedPhaseOverride)
  const [lastFeedback, setLastFeedback] = useState(null)

  useEffect(() => {
    if (selectedPhaseOverride) setSelectedPhase(selectedPhaseOverride)
  }, [selectedPhaseOverride])

  const plan = useMemo(() => generateTodayPlan({ domainScores, checked, phaseLocking: true }), [domainScores, checked])
  const activePhaseId = selectedPhase || plan.currentPhase
  const activePhase = plan.phases[activePhaseId]

  const handleCheck = (item) => {
    if (activePhase.locked && !item.isDone) return
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
      })
      window.setTimeout(() => setLastFeedback(null), 3800)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Today’s Execution Loop</div>
          <div style={{ fontSize: 12, color: '#777', marginTop: 3 }}>
            Daily minimum: {plan.completionState.completeRequired}/{plan.dailyMinimum} required actions complete.
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#888', whiteSpace: 'nowrap' }}>
          {plan.completionState.dailyMinimumMet ? 'Day locked in ✓' : `${plan.completionState.pct}% minimum`}
        </div>
      </div>

      <div style={{ height: 8, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${plan.completionState.pct}%`, height: '100%', background: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#7F77DD', transition: 'width 180ms ease' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        {PHASES.map(p => <PhasePill key={p.id} phase={plan.phases[p.id]} active={activePhaseId === p.id} onClick={() => setSelectedPhase(p.id)} />)}
      </div>

      <div style={{ background: activePhase.locked ? '#FAECE7' : '#F8F7F4', border: bdr, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: activePhase.locked ? '#D85A30' : '#555' }}>
              {activePhase.label} · {activePhase.role}
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 3 }}>
              {activePhase.locked ? activePhase.lockReason : activePhase.id === 'morning' ? 'Initialize identity, direction, and signal.' : activePhase.id === 'midday' ? 'Correct drift and interrupt automatic loops.' : 'Close the loop and integrate before sleep.'}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>{activePhase.completion.completeRequired}/{activePhase.completion.required}</div>
        </div>
      </div>

      {lastFeedback && (
        <div style={{ borderRadius: 10, border: `1px solid ${lastFeedback.domain.color}30`, background: lastFeedback.domain.bg, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: lastFeedback.domain.text }}>{lastFeedback.title}</div>
          <div style={{ fontSize: 11, color: lastFeedback.domain.color, marginTop: 3 }}>{lastFeedback.detail}</div>
        </div>
      )}

      {activePhase.items.map(item => (
        <div key={`${activePhase.id}-${item.key}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: bdr, opacity: activePhase.locked && !item.isDone ? 0.45 : 1 }}>
          <button onClick={() => handleCheck(item)} disabled={activePhase.locked && !item.isDone}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${item.domain.color}`,
              background: item.isDone ? item.domain.color : 'transparent', color: '#fff', cursor: activePhase.locked && !item.isDone ? 'not-allowed' : 'pointer',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
            }}>
            {item.isDone ? '✓' : ''}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18' }}>{item.name}</span>
              <PriorityBadge priority={item.priority} />
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: item.domain.bg, color: item.domain.text }}>{item.domain.name}</span>
            </div>
            <div style={{ fontSize: 11, color: item.domain.color, marginTop: 2 }}>{item.why}</div>
            {item.isDone && <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 2 }}>{item.identityFeedback}</div>}
          </div>
          {item.hasTimer && (
            <button onClick={onBreathwork}
              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 7, border: `0.5px solid ${item.domain.color}40`, background: item.domain.bg, color: item.domain.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ▶
            </button>
          )}
        </div>
      ))}

      {plan.completionState.dailyMinimumMet && (
        <div style={{ marginTop: 12, borderRadius: 10, background: '#E1F5EE', border: '1px solid #1D9E7530', padding: '11px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#085041' }}>Day Locked In ✓</div>
          <div style={{ fontSize: 12, color: '#085041', marginTop: 3 }}>You completed the minimum operating loop. Evening integration will decide tomorrow’s correction.</div>
        </div>
      )}
    </div>
  )
}
