import React, { useMemo, useState, useEffect } from 'react'
import { generateTodayPlan, PHASES, getDateKey, transitionDayStatus } from '../today/todayEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])

  return [value, setValue]
}


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

function formatImpact(scoreImpact = {}) {
  const labels = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
  return Object.entries(scoreImpact)
    .filter(([, points]) => points > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, points]) => `+${points} ${labels[id] || id}`)
    .join(' · ')
}

function StreakPanel({ plan }) {
  const streak = plan.streak || { current: 0, longest: 0 }
  const current = streak.current || 0
  const message = current >= 7
    ? 'Signal continuity is becoming identity-level momentum.'
    : current >= 3
      ? 'Momentum is now visible. Protect the loop.'
      : current > 0
        ? 'Momentum begins here. Lock in tomorrow to compound it.'
        : 'No active streak yet. Complete the daily minimum to start momentum.'
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
      <div style={{ border: '1px solid #D85A3030', borderRadius: 999, background: current ? '#FAECE7' : '#fff', padding: '7px 11px', fontSize: 12, fontWeight: 900, color: current ? '#712B13' : '#1a1a18' }}>
        🔥 Current streak: {current}
      </div>
      <div style={{ border: bdr, borderRadius: 999, background: '#FCFBF8', padding: '7px 11px', fontSize: 12, fontWeight: 800, color: '#666' }}>
        Best: {streak.longest || current}
      </div>
      <div style={{ border: bdr, borderRadius: 999, background: current ? '#EEEDFE' : '#F8F7F4', padding: '7px 11px', fontSize: 12, fontWeight: 800, color: current ? '#3C3489' : '#666' }}>
        {message}
      </div>
    </div>
  )
}

function FailureState({ plan, onReopen }) {
  if (!plan.failureState?.active) return null
  const missed = plan.failureState.status === 'missed'
  return (
    <div style={{ marginTop: 14, borderRadius: 14, background: missed ? '#FCEBEB' : '#FAECE7', border: '1px solid #D85A3035', padding: '14px 16px' }}>
      <div style={{ fontSize: 16, fontWeight: 950, color: '#712B13', letterSpacing: '-0.02em' }}>
        {missed ? 'Daily Loop Missed' : 'Loop At Risk'}
      </div>
      <div style={{ fontSize: 13, color: '#712B13', marginTop: 5, lineHeight: 1.55 }}>
        {missed
          ? 'The operating loop was not completed. Signal was not stabilized. Tomorrow begins from recovery — not momentum.'
          : <>The daily operating loop is still missing <strong>{plan.failureState.missing}</strong> required action{plan.failureState.missing === 1 ? '' : 's'}. Complete the minimum before the day closes, or tomorrow starts from recovery instead of momentum.</>}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#633806', fontWeight: 800 }}>
        Recovery instruction: start the next unlocked critical practice first. Do not negotiate with the loop.
      </div>
      {missed && (
        <button
          onClick={onReopen}
          style={{
            marginTop: 12,
            border: '1px solid #D85A3050',
            background: '#fff',
            color: '#712B13',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          Reopen Today’s Loop
        </button>
      )}
    </div>
  )
}

function TomorrowPrime({ plan }) {
  const prime = plan.tomorrowPrime
  if (!prime?.domain) return null
  return (
    <div style={{ marginTop: 14, borderRadius: 14, background: '#FCFBF8', border: bdr, padding: '13px 15px', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777' }}>Tomorrow’s Entry Point</div>
        <div style={{ marginTop: 5, fontSize: 15, fontWeight: 900, color: prime.domain.text }}>
          Start with {prime.practiceName}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: '#666', lineHeight: 1.45 }}>{prime.reason}</div>
      </div>
      <div style={{ flexShrink: 0, borderRadius: 999, padding: '7px 10px', background: prime.domain.bg, color: prime.domain.text, fontSize: 12, fontWeight: 900 }}>
        {prime.domain.name}
      </div>
    </div>
  )
}

function DayLockedIn({ plan }) {
  const summary = plan.impactSummary || {}
  const strongest = summary.strongestSignal
  const correction = summary.neglectedDomain || plan.weakestDomain
  const ranked = summary.ranked || []
  const streak = plan.streak || { current: 0, longest: 0 }
  return (
    <div style={{ marginTop: 14, borderRadius: 16, background: 'linear-gradient(135deg, #E1F5EE, #F7FCFA)', border: '1px solid #1D9E7535', padding: '16px 16px', boxShadow: '0 10px 24px rgba(29,158,117,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 950, color: '#085041', letterSpacing: '-0.03em' }}>Day Locked In ✓</div>
          <div style={{ fontSize: 13, color: '#085041', marginTop: 5, lineHeight: 1.55 }}>
            The loop was completed. Signal was established. Tomorrow builds from this state — it does not reset from zero.
          </div>
          <div style={{ fontSize: 12, color: '#085041', marginTop: 7, lineHeight: 1.5 }}>
            Strongest signal: <strong>{strongest?.domain?.name || 'Coherence'}</strong>. Tomorrow’s correction starts with <strong>{correction?.name || 'the open loop'}</strong>.
          </div>
        </div>
        <div style={{ display: 'grid', gap: 7, justifyItems: 'end' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#085041', background: '#fff', border: '1px solid #1D9E7530', borderRadius: 999, padding: '7px 10px', whiteSpace: 'nowrap' }}>
            +{summary.totalImpact || 0} weighted signal
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#3C3489', background: '#EEEDFE', border: '1px solid #7F77DD30', borderRadius: 999, padding: '7px 10px', whiteSpace: 'nowrap' }}>
            🔥 Streak: {streak.current}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 7, marginTop: 14 }}>
        {ranked.slice(0, 5).map(({ domain, points }) => (
          <div key={domain.id} style={{ background: '#fff', border: `1px solid ${domain.color}28`, borderRadius: 11, padding: '8px 9px' }}>
            <div style={{ fontSize: 11, color: domain.text, fontWeight: 850 }}>{domain.name}</div>
            <div style={{ fontSize: 17, color: domain.color, fontWeight: 950, marginTop: 2 }}>+{points}</div>
          </div>
        ))}
      </div>
      {!!summary.feedbackLines?.length && (
        <div style={{ marginTop: 13, display: 'grid', gap: 5 }}>
          {summary.feedbackLines.map((line, idx) => (
            <div key={`${line}-${idx}`} style={{ fontSize: 12, color: '#085041' }}>✓ {line}</div>
          ))}
        </div>
      )}
      <TomorrowPrime plan={plan} />
    </div>
  )
}


export default function DailyFocus({ checked = {}, setChecked, domainScores = {}, onBreathwork, selectedPhaseOverride = null }) {
  const today = getDateKey(new Date())
  const [selectedPhase, setSelectedPhase] = useState(selectedPhaseOverride)
  const [lastFeedback, setLastFeedback] = useState(null)
  const [completionEvents, setCompletionEvents] = useState([])
  const [dayStatus, setDayStatus] = usePersistentState('q_day_status', {})

  useEffect(() => {
    if (selectedPhaseOverride) setSelectedPhase(selectedPhaseOverride)
  }, [selectedPhaseOverride])

  const isMissedToday = dayStatus?.[today]?.status === 'missed'
  const effectiveChecked = useMemo(() => {
    if (!isMissedToday) return checked
    return { ...(checked || {}), [today]: {} }
  }, [checked, isMissedToday, today])

  useEffect(() => {
    if (!isMissedToday) return
    const todayChecks = checked?.[today] || {}
    const hasCompletedUiState = Object.values(todayChecks).some(Boolean)
    if (hasCompletedUiState) {
      setChecked(prev => ({ ...(prev || {}), [today]: {} }))
      setLastFeedback(null)
      setCompletionEvents([])
      setSelectedPhase('morning')
    }
  }, [isMissedToday, checked, today, setChecked])

  const plan = useMemo(() => generateTodayPlan({ domainScores, checked: effectiveChecked, dayStatus, phaseLocking: true }), [domainScores, effectiveChecked, dayStatus])
  const requestedPhaseId = selectedPhase || selectedPhaseOverride || plan.currentPhase
  const activePhaseId = getResolvedPhaseId(plan, requestedPhaseId)
  const activePhase = plan.phases[activePhaseId]
  const requestedWasLocked = requestedPhaseId && requestedPhaseId !== activePhaseId && plan.phases[requestedPhaseId]?.locked

  const scorePreview = plan.impactSummary?.totalImpact || 0

  useEffect(() => {
    setDayStatus(prev => transitionDayStatus({
      previous: prev,
      date: new Date(),
      completionState: plan.completionState,
      impactSummary: plan.impactSummary,
      tomorrowPrime: plan.tomorrowPrime,
      cutoffHour: 20,
    }))
  }, [plan.completionState.completeRequired, plan.completionState.rawDailyMinimumMet, plan.impactSummary, plan.tomorrowPrime, setDayStatus])


  const reopenMissedDay = () => {
    setDayStatus(prev => {
      const current = prev?.[today] || {}
      return {
        ...(prev || {}),
        [today]: {
          ...current,
          status: 'active',
          completedRequired: 0,
          signal: 0,
          missing: undefined,
          missedAt: undefined,
          reopenedAt: new Date().toISOString(),
        }
      }
    })

    setChecked(prev => ({ ...(prev || {}), [today]: {} }))
    setLastFeedback(null)
    setCompletionEvents([])
    setSelectedPhase('morning')
  }

  const handleCheck = (item) => {
    if (isMissedToday) return
    const wasChecked = !!effectiveChecked?.[today]?.[item.key]
    setChecked(prev => ({
      ...prev,
      [today]: { ...(prev?.[today] || {}), [item.key]: !wasChecked }
    }))
    if (!wasChecked) {
      const event = {
        id: `${Date.now()}-${item.key}`,
        title: item.identityFeedback,
        detail: item.analyticFeedback,
        impact: formatImpact(item.scoreImpact),
        domain: item.domain,
        practice: item.name,
        priority: item.priority,
      }
      setLastFeedback(event)
      setCompletionEvents(prev => [event, ...prev].slice(0, 4))
      window.setTimeout(() => setLastFeedback(null), 4200)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: bdr, padding: '18px 20px', marginBottom: 16, boxShadow: '0 10px 26px rgba(0,0,0,0.035)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: '-0.03em' }}>Today’s Execution Loop</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Complete the operating loop. Minimum required: <strong>{plan.completionState.completeRequired}/{plan.dailyMinimum}</strong>. Signal generated: <strong>+{scorePreview}</strong>.
          </div>
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 850,
          color: plan.failureState?.status === 'missed' ? '#712B13' : plan.completionState.dailyMinimumMet ? '#085041' : '#3C3489',
          background: plan.failureState?.status === 'missed' ? '#FAECE7' : plan.completionState.dailyMinimumMet ? '#E1F5EE' : '#EEEDFE',
          border: `1px solid ${plan.failureState?.status === 'missed' ? '#D85A3030' : plan.completionState.dailyMinimumMet ? '#1D9E7530' : '#7F77DD30'}`,
          borderRadius: 999,
          padding: '7px 11px',
          whiteSpace: 'nowrap'
        }}>
          {plan.failureState?.status === 'missed' ? 'Daily Loop Missed' : plan.completionState.dailyMinimumMet ? 'Daily Minimum Complete ✓' : `Daily Minimum: ${plan.completionState.completeRequired}/${plan.dailyMinimum}`}
        </div>
      </div>

      <div style={{ height: 10, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden', marginBottom: 13 }}>
        <div style={{ width: `${plan.completionState.pct}%`, height: '100%', background: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#7F77DD', transition: 'width 220ms ease' }} />
      </div>

      <StreakPanel plan={plan} />

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
          <div style={{ fontSize: 13, fontWeight: 900, color: lastFeedback.domain.text }}>✓ {lastFeedback.title}</div>
          <div style={{ fontSize: 12, color: lastFeedback.domain.color, marginTop: 4 }}>{lastFeedback.detail}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4, fontWeight: 750 }}>{lastFeedback.impact}</div>
        </div>
      )}

      {!!completionEvents.length && (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {completionEvents.slice(0, 2).map(event => (
            <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', border: bdr, borderRadius: 10, padding: '8px 10px', background: '#FCFBF8' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a18' }}>{event.practice}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{event.title}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 850, color: event.domain.color, whiteSpace: 'nowrap' }}>{event.impact}</div>
            </div>
          ))}
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
          <button onClick={() => handleCheck(item)} disabled={isMissedToday}
            title={isMissedToday ? 'This day is closed as missed. Re-enter the loop tomorrow.' : item.isDone ? 'Mark incomplete' : 'Mark complete'}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: `1.8px solid ${item.priority === 'Critical' ? '#D85A30' : item.domain.color}`,
              background: item.isDone ? item.domain.color : 'transparent',
              color: '#fff',
              cursor: isMissedToday ? 'not-allowed' : 'pointer',
              opacity: isMissedToday && !item.isDone ? 0.6 : 1,
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

      {plan.completionState.dailyMinimumMet ? <DayLockedIn plan={plan} /> : <>
        <FailureState plan={plan} onReopen={reopenMissedDay} />
        <TomorrowPrime plan={plan} />
      </>}
    </div>
  )
}
