import React, { useMemo, useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { generateTodayPlan, PHASES, getDateKey, transitionDayStatus, createTodayPlanSnapshot, TODAY_PLAN_VERSION } from '../today/todayEngine'
import { getWeeklyIntelligence, loadPatternProfile, invalidatePatternProfile, getOrComputeProfile, predictTomorrow } from '../intelligence/patternLearningModel'
import { getDailyCoachMessage, getPatternBreakMessage, getTomorrowCoachMessage, getCausalNarrativeMessage } from '../coach/coachEngine'
import { DailyCoachCard, PatternBreakCoachCard, TomorrowCoachLine, CausalNarrativeCard } from '../coach/DailyCoachCard'
import AdaptiveReasonCard from '../intelligence/AdaptiveReasonCard'
import { savePracticeRating, getPracticeRating } from '../intelligence/behavioralIntelligenceEngine'
import { trackEvent } from '../../app/utils/analytics'
import PhaseReadCards from '../../components/PhaseReadCards'

// ── Day 1 Experience ──────────────────────────────────────────────────────────

const DOMAIN_NAMES_D1 = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
const DOMAIN_COLORS_D1 = { d1: '#7F77DD', d2: '#1D9E75', d3: '#BA7517', d4: '#378ADD', d5: '#E24B4A' }

/**
 * Detects how many total days a user has completed at least one practice.
 * Used to determine if this is a Day 1 / early user experience.
 */
function getActiveDayCount(checked = {}) {
  return Object.values(checked).filter(day =>
    Object.values(day || {}).some(Boolean)
  ).length
}

/**
 * Gets total completed practices across all time.
 */
function getTotalCompleted(checked = {}) {
  return Object.values(checked).reduce((total, day) =>
    total + Object.values(day || {}).filter(Boolean).length, 0
  )
}

/**
 * Day 1 Welcome Card — shown to brand new users before any practices.
 * Explains what the app does, what to do first, and what to expect.
 */
function Day1WelcomeCard({ userName, primaryDomain, isMobile }) {
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem('q_day1_dismissed') === 'true' } catch { return false }
  })

  if (dismissed) return null

  const domainName = DOMAIN_NAMES_D1[primaryDomain] || 'your primary body'
  const domainColor = DOMAIN_COLORS_D1[primaryDomain] || '#7F77DD'
  const firstName = userName?.trim().split(' ')[0] || 'there'

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a18 0%, #2a2822 100%)',
      borderRadius: 16,
      padding: isMobile ? '20px 18px' : '24px 24px',
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160,
        background: `${domainColor}20`,
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          ✦ Welcome to Quintave
        </div>
        <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 8 }}>
          Good to have you here, {firstName}.
        </div>
        <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
          Your coherence assessment showed <span style={{ color: domainColor, fontWeight: 700 }}>{domainName}</span> as your primary alignment point today. The practices below are selected specifically for your current state.
        </div>
      </div>

      {/* What to do */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: domainColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Start here
        </div>
        <div style={{ fontSize: 13, color: '#ddd', lineHeight: 1.55 }}>
          Complete your <strong style={{ color: '#fff' }}>Morning practices</strong> first. That single action sets the signal for the entire day. You only need 2 practices to meet today's minimum.
        </div>
      </div>

      {/* What builds over time */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          { day: 'Day 3', label: 'Your first weekly pattern report unlocks' },
          { day: 'Day 7', label: 'The AI adapts your plan based on your behavior' },
          { day: 'Day 14', label: 'Full behavioral intelligence — the system knows you' },
        ].map(item => (
          <div key={item.day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: `${domainColor}20`,
              color: domainColor,
              borderRadius: 99,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
            }}>{item.day}</span>
            <span style={{ fontSize: 12, color: '#888' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => {
          try { localStorage.setItem('q_day1_dismissed', 'true') } catch {}
          setDismissed(true)
        }}
        style={{
          background: domainColor,
          color: '#fff',
          border: 'none',
          borderRadius: 99,
          padding: '9px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Got it — show me my practices
      </button>
    </div>
  )
}

/**
 * Early user baseline indicator — Day X of 7 progress bar.
 * Shows during the first 7 days to set expectations.
 */
function BaselineProgressBar({ activeDayCount, isMobile }) {
  const target = 7
  const pct = Math.min(100, Math.round((activeDayCount / target) * 100))
  const remaining = Math.max(0, target - activeDayCount)

  if (activeDayCount === 0 || activeDayCount >= target) return null

  return (
    <div style={{
      background: '#F8F7F4',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 10,
      padding: isMobile ? '10px 14px' : '11px 16px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, color: '#7F77DD', fontWeight: 900 }}>◈</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#3C3489' }}>
            Building your baseline
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>
          Day {activeDayCount} of {target}
        </span>
      </div>
      <div style={{ background: '#E8E6FC', borderRadius: 99, height: 4, marginBottom: 7 }}>
        <div style={{
          width: `${pct}%`,
          height: 4,
          background: '#7F77DD',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
        {remaining === 1
          ? 'One more aligned day unlocks your full intelligence profile.'
          : `${remaining} more aligned days — then the AI begins adapting to your specific patterns.`}
      </div>
    </div>
  )
}

/**
 * Empty state for intelligence sections when user has no data yet.
 */
function IntelligenceComingSoon({ title, description, unlockDay, isMobile }) {
  return (
    <div style={{
      background: '#F8F7F4',
      border: '0.5px dashed rgba(0,0,0,0.12)',
      borderRadius: 12,
      padding: isMobile ? '16px 14px' : '18px 18px',
      textAlign: 'center',
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 20, marginBottom: 10, opacity: 0.3 }}>◈</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55, marginBottom: 10, maxWidth: 260, margin: '0 auto 10px' }}>
        {description}
      </div>
      {unlockDay && (
        <span style={{
          background: '#F3F1FF',
          color: '#7F77DD',
          border: '0.5px solid #7F77DD30',
          borderRadius: 99,
          padding: '3px 10px',
          fontSize: 10,
          fontWeight: 800,
        }}>
          Unlocks Day {unlockDay}
        </span>
      )}
    </div>
  )
}

const STRATEGY_LABELS = {
  recovery_first: 'Recovery and stabilization',
  stabilize_blocker: 'Stabilize the weakest frequency body',
  harmonize_lagging_body: 'Restore cross-domain harmony',
  advance_with_balance: 'Advance signal without imbalance',
}

// Formats a raw phase key (e.g. "collapse_rebuild") into a human-readable label
function formatPhaseLabel(value, fallback = 'Baseline') {
  if (!value) return fallback
  const map = {
    collapse_rebuild:    'Collapse / Rebuild',
    recovery:            'Recovery',
    stabilization:       'Stabilization',
    expansion:           'Expansion',
    integration:         'Integration',
    baseline_building:   'Baseline Building',
    lower_friction:      'Lower Friction',
    establish_baseline:  'Establish Baseline',
    increase_depth:      'Increase Depth',
    reinforce_momentum:  'Reinforce Momentum',
  }
  return map[value] || String(value).replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const BODY_EXPLANATIONS = {
  Source: 'stability & reference',
  Form: 'body, energy & recovery',
  Field: 'emotion & nervous system',
  Mind: 'focus & cognition',
  Code: 'patterns & habits',
}



const bdr = '0.5px solid rgba(0,0,0,0.08)'

// Responsive hook — re-renders on resize
function useWindowWidth() {
  const [width, setWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

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
      className="phase-pill tap-target"
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

function StreakPanel({ plan, isMobile }) {
  const streak = plan.streak || { current: 0, longest: 0 }
  const current = streak.current || 0
  const message = current >= 30
    ? '30-day alignment field: continuity is becoming the default.'
    : current >= 14
      ? '14-day stabilization: the system is holding under repetition.'
      : current >= 7
        ? '7-day momentum: the alignment is no longer random.'
        : current >= 3
          ? '3-day momentum: stability is beginning to form.'
          : current > 0
            ? 'Momentum begins here. Lock in tomorrow to compound it.'
            : "No active momentum yet. Complete today's minimum to begin."

  if (isMobile) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
          <div style={{ border: '1px solid #D85A3030', borderRadius: 10, background: current ? '#FAECE7' : '#fff', padding: '7px 12px', fontSize: 12, fontWeight: 900, color: current ? '#712B13' : '#1a1a18', flex: 1, textAlign: 'center' }}>
            🔥 {current} day streak
          </div>
          <div style={{ border: bdr, borderRadius: 10, background: '#FCFBF8', padding: '7px 12px', fontSize: 12, fontWeight: 800, color: '#666', flex: 1, textAlign: 'center' }}>
            🏆 Best: {streak.longest || current}
          </div>
        </div>
        <div style={{ fontSize: 12, color: current ? '#3C3489' : '#888', fontWeight: current ? 700 : 400, lineHeight: 1.45, paddingLeft: 2 }}>
          {message}
        </div>
      </div>
    )
  }

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
        {missed ? 'Alignment Not Established' : 'Alignment At Risk'}
      </div>
      <div style={{ fontSize: 13, color: '#712B13', marginTop: 5, lineHeight: 1.55 }}>
        {missed
          ? 'Today’s alignment was not completed. Signal was not stabilized. Tomorrow begins from recovery — not momentum.'
          : <>Today’s alignment is still missing <strong>{plan.failureState.missing}</strong> required action{plan.failureState.missing === 1 ? '' : 's'}. Complete the minimum before the day closes, or tomorrow starts from recovery instead of momentum.</>}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#633806', fontWeight: 800 }}>
        Recovery instruction: start the next unlocked critical practice first. Do not negotiate with the alignment.
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
          Resume Today’s Alignment
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
    <div style={{ marginTop: 14, borderRadius: 16, background: 'linear-gradient(135deg, #E1F5EE, #F7FCFA)', border: '1px solid #1D9E7535', padding: '22px 20px', boxShadow: '0 10px 24px rgba(29,158,117,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 950, color: '#085041', letterSpacing: '-0.03em' }}>Day Locked In ✓</div>
          <div style={{ fontSize: 13, color: '#085041', marginTop: 5, lineHeight: 1.55 }}>
            Today’s alignment was completed. Signal was established. Tomorrow builds from this state — it does not reset from zero.
          </div>
          {streak.current === 1 && (
            <div style={{ fontSize: 12, color: '#085041', marginTop: 6, fontWeight: 850 }}>
              You established your first signal. Repeat tomorrow to build momentum.
            </div>
          )}
          <div style={{ fontSize: 12, color: '#085041', marginTop: 7, lineHeight: 1.5 }}>
            Strongest signal: <strong>{strongest?.domain?.name || 'Coherence'}</strong>. Tomorrow’s correction starts with <strong>{correction?.name || 'the open alignment point'}</strong>.
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
      <div className="domain-impact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 7, marginTop: 14 }}>
        {ranked.slice(0, 5).map(({ domain, points }) => {
          const isSource = domain.id === 'd1'
          // Source never changes — only access quality varies. Show access label, not a growth score.
          const sourceAccessMap = { 80: 'Clear', 60: 'Stable', 40: 'Accessible', 20: 'Distorted', 0: 'Faint' }
          const sourceLabel = Object.entries(sourceAccessMap).reverse().find(([threshold]) => points >= Number(threshold))?.[1] || 'Accessible'
          return (
            <div key={domain.id} style={{ background: '#fff', border: `1px solid ${domain.color}28`, borderRadius: 11, padding: '8px 9px' }}>
              <div style={{ fontSize: 11, color: domain.text, fontWeight: 850 }}>{domain.name}</div>
              {isSource ? (
                <>
                  <div style={{ fontSize: 11, color: domain.color, fontWeight: 950, marginTop: 2 }}>{sourceLabel}</div>
                  <div style={{ fontSize: 9, color: '#aaa', marginTop: 1 }}>access</div>
                </>
              ) : (
                <div style={{ fontSize: 17, color: domain.color, fontWeight: 950, marginTop: 2 }}>+{points}</div>
              )}
            </div>
          )
        })}
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

function BetaFeedbackLayer({ plan, isMobile }) {
  const today = getDateKey(new Date())
  const [submitted, setSubmitted] = useState(() => {
    try {
      let data = {}
      try { data = JSON.parse(localStorage.getItem('q_beta_feedback') || '{}') } catch { try { localStorage.removeItem('q_beta_feedback') } catch {} }
      return !!data[today]
    } catch {
      return false
    }
  })
  const [accuracy, setAccuracy] = useState('')
  const [note, setNote] = useState('')

  const completed = plan?.completionState?.completeRequired || 0
  const minimum = plan?.dailyMinimum || 4
  const enoughProgress = completed >= Math.ceil(minimum / 2)

  if (!enoughProgress || submitted) return null

  const submit = () => {
    if (!accuracy) {
      alert("Please select how accurate today's alignment felt.")
      return
    }
    const entry = {
      date: today,
      accuracy,
      note: note.trim(),
      primaryAttunementBody: plan.decision?.primaryBlockerId || null,
      secondaryDrift: plan.decision?.secondaryBlockerId || null,
      phase: plan.decision?.phaseSummary?.phase || null,
      behaviorMode: plan.decision?.behaviorMode || null,
      strategy: plan.decision?.strategy || null,
      createdAt: new Date().toISOString(),
    }
    try {
      let existing = {}
      try { existing = JSON.parse(localStorage.getItem('q_beta_feedback') || '{}') } catch { existing = {} }
      localStorage.setItem('q_beta_feedback', JSON.stringify({ ...existing, [today]: entry }))
    } catch {}
    setSubmitted(true)
    alert('Feedback saved. Thank you.')
  }

  return (
    <div style={{
      marginTop: 14,
      borderRadius: 16,
      border: '1px solid #7F77DD30',
      background: 'linear-gradient(135deg, #F3F1FF, #FCFBF8)',
      padding: isMobile ? '11px 12px' : '15px 16px'
    }}>
      <div style={{ fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6F6A7A', marginBottom: 6 }}>
        Beta Feedback
      </div>
      <div style={{ fontSize: 15, fontWeight: 950, color: '#1a1a18', marginBottom: 8 }}>
        Did today's alignment feel accurate?
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          ['very_accurate', 'Very accurate'],
          ['somewhat_accurate', 'Somewhat accurate'],
          ['not_accurate', 'Not accurate'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setAccuracy(value)}
            style={{
              border: accuracy === value ? '1.5px solid #7F77DD' : bdr,
              background: accuracy === value ? '#EEEDFE' : '#fff',
              color: accuracy === value ? '#3C3489' : '#555',
              borderRadius: 999,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 850,
              cursor: 'pointer'
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Anything feel off, confusing, too easy, or too hard?"
        rows={isMobile ? 2 : 3}
        style={{
          width: '100%',
          border: bdr,
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: 13,
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          background: '#fff',
          color: '#1a1a18',
          lineHeight: 1.5,
          maxHeight: isMobile ? '80px' : '200px',
          boxSizing: 'border-box'
        }}
      />
      <button
        onClick={submit}
        style={{
          marginTop: 10,
          border: 'none',
          background: '#1a1a18',
          color: '#fff',
          borderRadius: 999,
          padding: '9px 14px',
          fontSize: 12,
          fontWeight: 900,
          cursor: 'pointer'
        }}
      >
        Save feedback
      </button>
    </div>
  )
}

// ── Domain Detail Content ─────────────────────────────────────────────────────
const DOMAIN_DETAIL = {
  d1: {
    name: 'Source',
    subtitle: 'The reference field — the awareness beneath thought',
    color: { bg: '#EEEDFE', text: '#3C3489', border: '#7F77DD', accent: '#5B52C8' },
    symbol: '◎',
    governs: [
      'Your deepest sense of self — the observer beneath the noise',
      'The stable reference point all other bodies orient toward',
      'Intuitive clarity and access to inner knowing',
      'The signal that remains when everything else is stripped away',
    ],
    whenLow: [
      'Feeling disconnected from yourself — like you\'re running on autopilot',
      'Everything feels equally urgent, nothing feels meaningful',
      'Difficulty accessing stillness even for a moment',
      'A sense of being lost inside your own life',
    ],
    whenHigh: [
      'A quiet confidence that doesn\'t depend on circumstances',
      'Clear inner knowing — decisions come from a grounded place',
      'The noise of the world is present but doesn\'t pull you away',
      'You return to yourself quickly after disturbance',
    ],
    practices: ['Stillness Exposure', 'Visualization Practice', 'Observer Drill'],
    note: 'Source never weakens — only your access to it changes. The practices here clear interference, not strengthen the source itself.',
  },
  d2: {
    name: 'Form',
    subtitle: 'The physical vessel — energy, recovery, and biological foundation',
    color: { bg: '#E1F5EE', text: '#085041', border: '#1D9E75', accent: '#1D9E75' },
    symbol: '◈',
    governs: [
      'Sleep quality and recovery depth',
      'Physical energy, vitality, and resilience',
      'Nervous system regulation through the body',
      'The biological platform every other domain runs on',
    ],
    whenLow: [
      'Persistent fatigue that doesn\'t resolve with rest',
      'Emotional dysregulation triggered by small things',
      'Difficulty concentrating or sustaining focus',
      'The feeling of pushing through the day rather than moving through it',
    ],
    whenHigh: [
      'Consistent energy without the afternoon crash',
      'Emotional steadiness — less reactive, more responsive',
      'Physical presence — you feel at home in your body',
      'Recovery is fast — you bounce back from stress quickly',
    ],
    practices: ['Sleep 7h+', 'Movement Practice', 'Nourishment Intention'],
    note: 'Form is the foundation. When Form is low, every other body becomes harder to stabilize — they borrow from a depleted resource.',
  },
  d3: {
    name: 'Field',
    subtitle: 'Emotional charge and nervous system tone',
    color: { bg: '#FAEEDA', text: '#633806', border: '#BA7517', accent: '#BA7517' },
    symbol: '◈',
    governs: [
      'Emotional processing and charge release',
      'Nervous system regulation — calm vs activated states',
      'Relational attunement and empathic sensitivity',
      'How you carry — or discharge — emotional weight',
    ],
    whenLow: [
      'Carrying emotional weight without knowing where it came from',
      'Reactivity — small triggers create disproportionate responses',
      'Feeling "charged" or on edge without a clear reason',
      'Suppressing emotion rather than moving it through',
    ],
    whenHigh: [
      'Emotional experiences move through rather than accumulate',
      'You can name what you feel and locate it in your body',
      'Relational interactions feel nourishing, not draining',
      'A sense of emotional spaciousness — room to feel without being overwhelmed',
    ],
    practices: ['Breathwork', 'Gratitude + Reframe', 'Field Discharge'],
    note: 'Field is your emotional processing system. Unprocessed charge in Field creates interference across all other bodies — especially Mind.',
  },
  d4: {
    name: 'Mind',
    subtitle: 'Focus, cognition, and directive capacity',
    color: { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD', accent: '#378ADD' },
    symbol: '◈',
    governs: [
      'Focused attention and sustained concentration',
      'Intentional thinking vs automatic mental loops',
      'The ability to set and hold a directive',
      'Cognitive clarity and decision-making quality',
    ],
    whenLow: [
      'Scattered attention — difficulty completing a single thought',
      'Reactive thinking — responding to what the world puts in front of you',
      'Mental loops that repeat without resolution',
      'Decisions feel overwhelming or get deferred indefinitely',
    ],
    whenHigh: [
      'One clear directive at a time — and the ability to hold it',
      'Thoughts feel chosen rather than automatic',
      'Focus arrives quickly and sustains through resistance',
      'Mental clarity that makes complex decisions feel straightforward',
    ],
    practices: ['Morning Directive', 'Thought Audit', 'Pattern Interrupt'],
    note: 'Mind is the steering domain. A clear Mind directive at the start of the day reduces reactive decision-making by 60-70% for most people.',
  },
  d5: {
    name: 'Code',
    subtitle: 'Behavioral patterns and automatic loops',
    color: { bg: '#FAECE7', text: '#712B13', border: '#D85A30', accent: '#D85A30' },
    symbol: '◈',
    governs: [
      'Automatic behaviors and habitual responses',
      'Identity-level patterns — who you are when no one is watching',
      'The gap between intention and action',
      'Behavioral loops that run beneath conscious awareness',
    ],
    whenLow: [
      'Knowing what to do and consistently not doing it',
      'Automatic reactions that contradict your stated values',
      'Feeling controlled by patterns rather than directing them',
      'A gap between who you intend to be and how you actually show up',
    ],
    whenHigh: [
      'Your automatic behaviors align with your intentions',
      'Pattern interruption becomes natural — you catch loops early',
      'Identity and action are congruent — no internal conflict',
      'New behaviors integrate quickly because the system is coherent',
    ],
    practices: ['Identity Decompression', 'Affirmation Installation', '5 Recall Triggers'],
    note: 'Code is where coherence becomes permanent. Short-term changes in Form, Field, and Mind only stabilize when Code begins to update.',
  },
}

// ── Domain Detail Modal ───────────────────────────────────────────────────────
function DomainDetailModal({ domainId, onClose }) {
  const detail = DOMAIN_DETAIL[domainId]
  if (!detail) return null
  const { name, subtitle, color, governs, whenLow, whenHigh, practices, note } = detail

  // Use hook for reliable mobile detection
  const width = useWindowWidth()
  const isMobile = width < 768

  // Prevent body scroll while modal open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Section = ({ title, items, bulletColor }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: 8 }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
          <span style={{ color: bulletColor || color.accent, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>◦</span>
          <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 20,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          width: isMobile ? '100%' : 520,
          maxHeight: isMobile ? '88vh' : '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          background: color.bg,
          borderBottom: `3px solid ${color.border}`,
          borderRadius: isMobile ? '20px 20px 0 0' : '16px 16px 0 0',
          padding: '20px 20px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20, color: color.accent }}>{detail.symbol}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: color.text }}>{name}</span>
              </div>
              <div style={{ fontSize: 13, color: color.border, fontWeight: 500, lineHeight: 1.4 }}>{subtitle}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#888', padding: '0 0 0 16px', lineHeight: 1, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 32px', overflowY: 'auto' }}>
          <Section title="What this domain governs" items={governs} />
          <Section title="When this body is low" items={whenLow} bulletColor="#BA4A4A" />
          <Section title="When this body is high" items={whenHigh} bulletColor="#1D9E75" />

          {/* Practices */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: 8 }}>
              Practices that move this body
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {practices.map((p, i) => (
                <span key={i} style={{
                  background: color.bg,
                  color: color.text,
                  border: `1px solid ${color.border}40`,
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{
            background: '#F8F7F4',
            border: '0.5px solid rgba(0,0,0,0.08)',
            borderLeft: `3px solid ${color.accent}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#555',
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}>
            {note}
          </div>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

function CoherenceProgressLayer({ decision }) {
  if (!decision) return null
  const [selectedDomain, setSelectedDomain] = React.useState(null)
  const width = useWindowWidth()
  const isMobile = width < 768

  const DOMAIN_STYLES = {
    d1: { bg: '#EEEDFE', text: '#3C3489', border: '#7F77DD' },
    d2: { bg: '#E1F5EE', text: '#085041', border: '#1D9E75' },
    d3: { bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
    d4: { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD' },
    d5: { bg: '#FAECE7', text: '#712B13', border: '#D85A30' },
  }

  const labels = {
    d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code',
  }

  const primary = decision.primaryBlockerId
  const secondary = decision.secondaryBlockerId
  const stable = decision.trajectorySummary?.mostStableBody

  // Always show Source + all 4 movable bodies (d2-d5).
  // Derive state from decision signals; fall back to 'Stable' if not featured.
  const MOVABLE_IDS = ['d2', 'd3', 'd4', 'd5']
  const getBodyState = (id) => {
    if (id === primary)   return { state: 'Recovering',  symbol: '↑', tone: 'primary' }
    if (id === secondary) return { state: 'Drifting',    symbol: '↓', tone: 'secondary' }
    if (id === stable)    return { state: 'Stabilizing', symbol: '→', tone: 'stable' }
    return { state: 'Stable', symbol: '→', tone: 'neutral' }
  }

  const rows = [
    { id: 'd1', label: 'Source', state: 'Anchored', symbol: '◎', tone: 'anchor' },
    ...MOVABLE_IDS.map(id => ({
      id,
      label: labels[id] || id,
      ...getBodyState(id),
    })),
  ]

  return (
    <>
    <div style={{
      marginTop: 14,
      marginBottom: 14,
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 14,
      background: '#fff',
      padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#888',
        marginBottom: 10,
      }}>
        Coherence Progress
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth < 768) ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
      }}>
        {rows.map(row => {
          const style = DOMAIN_STYLES[row.id] || DOMAIN_STYLES.d1
          return (
            <div
              key={row.id}
              onClick={() => setSelectedDomain(row.id)}
              title="Tap to learn more"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}30`,
                borderTop: `3px solid ${style.border}`,
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${style.border}30`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: style.text,
                }}>
                  {row.label}
                </div>
                <div style={{
                  fontSize: 11,
                  color: style.border,
                  marginTop: 2,
                  fontWeight: 500,
                }}>
                  {row.state}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{
                  color: style.border,
                  fontSize: 20,
                  fontWeight: 700,
                }}>
                  {row.symbol}
                </div>
                <div style={{ fontSize: 9, color: style.border, opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em' }}>
                  INFO
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Tap hint — only shown first few times */}
      <div style={{ fontSize: 10, color: '#aaa', textAlign: 'right', marginTop: 4, fontStyle: 'italic' }}>
        Tap any body to learn more
      </div>
    </div>
    {selectedDomain && (
      <DomainDetailModal
        domainId={selectedDomain}
        onClose={() => setSelectedDomain(null)}
      />
    )}
  </>
  )
}

function TesterDiagnostics({ decision }) {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem('q_tester_diagnostics') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        e.stopPropagation()

        const next = !visible
        setVisible(next)
        
        try {
          localStorage.setItem('q_tester_diagnostics', String(next))
        } catch {}
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible])

  if (!visible || !decision) return null

  const coherence = decision.coherenceState
  const interference = decision.interferenceSummary
  const trajectory = decision.trajectorySummary
  const memory = decision.memorySummary
  const phase = decision.phaseSummary

  return (
    <div style={{
      marginTop: 14,
      border: '1px dashed rgba(0,0,0,0.22)',
      borderRadius: 14,
      background: '#FCFBF8',
      padding: '12px 14px'
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 950,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#777',
        marginBottom: 10
      }}>
        Tester Diagnostics
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 8,
        fontSize: 12,
        color: '#444',
        lineHeight: 1.5
      }}>
        <div><strong>Phase:</strong> {phase?.displayPhase || phase?.phase || 'unknown'}</div>
        <div><strong>Primary:</strong> {decision.primaryBlockerId}</div>
        <div><strong>Secondary:</strong> {decision.secondaryBlockerId}</div>
        <div><strong>Strategy:</strong> {decision.strategy}</div>
        <div><strong>Behavior:</strong> {decision.behaviorMode}</div>
        <div><strong>Trajectory:</strong> {trajectory?.trend || 'unknown'}</div>
        <div><strong>Source access:</strong> {coherence?.source?.accessibility ?? 'n/a'}</div>
        <div><strong>Coherence distance:</strong> {coherence?.system?.coherenceDistance ?? 'n/a'}</div>
        <div><strong>Recovery state:</strong> {interference?.recoveryState || 'n/a'}</div>
        <div><strong>Overload risk:</strong> {interference?.overloadRisk || 'n/a'}</div>
        <div><strong>Memory bias:</strong> {memory?.recommendationBias || 'n/a'}</div>
        <div><strong>Recurring drift:</strong> {memory?.recurringDriftBody || 'n/a'}</div>
      </div>
    </div>
  )
}

function SystemReadPanel({ decision }) {
  if (!decision) return null

  const labels = {
    d1: 'Source',
    d2: 'Form',
    d3: 'Field',
    d4: 'Mind',
    d5: 'Code',
  }

  const primary = labels[decision.primaryBlockerId] || 'System'
  const secondary = labels[decision.secondaryBlockerId] || null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #F4F6FB, #FCFBF8)',
      border: '1px solid #DFE3F0',
      borderRadius: 14,
      padding: '13px 15px',
      marginBottom: 14
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 950,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#777',
        marginBottom: 6
      }}>
        Today’s Alignment Read
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        Core reference: <strong>Source</strong>
      </div>

      <PhaseReadCards
        phase={
          decision?.phaseSummary?.displayPhase ||
          decision?.phaseSummary?.phase ||
          'Baseline'
        }
        primaryFocus={primary}
        trajectory={
          decision?.trajectorySummary?.trend
            ?.replaceAll('_', ' ')
            ?.replace(/\b\w/g, c => c.toUpperCase()) ||
          'Baseline Building'
        }
        systemBias={
          decision?.behaviorMode
            ?.replaceAll('_', ' ')
            ?.replace(/\b\w/g, c => c.toUpperCase()) ||
          'Stabilize First'
        }
      />
      <CoherenceProgressLayer decision={decision} />

      <div style={{ fontSize: 15, fontWeight: 950, color: '#1a1a18', marginTop: 8 }}>
        <strong>Primary attunement body:</strong>{' '}
        {primary}
        {BODY_EXPLANATIONS[primary] && (
          <span style={{ color: '#6B6780', fontSize: 13, fontWeight: 400, marginLeft: 6 }}>
            ({BODY_EXPLANATIONS[primary]})
          </span>
        )}
      </div>


      {secondary && secondary !== primary && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          <strong>Secondary drift:</strong>{' '}
          {secondary}
          {BODY_EXPLANATIONS[secondary] && (
            <span style={{ color: '#6B6780', fontSize: 12, marginLeft: 6 }}>
              ({BODY_EXPLANATIONS[secondary]})
            </span>
          )}
        </div>
      )}

      <div style={{
        fontSize: 12,
        color: '#444',
        marginTop: 7,
        lineHeight: 1.55
      }}>
        <strong>Alignment response:</strong>{' '}
        {STRATEGY_LABELS[decision.strategy] || decision.strategy?.replaceAll('_', ' ') || 'Stabilize the weakest frequency body'}
      </div>

      <div style={{
        fontSize: 12,
        color: '#555',
        marginTop: 5,
        lineHeight: 1.55
      }}>
        {decision.reason}
      </div>
      <TesterDiagnostics decision={decision} />
      {decision.explanation && (
        <div style={{
          fontSize: 12,
          color: '#666',
          marginTop: 7,
          lineHeight: 1.55
        }}>
          {decision.explanation}
        </div>
      )}
    </div>
  )
}

// Mobile-optimised collapsed alignment read — shows 2-line summary, tap to expand
function MobileAlignmentRead({ decision }) {
  const [expanded, setExpanded] = React.useState(false)
  if (!decision) return null

  const labels = { d1:'Source', d2:'Form', d3:'Field', d4:'Mind', d5:'Code' }
  const primary = labels[decision.primaryBlockerId] || 'System'
  const phaseDisplay = formatPhaseLabel(decision?.phaseSummary?.displayPhase || decision?.phaseSummary?.phase)
  const strategyDisplay = STRATEGY_LABELS[decision.strategy] || 'Stabilize'

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Compact stacked card — easier to parse than horizontal pill row */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          background: 'linear-gradient(135deg, #F4F6FB, #FCFBF8)',
          border: '1px solid #DFE3F0',
          borderRadius: 12,
          padding: '11px 13px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Row 1: Phase */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#7F77DD', flexShrink: 0 }}>Phase</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a18', lineHeight: 1.2 }}>{phaseDisplay}</span>
            </div>
            {/* Row 2: Primary Focus */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', flexShrink: 0, minWidth: 36 }}>Focus</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#3C3489' }}>{primary}</span>
            </div>
            {/* Row 3: Mode */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', flexShrink: 0, minWidth: 36 }}>Mode</span>
              <span style={{ fontSize: 12, color: '#555' }}>{strategyDisplay}</span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginTop: 2 }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {!expanded && (
          <div style={{ fontSize: 10, color: '#7F77DD', fontWeight: 700, marginTop: 8, textAlign: 'right' }}>Full read ▼</div>
        )}
      </div>

      {/* Expanded full panel */}
      {expanded && (
        <div style={{
          marginTop: 8,
          background: 'linear-gradient(135deg, #F4F6FB, #FCFBF8)',
          border: '1px solid #DFE3F0',
          borderRadius: 12,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>
            Today's Alignment Read
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Core reference: <strong>Source</strong></div>
          <PhaseReadCards
            phase={decision?.phaseSummary?.displayPhase || decision?.phaseSummary?.phase || 'Baseline'}
            primaryFocus={primary}
            trajectory={decision?.trajectorySummary?.trend?.replaceAll('_',' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Baseline Building'}
            systemBias={decision?.behaviorMode?.replaceAll('_',' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Stabilize First'}
          />
          <CoherenceProgressLayer decision={decision} />
          <div style={{ fontSize: 13, fontWeight: 950, color: '#1a1a18', marginTop: 6 }}>
            <strong>Primary attunement body:</strong> {primary}
            {BODY_EXPLANATIONS[primary] && (
              <span style={{ color: '#6B6780', fontSize: 12, fontWeight: 400, marginLeft: 6 }}>({BODY_EXPLANATIONS[primary]})</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 6, lineHeight: 1.5 }}>
            <strong>Alignment response:</strong> {STRATEGY_LABELS[decision.strategy] || decision.strategy?.replaceAll('_',' ') || 'Stabilize'}
          </div>
          {decision.reason && (
            <div style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.5 }}>{decision.reason}</div>
          )}
          <TesterDiagnostics decision={decision} />
        </div>
      )}
    </div>
  )
}

// ─── Tomorrow Prediction Mini — shown in Today tab after Day Locked In ──────────
function TomorrowPredictionMini({ pred, onOpenProgress, isMobile, tomorrowCoachMessage }) {
  if (!pred) return null
  const directionColor = pred.predictedDirection === 'stable_or_rising' ? '#085041'
    : pred.predictedDirection === 'stable' ? '#378ADD' : '#BA7517'
  const directionBg = pred.predictedDirection === 'stable_or_rising' ? '#E1F5EE'
    : pred.predictedDirection === 'stable' ? '#E6F1FB' : '#FAEEDA'
  const arrow = pred.predictedDirection === 'stable_or_rising' ? '↑'
    : pred.predictedDirection === 'stable' ? '→' : '↓'

  return (
    <div style={{
      marginTop: 10,
      background: '#F8F7F4',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: isMobile ? '11px 13px' : '13px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: 5 }}>
            Tomorrow's prediction
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, background: directionBg, color: directionColor, padding: '3px 9px', borderRadius: 99 }}>
              {arrow} {pred.predictedDirection === 'stable_or_rising' ? 'Rising' : pred.predictedDirection === 'stable' ? 'Stable' : 'At risk'}
            </span>
            {pred.likelyDrift && (
              <span style={{ fontSize: 12, color: '#666' }}>
                Likely drift: <strong>{pred.likelyDrift.name}</strong>
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.45 }}>
            {pred.highestLeverageMove}
          </div>
          <TomorrowCoachLine message={tomorrowCoachMessage} />
          {pred.risks[0] && (
            <div style={{ fontSize: 11, color: '#BA7517', marginTop: 4, fontWeight: 600 }}>
              ⚠ {pred.risks[0].label}
            </div>
          )}
        </div>
        {onOpenProgress && (
          <button
            onClick={onOpenProgress}
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              borderRadius: 8,
              border: '0.5px solid rgba(0,0,0,0.12)',
              background: '#fff',
              fontSize: 11,
              fontWeight: 700,
              color: '#3C3489',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Full report →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Adaptive Intelligence Badge — Sprint 5 ──────────────────────────────────
// Reads plan.adaptations[] for specific, earned adaptation messages.
// Each message is practice-specific and explains exactly what the engine changed.
// ── Signal Quality Rating ────────────────────────────────────────────────────
// 3-button micro-rating that appears after a practice is checked.
// Stores 'landed' | 'neutral' | 'forced' to weight momentum calculations.
function PracticeQualityRating({ practiceKey, dateKey, isMobile }) {
  const [selected, setSelected] = React.useState(() => {
    try { return getPracticeRating(practiceKey, dateKey) } catch { return 'unrated' }
  })
  const [dismissed, setDismissed] = React.useState(selected !== 'unrated')

  if (dismissed && selected !== 'unrated') return (
    <span style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic', marginLeft: 4 }}>
      {selected === 'landed' ? '✓ Landed' : selected === 'neutral' ? '· Neutral' : '· Forced'}
    </span>
  )

  const options = [
    { key: 'landed',  label: 'Landed',  color: '#1D9E75', bg: '#E1F5EE' },
    { key: 'neutral', label: 'Neutral', color: '#378ADD', bg: '#E6F1FB' },
    { key: 'forced',  label: 'Forced',  color: '#BA7517', bg: '#FAEEDA' },
  ]

  return (
    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, color: '#888', fontWeight: 700 }}>How did it land?</span>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => {
            setSelected(opt.key)
            setDismissed(true)
            try { savePracticeRating(practiceKey, opt.key) } catch {}
          }}
          style={{
            background: selected === opt.key ? opt.bg : '#F4F3F0',
            color: selected === opt.key ? opt.color : '#888',
            border: `1px solid ${selected === opt.key ? opt.color + '60' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 99,
            padding: isMobile ? '2px 7px' : '2px 9px',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >{opt.label}</button>
      ))}
    </div>
  )
}

function AdaptiveIntelligenceBadge({ plan, isMobile }) {
  const [expanded, setExpanded] = React.useState(false)
  const adaptations = plan?.adaptations || []
  const ai = plan?.adaptiveIntelligence

  // Show badge if we have specific adaptations OR generic adaptation signal
  if (adaptations.length === 0 && !ai?.isAdapted) return null

  // Build human-readable messages from adaptations[]
  const messages = adaptations
    .filter(a => a.type === 'reinforced' || a.type === 'deprioritized' || a.type === 'load_reduced')
    .map(a => {
      if (a.type === 'reinforced') return `Reinforcing ${a.practiceName}`
      if (a.type === 'deprioritized') return `Reduced ${a.practiceName} (${a.skipRate}% skip rate)`
      if (a.type === 'load_reduced') return `${a.phase.charAt(0).toUpperCase() + a.phase.slice(1)} load reduced`
      return null
    })
    .filter(Boolean)

  // Fall back to generic if no specific messages
  const displayMessages = messages.length > 0 ? messages : [
    ai?.topMomentumPractice ? `Reinforcing ${ai.topMomentumPractice}` : null,
    ai?.topAvoidedPractice ? `Reduced ${ai.topAvoidedPractice}` : null,
  ].filter(Boolean)

  if (displayMessages.length === 0) return null

  return (
    <div style={{
      background: '#F3F1FF',
      border: '1px solid #7F77DD30',
      borderRadius: 10,
      padding: isMobile ? '6px 10px' : '8px 12px',
      marginBottom: 10,
    }}>
      <div
        onClick={() => adaptations.length > 1 && setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', cursor: adaptations.length > 1 ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: 11, color: '#7F77DD', fontWeight: 900, flexShrink: 0 }}>◈ Adapted</span>
        <span style={{ fontSize: 11, color: '#5a5870', flex: 1 }}>
          {displayMessages[0]}
          {displayMessages.length > 1 && !expanded && (
            <span style={{ color: '#7F77DD', marginLeft: 4 }}>+{displayMessages.length - 1} more ▼</span>
          )}
        </span>
      </div>
      {expanded && displayMessages.slice(1).map((msg, i) => (
        <div key={i} style={{ fontSize: 11, color: '#5a5870', marginTop: 4, paddingLeft: 20 }}>
          · {msg}
        </div>
      ))}
      {expanded && adaptations.find(a => a.type === 'load_reduced') && (
        <div style={{ fontSize: 11, color: '#7F77DD', marginTop: 6, paddingLeft: 20, fontStyle: 'italic' }}>
          {adaptations.find(a => a.type === 'load_reduced').reason}
        </div>
      )}
    </div>
  )
}

// ─── Pattern Break Celebration ────────────────────────────────────────────────
// Surfaces when the user has broken a recurring negative pattern.
function PatternBreakNotice({ plan }) {
  const breaks = plan?.patternBreaks || []
  if (breaks.length === 0) return null

  // Show only the most significant break
  const top = breaks.sort((a, b) => (b.strength === 'strong' ? 1 : -1))[0]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #E1F5EE, #F3F1FF)',
      border: '1px solid #1D9E7530',
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1D9E75', marginBottom: 4 }}>
        ✦ {top.label}
      </div>
      <div style={{ fontSize: 13, color: '#1a1a18', lineHeight: 1.5 }}>
        {top.message}
      </div>
    </div>
  )
}

export default function DailyFocus({ checked = {}, setChecked, domainScores = {}, onBreathwork, selectedPhaseOverride = null, onPhaseSelect = null, isMobileProp = false, onOpenProgress = null, onboardingProfile = null }) {
  const today = getDateKey(new Date())
  const [selectedPhase, setSelectedPhase] = useState(selectedPhaseOverride)
  const [lastFeedback, setLastFeedback] = useState(null)
  const [completionEvents, setCompletionEvents] = useState([])
  const [dayStatus, setDayStatus] = usePersistentState('q_day_status', {})
  const [expandedPractice, setExpandedPractice] = React.useState(null)
  const [todayPlans, setTodayPlans] = usePersistentState('q_today_plan', {})
  const firstAlignmentTracked = useRef(false)

  useEffect(() => {
    if (selectedPhaseOverride) setSelectedPhase(selectedPhaseOverride)
  }, [selectedPhaseOverride])

  const isMissedToday = dayStatus?.[today]?.status === 'missed'
  const isRecoveryMode = dayStatus?.[today]?.status === 'active' && !!dayStatus?.[today]?.reopenedAt
  const hasCompletedDay = Object.values(dayStatus || {}).some(d => d?.status === 'locked')
  const showOnboarding = !hasCompletedDay && !isMissedToday
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

  const todayPlanSnapshot = todayPlans?.[today]
  // Guard: ensure domainScores has at least one valid numeric score before planning.
  // If onboarding data is corrupt, use neutral scores so the engine doesn't crash.
  const safeDomainScores = React.useMemo(() => {
    const hasValid = domainScores && typeof domainScores === 'object' &&
      Object.values(domainScores).some(v => typeof v === 'number' && v > 0)
    return hasValid ? domainScores : { d1: 5, d2: 5, d3: 5, d4: 5, d5: 5 }
  }, [domainScores])

  const basePlan = useMemo(() => {
    try {
      return generateTodayPlan({ domainScores: safeDomainScores, checked: effectiveChecked, dayStatus, phaseLocking: true })
    } catch (e) {
      console.error('generateTodayPlan failed:', e)
      return null
    }
  }, [safeDomainScores, effectiveChecked, dayStatus])

  useEffect(() => {
    const existing = todayPlans?.[today]
    if (existing?.version === TODAY_PLAN_VERSION && existing?.dateKey === today) return
    setTodayPlans(prev => ({
      ...(prev || {}),
      [today]: createTodayPlanSnapshot(basePlan, new Date())
    }))
  }, [today, todayPlans, basePlan, setTodayPlans])

  const plan = useMemo(() => {
    try {
      return generateTodayPlan({
        domainScores: safeDomainScores,
        checked: effectiveChecked,
        dayStatus,
        phaseLocking: true,
        planSnapshot: todayPlanSnapshot,
      })
    } catch (e) {
      console.error('generateTodayPlan (full) failed:', e)
      return null
    }
  }, [safeDomainScores, effectiveChecked, dayStatus, todayPlanSnapshot])

  // If plan generation failed, render a production-quality recovery state
  // Distinguishes between first-load (brief delay) and genuine failure
  const [planWaitCount, setPlanWaitCount] = React.useState(0)
  React.useEffect(() => {
    if (plan) return
    const t = setInterval(() => setPlanWaitCount(c => c + 1), 1000)
    return () => clearInterval(t)
  }, [plan])

  if (!plan) {
    const isLoading = planWaitCount < 4
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '60vh',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 16, opacity: isLoading ? 0.4 : 1 }}>
          {isLoading ? '◈' : '⚠'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a18', marginBottom: 8 }}>
          {isLoading ? 'Building your alignment plan...' : 'Something went wrong'}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>
          {isLoading
            ? 'This usually takes just a moment.'
            : 'The plan could not be generated. This can happen after a data sync or browser update. A refresh usually fixes it.'}
        </div>
        {!isLoading && (
          <>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 28px', borderRadius: 99, background: '#1a1a18',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, marginBottom: 12,
              }}>
              Refresh page
            </button>
            <button
              onClick={() => {
                // Clear plan cache and reload — fixes stale snapshot issues
                try { localStorage.removeItem('q_today_plan') } catch {}
                window.location.reload()
              }}
              style={{
                padding: '10px 20px', borderRadius: 99, background: 'transparent',
                color: '#888', border: '0.5px solid rgba(0,0,0,0.12)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
              Clear cache and reload
            </button>
          </>
        )}
      </div>
    )
  }

  // Coach messages — must be declared before any JSX that references them
  // ── Day 1 / Early User Detection ──────────────────────────────────────────
  const activeDayCount = React.useMemo(() => getActiveDayCount(checked), [checked])
  const totalCompleted = React.useMemo(() => getTotalCompleted(checked), [checked])
  const isDay1 = activeDayCount === 0 && totalCompleted === 0
  const isEarlyUser = activeDayCount < 7
  // Weakest domain from onboarding scores — used for Day 1 welcome card
  const primaryOnboardingDomain = React.useMemo(() => {
    const scores = onboardingProfile?.scores || {}
    const entries = Object.entries(scores).filter(([id]) => id !== 'd1')
    if (!entries.length) return 'd4'
    return entries.sort(([,a],[,b]) => a - b)[0][0]
  }, [onboardingProfile])

  const coachMessage = React.useMemo(() => {
    try { return getDailyCoachMessage(plan, dayStatus, domainScores) } catch { return null }
  }, [plan?.currentPhase, plan?.streak?.current, plan?.adaptations?.length])

  const patternBreakMessage = React.useMemo(() => {
    try { return getPatternBreakMessage(plan) } catch { return null }
  }, [plan?.patternBreaks?.length])

  const tomorrowCoachMessage = React.useMemo(() => {
    try { return getTomorrowCoachMessage(plan, dayStatus) } catch { return null }
  }, [plan?.completionState?.pct, plan?.streak?.current])


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


  useEffect(() => {
    if (!plan.completionState.dailyMinimumMet || firstAlignmentTracked.current) return
    const trackedKey = `q_first_alignment_tracked_${today}`
    if (localStorage.getItem(trackedKey) === '1') return
    firstAlignmentTracked.current = true
    localStorage.setItem(trackedKey, '1')
    trackEvent('first_alignment_completed', {
      date: today,
      requiredCompleted: plan.completionState.completeRequired,
      signal: plan.impactSummary?.totalImpact || 0,
      phase: activePhaseId,
    })
  }, [plan.completionState.dailyMinimumMet, plan.completionState.completeRequired, plan.impactSummary, activePhaseId, today])


  const reopenMissedDay = () => {
    trackEvent('alignment_reopened', { date: today })
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
    // Invalidate the pattern profile so tomorrow's recommendations reflect today's behavior
    try { invalidatePatternProfile() } catch {}
    const wasChecked = !!effectiveChecked?.[today]?.[item.key]
    setChecked(prev => ({
      ...prev,
      [today]: { ...(prev?.[today] || {}), [item.key]: !wasChecked }
    }))
    if (!wasChecked) {
      trackEvent('practice_completed', {
        date: today,
        practice: item.name,
        priority: item.priority,
        domain: item.domain?.name,
        key: item.key,
      })
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

  const windowWidth = useWindowWidth()
  const isMobile = isMobileProp || windowWidth < 768
  // Load pattern profile once per render — used by AdaptiveReasonCard for all practice items
  // Validates schema before returning — corrupt/partial profiles return null
  const patternProfile = React.useMemo(() => {
    try {
      const p = loadPatternProfile()
      if (!p || typeof p !== 'object') return null
      // Validate required shape — if missing key arrays, treat as corrupt
      if (!Array.isArray(p.avoidance) || !Array.isArray(p.momentum)) return null
      return p
    } catch { return null }
  }, [])

  // Causal narrative — multi-day explanation of why the plan looks like it does
  const causalNarrative = React.useMemo(() => {
    try { return getCausalNarrativeMessage(plan, patternProfile, checked, dayStatus) } catch { return null }
  }, [plan?.decision?.primaryBlockerId, plan?.behavioralIntel?.domainRisks?.length, patternProfile?.avoidance?.length, plan?.streak?.current])

  // Tomorrow prediction — computed once, shown in DayLockedIn area
  const tomorrowPred = React.useMemo(() => {
    try { return predictTomorrow(checked, dayStatus, domainScores) } catch { return null }
  }, [])
  const scrollRef = React.useRef(null)
  const [showStickyHeader, setShowStickyHeader] = React.useState(false)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || !isMobile) return
    const parent = el.closest('.app-shell') || document
    const scrollEl = parent === document ? window : parent
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      setShowStickyHeader(rect.top < -60)
    }
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const p = isMobile ? 14 : 20

  return (
    <div ref={scrollRef} className="today-card" style={{ background: '#fff', borderRadius: isMobile ? 14 : 16, border: bdr, padding: `${p}px ${p}px`, marginBottom: isMobile ? 100 : 16, boxShadow: '0 10px 26px rgba(0,0,0,0.035)' }}>

      {/* Sticky mini-header — appears on mobile after scrolling past the card */}
      {isMobile && showStickyHeader && (
        <div style={{
          position: 'fixed', top: 48, left: 0, right: 0, zIndex: 90,
          background: '#fff', borderBottom: bdr,
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18' }}>
            {plan.decision ? formatPhaseLabel(plan.decision.phaseSummary?.displayPhase || plan.decision.phaseSummary?.phase) : 'Alignment'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3C3489' }}>
              {plan.completionState.completeRequired}/{plan.dailyMinimum}
            </div>
            <div style={{ width: 80, height: 5, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${plan.completionState.pct}%`, height: 5, background: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#7F77DD', borderRadius: 999 }}/>
            </div>
          </div>
        </div>
      )}
    {/* On mobile, SystemReadPanel is collapsed by default with a tap-to-expand summary */}
    {isMobile ? (
      <MobileAlignmentRead decision={plan.decision} />
    ) : (
      <SystemReadPanel decision={plan.decision} />
    )}

    <AdaptiveIntelligenceBadge plan={plan} isMobile={isMobile} />
    {isDay1 && (
      <Day1WelcomeCard
        userName={onboardingProfile?.userName}
        primaryDomain={primaryOnboardingDomain}
        isMobile={isMobile}
      />
    )}
    {!isDay1 && isEarlyUser && (
      <BaselineProgressBar activeDayCount={activeDayCount} isMobile={isMobile} />
    )}
    <PatternBreakCoachCard message={patternBreakMessage} />
    <DailyCoachCard message={coachMessage} isMobile={isMobile} />
    <CausalNarrativeCard message={causalNarrative} isMobile={isMobile} />
      {showOnboarding && (
        <div style={{
          background: 'linear-gradient(135deg, #F4F6FB, #FCFBF8)',
          border: '1px solid #DFE3F0',
          borderRadius: 14,
          padding: '15px 16px',
          marginBottom: 16
        }}>
          <div style={{ fontSize: 15, fontWeight: 950, letterSpacing: '-0.02em', marginBottom: 7 }}>
            Start your first alignment
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.62, color: '#444' }}>
            <strong>1.</strong> Complete 2 Morning actions to initialize the day.<br />
            <strong>2.</strong> This unlocks Midday correction.<br />
            <strong>3.</strong> Complete the alignment with Evening integration.<br /><br />
            Locking the daily minimum builds momentum. Missing the alignment resets it.<br />
            <strong>Begin with the visible CRITICAL practice — it is today’s anchor.</strong>
          </div>
        </div>
      )}
      <div className="today-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: '-0.03em' }}>Today’s Alignment</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Complete today’s alignment. Minimum required: <strong>{plan.completionState.completeRequired}/{plan.dailyMinimum}</strong>. Signal generated: <strong>+{scorePreview}</strong>.
          </div>
        </div>
        <div className="status-pill" style={{
          fontSize: 12,
          fontWeight: 850,
          color: plan.failureState?.status === 'missed' ? '#712B13' : plan.completionState.dailyMinimumMet ? '#085041' : '#3C3489',
          background: plan.failureState?.status === 'missed' ? '#FAECE7' : plan.completionState.dailyMinimumMet ? '#E1F5EE' : '#EEEDFE',
          border: `1px solid ${plan.failureState?.status === 'missed' ? '#D85A3030' : plan.completionState.dailyMinimumMet ? '#1D9E7530' : '#7F77DD30'}`,
          borderRadius: 999,
          padding: '7px 11px',
          whiteSpace: 'nowrap'
        }}>
          {plan.failureState?.status === 'missed' ? 'Alignment Not Established' : plan.completionState.dailyMinimumMet ? 'Daily Minimum Complete ✓' : `Daily Minimum: ${plan.completionState.completeRequired}/${plan.dailyMinimum}`}
        </div>
      </div>

      <div style={{ height: 10, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden', marginBottom: 13 }}>
        <div style={{ width: `${plan.completionState.pct}%`, height: '100%', background: plan.completionState.dailyMinimumMet ? '#1D9E75' : '#7F77DD', transition: 'width 220ms ease' }} />
      </div>

      <StreakPanel plan={plan} isMobile={isMobile} />

      {isRecoveryMode && (
        <div style={{ background: '#FAEEDA', color: '#633806', border: '1px solid #BA751735', borderRadius: 10, padding: '9px 12px', marginBottom: 11, fontSize: 12, fontWeight: 800 }}>
          Recovery mode — rebuild today’s signal. Complete the daily minimum to lock the day in again.
        </div>
      )}

      {requestedWasLocked && (
        <div style={{ background: '#FAECE7', color: '#712B13', border: '1px solid #D85A3030', borderRadius: 10, padding: '9px 12px', marginBottom: 11, fontSize: 12 }}>
          {plan.phases[requestedPhaseId].label} is locked. {plan.phases[requestedPhaseId].lockReason} Showing {activePhase.label} first.
        </div>
      )}

      {/* Phase selector — single control for both mobile and desktop.
          Mobile: full-width buttons with status count. Desktop: compact pills. */}
      {isMobile ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {PHASES.map(p => {
            const ph = plan.phases[p.id]
            const isActive = activePhaseId === p.id
            const isLocked = !!ph?.locked
            const done = ph?.completion?.completeRequired ?? 0
            const req  = ph?.completion?.required ?? 0
            return (
              <button key={p.id}
                onClick={() => {
                  if (isLocked) return
                  setSelectedPhase(p.id)
                  if (onPhaseSelect) onPhaseSelect(p.id)
                }}
                disabled={isLocked}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: isActive ? '2px solid #1a1a18' : '1px solid rgba(0,0,0,0.1)',
                  background: isLocked ? '#F0EFEC' : isActive ? '#1a1a18' : '#fff',
                  color: isLocked ? '#AAA' : isActive ? '#fff' : '#555',
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.55 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  lineHeight: 1.2,
                }}
              >
                <span>{ph?.label || p.id}</span>
                <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>
                  {isLocked ? 'locked' : `${done}/${req}`}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="phase-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
          {PHASES.map(p => (
            <PhasePill
              key={p.id}
              phase={plan.phases[p.id]}
              active={activePhaseId === p.id}
              onClick={() => setSelectedPhase(p.id)}
            />
          ))}
        </div>
      )}

      <div style={{
        background: activePhase.locked ? '#FAECE7' : '#F8F7F4',
        border: bdr,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 12
      }}>
        {isMobile ? (
          /* Mobile: stronger hierarchy — count first, directive second */
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: activePhase.locked ? '#D85A30' : '#7F77DD', marginBottom: 6 }}>
              {activePhase.label} · {activePhase.role}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 22, fontWeight: 950, color: '#1a1a18', lineHeight: 1 }}>
                {activePhase.completion.required - activePhase.completion.completeRequired}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>
                {activePhase.completion.required - activePhase.completion.completeRequired === 1 ? 'action remaining' : 'actions remaining'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>
              {activePhase.id === 'morning'
                ? "Set the day's signal before it sets itself."
                : activePhase.id === 'midday'
                  ? 'Correct drift before the day runs you.'
                  : 'Integrate and prime tomorrow.'}
            </div>
          </div>
        ) : (
          <div className="day-locked-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: activePhase.locked ? '#D85A30' : '#555' }}>
                {activePhase.label} · {activePhase.role}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4, lineHeight: 1.45 }}>
                {activePhase.id === 'morning'
                  ? `Complete ${activePhase.completion.required} Morning actions to set the day's signal.`
                  : activePhase.id === 'midday'
                    ? 'Correct drift and interrupt automatic loops before the day runs you.'
                    : 'Complete the alignment, integrate the signal, and prime tomorrow.'}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 850, color: '#1a1a18', whiteSpace: 'nowrap' }}>
              {activePhase.completion.completeRequired}/{activePhase.completion.required}
            </div>
          </div>
        )}
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

      {activePhase.items.map((item, itemIndex) => {
        const isExpanded = expandedPractice === item.key
        const isFirstPractice = isDay1 && itemIndex === 0 && !item.isDone
        return (
        <div className="practice-row" key={`${activePhase.id}-${item.key}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 11,
          padding: isMobile ? (item.priority === 'Critical' ? '6px 0' : '4px 0') : (item.priority === 'Critical' ? '13px 0' : '11px 0'),
          borderBottom: bdr,
          background: item.priority === 'Critical' && !item.isDone ? 'linear-gradient(90deg, rgba(216,90,48,0.055), transparent 60%)' : 'transparent',
          borderRadius: item.priority === 'Critical' ? 10 : 0,
          outline: isFirstPractice ? '2px solid #7F77DD' : 'none',
          outlineOffset: isFirstPractice ? 6 : 0,
          position: 'relative',
        }}>
          {isFirstPractice && (
            <div style={{
              position: 'absolute',
              top: -20,
              left: 0,
              fontSize: 10,
              fontWeight: 800,
              color: '#7F77DD',
              background: '#F3F1FF',
              padding: '2px 8px',
              borderRadius: 99,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              zIndex: 1,
            }}>◈ Start here</div>
          )}
          <button className="practice-check tap-target" onClick={() => handleCheck(item)} disabled={isMissedToday}
            title={isMissedToday ? 'This day is closed as missed. Resume alignment tomorrow.' : item.isDone ? 'Mark incomplete' : 'Mark complete'}
            style={{
              width: isMobile ? 17 : 24,
              height: isMobile ? 17 : 24,
              borderRadius: '50%',
              border: `1.5px solid ${item.priority === 'Critical' ? '#D85A30' : item.domain.color}`,
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
            {/* Practice header row — always visible */}
            <div
              onClick={() => isMobile && setExpandedPractice(isExpanded ? null : item.key)}
              style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 6, flexWrap: 'wrap', cursor: isMobile ? 'pointer' : 'default' }}
            >
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: '#1a1a18' }}>{item.name}</span>
              <PriorityBadge priority={item.priority} />
              {item.highLeverage && (
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#FFF3E0', border: '1px solid #FFB74D55', color: '#E65100', fontWeight: 900, whiteSpace: 'nowrap' }}>⚡</span>
              )}
              <span style={{ fontSize: 10, padding: isMobile ? '2px 5px' : '2px 7px', borderRadius: 99, background: item.domain.bg, color: item.domain.text }}>{item.domain.name}</span>
              <span style={{ fontSize: 10, padding: isMobile ? '2px 5px' : '2px 7px', borderRadius: 99, background: '#F7F6F3', color: '#666', border: bdr, fontWeight: 800 }}>+{item.scoreTotal || 0}</span>
              {isMobile && <span style={{ fontSize: 10, color: '#bbb', marginLeft: 'auto' }}>{isExpanded ? '▲' : '▼'}</span>}
            </div>
            {/* Detail — always visible on desktop, accordion on mobile */}
            {(!isMobile || isExpanded) && (
              <>
                <div style={{ fontSize: 10, color: '#777', marginTop: isMobile ? 3 : 5, fontWeight: 800 }}>Why</div>
                <div style={{ fontSize: 12, color: item.domain.color, marginTop: 2 }}>{item.why}</div>
                {item.highLeverage && item.leverageLabel && (
                  <div style={{ fontSize: 11, color: '#BA7517', marginTop: 3, fontWeight: 800 }}>⚡ {item.leverageLabel}</div>
                )}
              </>
            )}
            {/* Adaptive reason — practice-specific only; system context already in alignment read */}
            <AdaptiveReasonCard
              item={item}
              decision={plan.decision}
              patternProfile={patternProfile}
              isMobile={isMobile}
              suppressSystemContext={true}
            />
            {item.isDone && <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 3 }}>✓ {item.identityFeedback}</div>}
            {item.isDone && (
              <PracticeQualityRating
                practiceKey={item.key}
                dateKey={today}
                isMobile={isMobile}
              />
            )}
          </div>
          {item.hasTimer && (
            <button onClick={onBreathwork}
              style={{ fontSize: 11, padding: '5px 9px', borderRadius: 8, border: `0.5px solid ${item.domain.color}40`, background: item.domain.bg, color: item.domain.text, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}>
              Start
            </button>
          )}
        </div>
        )
      })}

      {plan.completionState.dailyMinimumMet ? (
        <>
          <DayLockedIn plan={plan} />
          <TomorrowPredictionMini pred={tomorrowPred} onOpenProgress={onOpenProgress} isMobile={isMobile} tomorrowCoachMessage={tomorrowCoachMessage} />
        </>
      ) : (
        <>
          <FailureState plan={plan} onReopen={reopenMissedDay} />
          <TomorrowPrime plan={plan} />
        </>
      )}

      <BetaFeedbackLayer plan={plan} isMobile={isMobile} />
    </div>
  )
}
