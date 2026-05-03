import React, { useState, useRef, useEffect } from 'react'
import { useLocalStorage as useLS } from './state/useLocalStorage'
import Onboarding from '../features/onboarding/Onboarding'
import { PROTOCOLS } from '../data/protocols'
import SystemMap from '../features/system/SystemMap'
import DomainDeepDive from '../features/domains/DomainDeepDive'
import Foundation from '../features/foundation/Foundation'
import MorningMode from '../features/modes/MorningMode'
import MiddayMode from '../features/modes/MiddayMode'
import EveningMode from '../features/modes/EveningMode'
import CoherenceSignature from '../features/signature/CoherenceSignature'
import { DOMAINS, PRACTICES, COHERENCE_STATES, getCoherenceState, getCoherenceScore as _getCoherenceScore } from '../data'
import ProgressTab from '../features/progress/ProgressTab'
import DailyFocus from '../features/dashboard/DailyFocus'
import Programs from '../features/programs/Programs'
import NoiseAudit from '../features/modes/NoiseAudit'
import PractitionerView from '../features/practitioner/PractitionerView'
import HistoryTab from '../features/history/HistoryTab'
import ScheduleTab from '../features/schedule/ScheduleTab'
import AnalyticsTab from '../features/analytics/AnalyticsTab'
import FrequencyLayer from '../features/frequency/FrequencyLayer'
import { trackEvent, trackAppOpen, readEvents, getAnalyticsSummary, clearAnalytics } from './utils/analytics'

// Local fallback in case of import resolution issues on some browsers
const getCoherenceScore = (scores) => {
  if (typeof _getCoherenceScore === 'function') return _getCoherenceScore(scores)
  const s1 = (scores?.d1 || 0) * 1.5
  const s2 = (scores?.d2 || 0) + (scores?.d3 || 0) + (scores?.d4 || 0) + (scores?.d5 || 0)
  return Math.round((s1 + s2) / 6.5)
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// DOMAINS imported from data.js

// PRACTICES imported from data.js

// Pre-compute cross-impact leverage counts for each practice
const LEVERAGE_MAP = (() => {
  const map = {}
  Object.entries(PRACTICES).forEach(([domId, pracs]) => {
    pracs.forEach((p, i) => {
      map[`${domId}_${i}`] = (p.cross || []).length
    })
  })
  return map
})()

// Top 5 highest-leverage practice keys
const HIGH_LEVERAGE_KEYS = (() => {
  return Object.entries(LEVERAGE_MAP)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
})()

const BREATHWORK_PATTERNS = [
  { name: 'Box Breathing', inhale: 4, hold1: 4, exhale: 4, hold2: 4, rounds: 8, desc: 'Stress regulation & focus' },
  { name: '4-7-8', inhale: 4, hold1: 7, exhale: 8, hold2: 0, rounds: 6, desc: 'Relaxation & sleep prep' },
  { name: 'Coherence', inhale: 5, hold1: 0, exhale: 5, hold2: 0, rounds: 10, desc: 'HRV & nervous system balance' },
  { name: 'Energizing', inhale: 6, hold1: 0, exhale: 2, hold2: 0, rounds: 12, desc: 'Energy & alertness' },
]

const SCHEDULE = [
  { time: 'Morning', items: [
    { name: 'Affirmation Installation', dur: '5 min', domains: ['d1','d4','d5'] },
    { name: 'Stillness Exposure', dur: '15–20 min', domains: ['d1','d3','d4','d5'] },
    { name: 'Breathwork', dur: '5–10 min', domains: ['d1','d2','d3'] },
    { name: 'Morning Directive', dur: '5 min', domains: ['d4','d5'] },
    { name: 'Visualization Practice', dur: '10 min', domains: ['d1','d3','d4','d5'] },
  ]},
  { time: 'Midday', items: [
    { name: 'Training / Mobility', dur: '30–45 min', domains: ['d2','d3'] },
    { name: 'Protein Target', dur: 'Every meal', domains: ['d2'] },
    { name: 'Deep Work Block', dur: '60–90 min', domains: ['d4'] },
    { name: '5 Recall Triggers', dur: 'Real-time', domains: ['d1','d5'] },
    { name: 'Thought Audit', dur: '5 min', domains: ['d4','d5'] },
  ]},
  { time: 'Evening', items: [
    { name: 'Emotional Log', dur: '5 min', domains: ['d3','d4'] },
    { name: 'Gratitude + Reframe', dur: '5 min', domains: ['d3','d4'] },
    { name: 'Trigger Mapping', dur: '15–30 min', domains: ['d3','d4','d5'] },
    { name: 'Pre-Sleep Programming', dur: '5 min', domains: ['d4','d5'] },
    { name: 'Sleep 7h+', dur: '7–9 hours', domains: ['d2','d3','d4','d5'] },
  ]},
  { time: 'Weekly', items: [
    { name: 'Theta / Shadow Work', dur: '3–4x/week', domains: ['d1','d5'] },
    { name: 'Non-Local Body Scan', dur: '2–3x/week', domains: ['d1','d2','d3'] },
    { name: 'Belief Audit', dur: 'Weekly', domains: ['d4','d5'] },
    { name: 'Identity Decompression', dur: '3 prompts', domains: ['d1','d4','d5'] },
    { name: 'Controlled Stress Exposure', dur: '2–5 min', domains: ['d2','d3','d5'] },
  ]},
]

const DAYS = ['S','M','T','W','T','F','S']
const tk = () => new Date().toDateString()

// ─── Storage is handled by src/app/state/useLocalStorage.js ──────────────────

// ─── Breathwork Timer ─────────────────────────────────────────────────────────

function BreathworkTimer({ onClose }) {
  const [pattern, setPattern] = useState(0)
  const [phase, setPhase] = useState('ready') // ready, inhale, hold1, exhale, hold2, done
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)
  const p = BREATHWORK_PATTERNS[pattern]

  const phases = ['inhale','hold1','exhale','hold2'].filter(ph => p[ph] > 0)
  const phaseLabels = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' }
  const phaseColors = { inhale: '#7F77DD', hold1: '#378ADD', exhale: '#1D9E75', hold2: '#BA7517' }

  const stop = () => {
    clearInterval(intervalRef.current)
    setPhase('ready'); setCount(0); setRound(0); setProgress(0)
  }

  const start = () => {
    setRound(1); setPhase('inhale'); setCount(p.inhale); setProgress(0)
  }

  useEffect(() => {
    if (phase === 'ready' || phase === 'done') return
    clearInterval(intervalRef.current)
    let c = phase === 'inhale' ? p.inhale : phase === 'hold1' ? p.hold1 : phase === 'exhale' ? p.exhale : p.hold2
    setCount(c)
    setProgress(0)
    const total = c
    intervalRef.current = setInterval(() => {
      setCount(prev => {
        setProgress(((total - prev + 1) / total) * 100)
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          const idx = phases.indexOf(phase)
          if (idx === phases.length - 1) {
            const nextRound = round + 1
            if (nextRound > p.rounds) { setPhase('done'); return 0 }
            setRound(nextRound); setPhase(phases[0])
          } else {
            setPhase(phases[idx + 1])
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase, pattern])

  const circumference = 2 * Math.PI * 54
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Breathwork Timer</div>
          <button onClick={() => { stop(); onClose() }} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {BREATHWORK_PATTERNS.map((bp, i) => (
            <button key={i} onClick={() => { stop(); setPattern(i) }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: bdr, background: pattern === i ? '#1a1a18' : '#fff', color: pattern === i ? '#fff' : '#5F5E5A', cursor: 'pointer' }}>
              {bp.name}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 20, textAlign: 'center' }}>{p.desc} · {p.rounds} rounds</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg width={130} height={130} viewBox="0 0 130 130">
            <circle cx={65} cy={65} r={54} fill="none" stroke="#EEEDE9" strokeWidth={8}/>
            <circle cx={65} cy={65} r={54} fill="none"
              stroke={phase !== 'ready' && phase !== 'done' ? phaseColors[phase] : '#EEEDE9'}
              strokeWidth={8} strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              strokeLinecap="round" transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.5s, stroke 0.3s' }}/>
            <text x={65} y={58} textAnchor="middle" fontSize={28} fontWeight={700} fill="#1a1a18">
              {phase === 'ready' ? '·' : phase === 'done' ? '✓' : count}
            </text>
            <text x={65} y={76} textAnchor="middle" fontSize={12} fill="#888">
              {phase === 'ready' ? 'Ready' : phase === 'done' ? 'Complete' : phaseLabels[phase]}
            </text>
            {phase !== 'ready' && phase !== 'done' && (
              <text x={65} y={92} textAnchor="middle" fontSize={10} fill="#aaa">Round {round}/{p.rounds}</text>
            )}
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {phase === 'ready' || phase === 'done' ? (
            <button onClick={start} style={{ padding: '10px 32px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              {phase === 'done' ? 'Again' : 'Start'}
            </button>
          ) : (
            <button onClick={stop} style={{ padding: '10px 32px', borderRadius: 10, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer' }}>Stop</button>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
          {phases.map(ph => (
            <div key={ph} style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: phaseColors[ph] }}>{p[ph]}s</div>
              <div>{phaseLabels[ph]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ scores }) {
  const size = 300
  const cx = size / 2, cy = size / 2, r = 95
  const n = DOMAINS.length
  const labelR = r + 38

  const angle = (i) => (i * 2 * Math.PI / n) - Math.PI / 2

  const gridPts = (frac) => DOMAINS.map((_, i) => {
    const a = angle(i)
    return `${(cx + r * frac * Math.cos(a)).toFixed(1)},${(cy + r * frac * Math.sin(a)).toFixed(1)}`
  }).join(' ')

  const dataPts = DOMAINS.map((d, i) => {
    const a = angle(i)
    const pct = Math.max((scores[d.id] || 0) / 100, 0.03)
    return { x: cx + r * pct * Math.cos(a), y: cy + r * pct * Math.sin(a), a }
  })

  const spokePts = DOMAINS.map((_, i) => {
    const a = angle(i)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })

  const labelPts = DOMAINS.map((d, i) => {
    const a = angle(i)
    return {
      x: cx + labelR * Math.cos(a),
      y: cy + labelR * Math.sin(a),
      anchor: Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end',
      name: d.name,
      color: d.color,
      score: scores[d.id] || 0,
    }
  })

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1].map(f => (
        <polygon key={f} points={gridPts(f)} fill="none" stroke={f===1?"#D5D3CE":"#ECEAE5"} strokeWidth={f===1?1:0.6}/>
      ))}
      {spokePts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E0DEDB" strokeWidth={0.8}/>
      ))}
      <polygon points={dataPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="rgba(127,119,221,0.13)" stroke="#7F77DD" strokeWidth={2} strokeLinejoin="round"/>
      {dataPts.map((p,i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4.5} fill={DOMAINS[i].color} stroke="#fff" strokeWidth={1.5}/>
      ))}
      {labelPts.map((p,i) => (
        <text key={i} textAnchor={p.anchor} fontSize={10} fontFamily="-apple-system,sans-serif">
          <tspan x={p.x} y={p.y} fontWeight={600} fill="#2C2C2A">{p.name.split(' ')[0]}</tspan>
          {p.name.split(' ').length > 1 && (
            <tspan x={p.x} dy={13} fontWeight={600} fill="#2C2C2A">{p.name.split(' ').slice(1).join(' ')}</tspan>
          )}
          <tspan x={p.x} dy={13} fill={p.color} fontWeight={700} fontSize={11}>{p.score}%</tspan>
        </text>
      ))}
      {[25,50,75].map(pct => (
        <text key={pct} x={cx+3} y={cy - r*(pct/100) + 3} fontSize={7} fill="#C0BEBA">{pct}</text>
      ))}
    </svg>
  )
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendChart({ checked }) {
  const totalCount = Object.values(PRACTICES).flat().length
  const days = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const dk = d.toDateString()
    const dc = checked[dk] || {}
    const done = DOMAINS.reduce((acc, dom) => acc + PRACTICES[dom.id].filter((_,j) => dc[`${dom.id}_${j}`]).length, 0)
    days.push({ date: dk, pct: Math.round((done / totalCount) * 100), label: d.getDate() })
  }
  const w = 320, h = 80, pad = 8
  const xStep = (w - pad * 2) / (days.length - 1)
  const pts = days.map((d, i) => ({ x: pad + i * xStep, y: h - pad - (d.pct / 100) * (h - pad * 2) }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length-1].x},${h-pad} L${pts[0].x},${h-pad} Z`

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7F77DD" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#7F77DD" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,25,50,75,100].map(pct => (
          <line key={pct} x1={pad} y1={h - pad - (pct/100)*(h-pad*2)} x2={w-pad} y2={h - pad - (pct/100)*(h-pad*2)}
            stroke="#EEEDE9" strokeWidth={0.5}/>
        ))}
        <path d={areaD} fill="url(#trendGrad)"/>
        <path d={pathD} fill="none" stroke="#7F77DD" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
        {pts.filter((_, i) => i % 7 === 0 || i === pts.length - 1).map((p, i, arr) => (
          <text key={i} x={p.x} y={h} textAnchor="middle" fontSize={8} fill="#aaa">{days[i === arr.length-1 ? 29 : i*7].label}</text>
        ))}
        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3} fill="#7F77DD"/>
        <text x={pts[pts.length-1].x + 6} y={pts[pts.length-1].y + 4} fontSize={9} fill="#7F77DD" fontWeight={600}>
          {days[days.length-1].pct}%
        </text>
      </svg>
    </div>
  )
}

// ─── Weekly Review Modal ──────────────────────────────────────────────────────

function WeeklyReview({ onClose, checked }) {
  const [answers, setAnswers] = useLS('q_weekly_review', {})
  const weekKey = `week_${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`
  const current = answers[weekKey] || {}
  const [local, setLocal] = useState(current)

  const questions = [
    { key: 'worked', q: 'What shifted or opened in you this week across the five frequency bodies?' },
    { key: 'repeated', q: 'What interference patterns repeated? Where did old Code run the show?' },
    { key: 'insight', q: 'What was the most significant moment of coherence or clarity this week?' },
    { key: 'next', q: 'What is the one tuning adjustment that will matter most next week?' },
  ]

  const totalCount = Object.values(PRACTICES).flat().length
  const weekScores = DOMAINS.map(d => {
    let total = 0, days = 0
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(today); dt.setDate(today.getDate() - i)
      const dc = checked[dt.toDateString()] || {}
      const done = PRACTICES[d.id].filter((_,j) => dc[`${d.id}_${j}`]).length
      total += Math.round((done / PRACTICES[d.id].length) * 100)
      days++
    }
    return { ...d, avg: Math.round(total / days) }
  })

  const save = () => {
    setAnswers({ ...answers, [weekKey]: local })
    onClose()
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Weekly Review</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Weekly coherence reflection — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#5F5E5A', marginBottom: 10 }}>7-day resonance averages</div>
          {weekScores.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#5F5E5A', width: 110, flexShrink: 0 }}>{d.name}</div>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#EEEDE9', overflow: 'hidden' }}>
                <div style={{ height: 6, borderRadius: 99, background: d.color, width: `${d.avg}%`, transition: 'width 0.4s' }}/>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, minWidth: 32, textAlign: 'right' }}>{d.avg}%</div>
            </div>
          ))}
        </div>

        {questions.map(({ key, q }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18', marginBottom: 6 }}>{q}</div>
            <textarea value={local[key] || ''} onChange={e => setLocal({ ...local, [key]: e.target.value })}
              rows={3} placeholder="Write your reflection..."
              style={{ width: '100%', fontSize: 13, color: '#1a1a18', background: '#F7F6F3', border: bdr, borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}/>
          </div>
        ))}

        <button onClick={save} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Save my reflection
        </button>
      </div>
    </div>
  )
}

// ─── Notification Settings ────────────────────────────────────────────────────

function NotificationSettings({ onClose }) {
  const [notifSettings, setNotifSettings] = useLS('q_notifs', { morning: '07:00', evening: '20:00', enabled: false })
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState(notifSupported ? Notification.permission : 'denied')

  const requestPermission = async () => {
    if (!notifSupported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setNotifSettings({ ...notifSettings, enabled: true })
      new Notification('Quintave', { body: 'Reminders enabled!', icon: '/icon.svg' })
    }
  }

  const scheduleTest = () => {
    if (!notifSupported || permission !== 'granted') return
    setTimeout(() => {
      new Notification('Quintave Morning Check-in', { body: 'Time to set your Morning Directive and begin your daily practice.', icon: '/icon.svg' })
    }, 3000)
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Daily reminders</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {permission === 'denied' && (
          <div style={{ background: '#FCEBEB', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A32D2D' }}>
            Notifications are blocked in your browser. Go to browser settings → Site settings → Notifications to allow them for this site.
          </div>
        )}

        {permission === 'default' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 12, lineHeight: 1.6 }}>
              Enable browser notifications to receive daily reminders for your morning and evening practice sessions.
            </div>
            <button onClick={requestPermission} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Enable notifications
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <>
            <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#085041' }}>
              ✓ Notifications enabled
            </div>
            <div style={{ background: '#F7F6F3', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18', marginBottom: 6 }}>Scheduled reminders — coming soon</div>
              <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.7 }}>
                Time-based reminders are in development. For now, the most reliable approach is to add Quintave to your phone's home screen and open it as part of your morning routine — before any other app.
              </div>
            </div>
            <div style={{ background: '#EEEDFE', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#3C3489', marginBottom: 6 }}>The most effective reminder</div>
              <div style={{ fontSize: 12, color: '#3C3489', lineHeight: 1.7, opacity: 0.85 }}>
                Place the Quintave icon on the first screen of your phone. The moment you pick up your phone in the morning, it will be there. That visual cue is more reliable than any notification.
              </div>
            </div>
            <button onClick={scheduleTest} style={{ width: '100%', padding: '10px', borderRadius: 10, border: bdr, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Send test notification (3 sec)
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Practice Row ─────────────────────────────────────────────────────────────

function PRow({ p, pk, domain, checked, onCheck, metrics, onMetric, ratings, onRating, notes, onNote, onBreathwork, isHighLeverage }) {
  const today = tk()
  const isDone = checked[today]?.[pk] || false
  const [open, setOpen] = useState(false)
  const [showProtocol, setShowProtocol] = useState(false)
  const [saved, setSaved] = useState(false)
  const proto = PROTOCOLS[p.name]
  const [localNote, setLocalNote] = useState(notes[`${pk}::${today}`] || '')

  // Compute consecutive streak for this practice
  const practiceStreak = (() => {
    let s = 0; const now = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      const dk = d.toDateString()
      if (checked[dk]?.[pk]) s++
      else if (i > 0) break
    }
    return s
  })()
  const timer = useRef(null)
  const rating = ratings[`${pk}::r::${today}`] || 0
  const metricVal = metrics[`${pk}::${today}`] || ''
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  const history = Object.keys(notes)
    .filter(k => k.startsWith(`${pk}::`) && !k.includes('::r::') && notes[k]?.trim() && !k.endsWith(today))
    .sort((a,b) => new Date(b.split('::')[1]) - new Date(a.split('::')[1])).slice(0,3)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1200) }
  const handleNote = v => {
    setLocalNote(v); clearTimeout(timer.current)
    timer.current = setTimeout(() => { onNote(`${pk}::${today}`, v); flash() }, 600)
  }

  return (
    <div style={{ borderBottom: bdr, paddingBottom: open ? 12 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
        <div onClick={() => onCheck(pk)} style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${isDone ? domain.color : 'rgba(0,0,0,0.2)'}`, background: isDone ? domain.color : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDone && <svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: isDone ? '#888' : '#1a1a18', textDecoration: isDone ? 'line-through' : 'none' }}>{p.name}</div>
            {isHighLeverage && !isDone && (
              <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#FFF3E0', border: '0.5px solid #FFB74D', color: '#E65100', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span>⚡</span><span>High leverage</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Target: {p.target}{p.cross?.length ? ` · ripples to ${p.cross.length} dimension${p.cross.length > 1 ? 's' : ''}` : ''}</span>
            {practiceStreak > 0 && (
              <span style={{ color: practiceStreak >= 21 ? '#7F77DD' : practiceStreak >= 7 ? '#D85A30' : '#1D9E75', fontWeight: 600 }}>
                {practiceStreak >= 21 ? '⚡' : practiceStreak >= 7 ? '🔥' : '✦'} {practiceStreak}d
              </span>
            )}
          </div>
        </div>
        {p.hasTimer && (
          <button onClick={onBreathwork}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `0.5px solid ${domain.color}40`, background: domain.bg, color: domain.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ▶ Timer
          </button>
        )}
        <input value={metricVal} onChange={e => { onMetric(`${pk}::${today}`, e.target.value); flash() }}
          placeholder={p.metric}
          style={{ width: 140, fontSize: 12, color: '#1a1a18', background: '#F7F6F3', border: bdr, borderRadius: 7, padding: '6px 9px', fontFamily: 'inherit', outline: 'none' }}/>
        {proto && (
          <button onClick={() => setShowProtocol(v => !v)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: showProtocol ? `0.5px solid ${domain.color}60` : bdr, background: showProtocol ? domain.bg : 'transparent', color: showProtocol ? domain.text : '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {showProtocol ? 'close' : 'how?'}
          </button>
        )}
        <button onClick={() => setOpen(v => !v)}
          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: open ? `0.5px solid ${domain.color}60` : bdr, background: open ? domain.bg : 'transparent', color: open ? domain.text : '#888', cursor: 'pointer' }}>
          {open ? 'close' : 'log'}
        </button>
      </div>

      {showProtocol && proto && (
        <div style={{ margin: '0 0 10px 30px', background: domain.bg, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${domain.color}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: domain.text, marginBottom: 10 }}>Why this works</div>
          <div style={{ fontSize: 12, color: domain.text, lineHeight: 1.7, marginBottom: 14, opacity: 0.9 }}>{proto.why}</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: domain.text, marginBottom: 8 }}>3-step protocol</div>
          {proto.steps.map((step, si) => (
            <div key={si} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: domain.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{si + 1}</div>
              <div style={{ fontSize: 12, color: domain.text, lineHeight: 1.65, opacity: 0.9 }}>{step}</div>
            </div>
          ))}
          <div style={{ borderTop: `0.5px solid ${domain.color}30`, paddingTop: 10, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: domain.text, marginBottom: 6 }}>Beginner version (5 min)</div>
            <div style={{ fontSize: 12, color: domain.text, lineHeight: 1.65, opacity: 0.85 }}>{proto.beginner}</div>
          </div>
          <div style={{ borderTop: `0.5px solid ${domain.color}30`, paddingTop: 10, marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: domain.text, marginBottom: 4 }}>What to measure</div>
            <div style={{ fontSize: 12, color: domain.text, lineHeight: 1.65, opacity: 0.85 }}>{proto.measure}</div>
          </div>
        </div>
      )}

      {open && (
        <div style={{ paddingLeft: 30, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#888' }}>Session depth</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({length:10},(_,i) => (
                <div key={i} onClick={() => { onRating(`${pk}::r::${today}`, i+1); flash() }}
                  style={{ width: 18, height: 18, borderRadius: 4, cursor: 'pointer', background: i < rating ? domain.color : '#EEEDE9', border: `0.5px solid ${i < rating ? 'transparent' : 'rgba(0,0,0,0.08)'}`, transition: 'all 0.1s' }}/>
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, minWidth: 28 }}>{rating > 0 ? `${rating}/10` : '—'}</span>
          </div>
          <textarea value={localNote} onChange={e => handleNote(e.target.value)} rows={2}
            placeholder="What arose during this practice? What shifted?"
            style={{ width: '100%', fontSize: 13, color: '#1a1a18', background: '#F7F6F3', border: bdr, borderRadius: 8, padding: '7px 10px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: 2 }}/>
          <div style={{ fontSize: 11, color: '#1D9E75', minHeight: 14, marginBottom: 4 }}>{saved ? 'Saved ✓' : ''}</div>
          {history.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Previous sessions</div>
              {history.map(k => {
                const d = k.split('::')[1]; const rv = ratings[`${pk}::r::${d}`] || 0
                return <div key={k} style={{ fontSize: 12, color: '#5F5E5A', borderTop: bdr, paddingTop: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#888' }}>{d}{rv > 0 ? ` · ${rv}/10` : ''} — </span>{notes[k]}
                </div>
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Domain Card ──────────────────────────────────────────────────────────────

function DCard({ domain, checked, onCheck, metrics, onMetric, ratings, onRating, notes, onNote, onBreathwork, crossImpact, onDeepDive }) {
  const today = tk()
  const total = PRACTICES[domain.id].length
  const done = PRACTICES[domain.id].filter((_, i) => checked[today]?.[`${domain.id}_${i}`]).length
  const pct = Math.round((done/total)*100)
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onDeepDive}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: domain.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: domain.text, flexShrink: 0 }}>{domain.icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18', display: 'flex', alignItems: 'center', gap: 6 }}>
              {domain.name}
              <span style={{ fontSize: 10, color: domain.color, fontWeight: 500, opacity: 0.7 }}>deep dive →</span>
            </div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4, maxWidth: 380 }}>{domain.desc}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: pct > 0 ? domain.color : '#E24B4A' }}>{pct}%</div>
          {(() => {
            const directDone = PRACTICES[domain.id].filter((_,i) => checked[tk()]?.[`${domain.id}_${i}`]).length
            const crossPct = Math.round((Math.min(crossImpact?.[domain.id] || 0, PRACTICES[domain.id].length * 0.5) / PRACTICES[domain.id].length) * 100)
            return crossPct > 0 && directDone === 0 ? (
              <div style={{ fontSize: 9, color: domain.color, fontWeight: 600, letterSpacing: '0.04em', opacity: 0.8 }}>+{crossPct}% CROSS-IMPACT</div>
            ) : null
          })()}
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#EEEDE9', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: 5, borderRadius: 99, background: domain.color, width: `${pct}%`, transition: 'width 0.4s' }}/>
      </div>
      {PRACTICES[domain.id].map((p, i) => (
        <PRow key={i} p={p} pk={`${domain.id}_${i}`} domain={domain}
          checked={checked} onCheck={onCheck}
          metrics={metrics} onMetric={onMetric}
          ratings={ratings} onRating={onRating}
          notes={notes} onNote={onNote}
          onBreathwork={onBreathwork}
          isHighLeverage={HIGH_LEVERAGE_KEYS.includes(`${domain.id}_${i}`)}/>
      ))}
    </div>
  )
}

// ─── Trigger Map ──────────────────────────────────────────────────────────────

function TriggerMap({ triggers, setTriggers }) {
  const today = tk()
  const list = triggers[today] || []
  const add = () => setTriggers({ ...triggers, [today]: [...list, { trigger:'', emotion:'', intensity:'', replacement:'', overridden: false }] })
  const update = (i, f, v) => setTriggers({ ...triggers, [today]: list.map((t,idx) => idx===i ? {...t,[f]:v} : t) })
  const remove = (i) => setTriggers({ ...triggers, [today]: list.filter((_,idx) => idx!==i) })
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>◈ Interference Map</div>
        <button onClick={add} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
      </div>
      {list.length === 0 && <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '12px 0' }}>No triggers mapped today.</div>}
      {list.map((t, i) => (
        <div key={i} style={{ background: '#F7F6F3', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#5F5E5A' }}>Trigger #{i+1}</span>
            <button onClick={() => remove(i)} style={{ fontSize: 12, color: '#E24B4A', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[['trigger','Trigger'],['emotion','Emotion'],['intensity','Intensity 1–10'],['replacement','Replacement pattern']].map(([f,ph]) => (
              <input key={f} value={t[f]} onChange={e => update(i,f,e.target.value)} placeholder={ph}
                style={{ fontSize: 13, color: '#1a1a18', background: '#fff', border: bdr, borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', outline: 'none' }}/>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#5F5E5A', cursor: 'pointer' }}>
            <input type="checkbox" checked={t.overridden} onChange={e => update(i,'overridden',e.target.checked)}/>
            Successful override
          </label>
        </div>
      ))}
    </div>
  )
}

// ─── Ring ─────────────────────────────────────────────────────────────────────

function Ring({ pct, size = 86 }) {
  const r = size * 0.38; const circ = 2 * Math.PI * r; const sw = size * 0.08
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EEEDE9" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a18" strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fontSize={size*0.19} fontWeight="700" fill="#1a1a18">{Math.round(pct)}%</text>
      <text x={size/2} y={size/2+15} textAnchor="middle" fontSize={size*0.1} fill="#888">daily</text>
    </svg>
  )
}
function FeedbackButton({ dailyPct, streakCount, weakest }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      <button
        onClick={() => {
          try {
            trackEvent('feedback_opened', { source: 'floating_button' })

            const feedback = prompt("What’s working? What’s confusing?")
            if (!feedback || !feedback.trim()) return

            const existing = JSON.parse(localStorage.getItem('q_feedback') || '[]')

            const entry = {
              text: feedback.trim(),
              date: new Date().toISOString(),
              state: {
                dailyPct,
                streak: streakCount,
                weakest: weakest?.name || weakest?.id || null,
              },
            }

            localStorage.setItem('q_feedback', JSON.stringify([...existing, entry]))
            alert('Feedback saved. Thank you.')
          } catch (e) {
            console.error('Feedback capture failed:', e)
            alert('Feedback could not be saved in this browser session.')
          }
        }}
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          border: '0.5px solid rgba(0,0,0,0.15)',
          background: '#1a1a18',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          opacity: 0.92,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1 }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.92 }}
      >
        Feedback
      </button>
    </div>
  )
}

function LaunchMetrics() {
  const [events, setEvents] = useState(() => readEvents())
  const summary = getAnalyticsSummary(events)
  const count = (name) => summary.counts[name] || 0
  const recent = [...events].slice(-12).reverse()
  const metricCard = (label, value, note) => (
    <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,0.08)', padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:'#777', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:800, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.04em' }}>{value}</div>
      {note && <div style={{ fontSize:12, color:'#777', marginTop:4, lineHeight:1.45 }}>{note}</div>}
    </div>
  )
  const exportEvents = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(events, null, 2)], { type:'application/json' }))
    a.download = `quintave_events_${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }
  return (
    <div>
      <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,0.08)', padding:'16px 18px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:11, color:'#777', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:900, marginBottom:4 }}>Launch instrumentation</div>
            <h2 style={{ margin:0, fontSize:22, letterSpacing:'-0.03em' }}>User action signals</h2>
            <div style={{ fontSize:13, color:'#666', marginTop:6, lineHeight:1.6 }}>Local-only event tracking for beta testing. Use this to validate landing visits, CTA clicks, app opens, first alignment completion, and next-day returns.</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => { setEvents(readEvents()) }} style={{ padding:'8px 14px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>Refresh</button>
            <button onClick={exportEvents} style={{ padding:'8px 14px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.08)', background:'#1a1a18', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>Export events</button>
            <button onClick={() => { if (confirm('Clear launch event log?')) { clearAnalytics(); setEvents([]) } }} style={{ padding:'8px 14px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>Clear events</button>
          </div>
        </div>
      </div>
      <div className="today-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12, marginBottom:14 }}>
        {metricCard('Landing visits', count('landing_visit'), 'Visitor reached /landing.html')}
        {metricCard('CTA clicks', count('landing_cta_click'), 'Visitor clicked into the app')}
        {metricCard('App opens', count('app_open'), `${summary.uniqueSessions} session${summary.uniqueSessions === 1 ? '' : 's'}`)}
        {metricCard('First alignments', count('first_alignment_completed'), 'First daily minimum completed')}
      </div>
      <div className="today-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12, marginBottom:14 }}>
        {metricCard('Next-day returns', count('return_next_day'), 'Opened again the following day')}
        {metricCard('Practices completed', count('practice_completed'), 'Total practice completions')}
        {metricCard('Feedback clicks', count('feedback_opened'), 'Users who opened feedback link')}
      </div>
      <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,0.08)', padding:'16px 18px' }}>
        <div style={{ fontSize:14, fontWeight:900, marginBottom:10 }}>Recent events</div>
        {recent.length === 0 ? (
          <div style={{ fontSize:13, color:'#777' }}>No events recorded yet.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recent.map(ev => (
              <div key={ev.id} style={{ display:'flex', justifyContent:'space-between', gap:12, borderBottom:'0.5px solid rgba(0,0,0,0.08)', paddingBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800 }}>{ev.name}</div>
                  <div style={{ fontSize:11, color:'#777' }}>{ev.path} · {ev.date}</div>
                </div>
                <div style={{ fontSize:11, color:'#777', whiteSpace:'nowrap' }}>{new Date(ev.ts).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// Global error handler for mobile
if (typeof window !== 'undefined') {
  window.onerror = (msg, src, line, col, err) => {
    console.error('App error:', msg, err)
    return false
  }
}

export default function App() {
  const [tab, setTab] = useState('today')
  const [todayPhaseOverride, setTodayPhaseOverride] = useState(null)
  const [checked,   setChecked]   = useLS('q_checked', {})
  const [weekDays,  setWeekDays]  = useLS('q_week', {})
  const [notes,     setNotes]     = useLS('q_notes', {})
  const [ratings,   setRatings]   = useLS('q_ratings', {})
  const [metrics,   setMetrics]   = useLS('q_metrics', {})
  const [directive, setDirective] = useLS('q_directive', {})
  const [execTarget,setExecTarget]= useLS('q_exec', {})
  const [evening,   setEvening]   = useLS('q_evening', {})
  const [weekAdj,   setWeekAdj]   = useLS('q_weekadj', {})
  const [triggers,  setTriggers]  = useLS('q_triggers', {})

  const [onboardingProfile, setOnboardingProfile] = useLS('q_onboarding', null)
  const [earnedMilestones, setEarnedMilestones] = useLS('q_milestones', [])
  const [showBreathwork, setShowBreathwork] = useState(false)
  const [showWeekly,     setShowWeekly]     = useState(false)
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [ripple,         setRipple]         = useState(null)
  const [milestone,      setMilestone]      = useState(null)
  const [openDomain,     setOpenDomain]     = useState(null)
  const [showMorning,    setShowMorning]    = useState(false)
  const [showSignature,  setShowSignature]  = useState(false)
  const [showNoise,      setShowNoise]      = useState(false)
  const [showPractitioner, setShowPractitioner] = useState(false)
  const [showMidday,     setShowMidday]     = useState(false)
  const [showEvening,    setShowEvening]    = useState(false)
  const [showTodayDetails, setShowTodayDetails] = useState(false)
  const rippleTimer  = useRef(null)
  const milestoneTimer = useRef(null)

  useEffect(() => { trackAppOpen() }, [])

  const today = tk()
  const todayChecks = checked[today] || {}
  const totalCount = Object.values(PRACTICES).flat().length
  const doneToday = DOMAINS.reduce((acc, d) => acc + PRACTICES[d.id].filter((_,i) => todayChecks[`${d.id}_${i}`]).length, 0)
  const dailyPct = Math.round((doneToday / totalCount) * 100)

  const triggerRate = (() => {
    const ts = triggers[today] || []; if (!ts.length) return 0
    return Math.round((ts.filter(t => t.overridden).length / ts.length) * 100)
  })()

  const streakCount = (() => {
    let s = 0; const now = new Date()
    for (let i = 0; i < 365; i++) { const d = new Date(now); d.setDate(now.getDate()-i); if (weekDays[d.toDateString()]) s++; else if (i>0) break }
    return s
  })()

  // Cross-impact scoring: completed practices ripple 25% credit to cross-tagged domains
  const crossImpact = DOMAINS.reduce((acc, d) => { acc[d.id] = 0; return acc }, {})
  Object.entries(PRACTICES).forEach(([domId, pracs]) => {
    pracs.forEach((p, i) => {
      if (todayChecks[`${domId}_${i}`] && p.cross?.length) {
        p.cross.forEach(crossDom => {
          crossImpact[crossDom] = (crossImpact[crossDom] || 0) + 0.25
        })
      }
    })
  })

  const domainScores = DOMAINS.reduce((acc, d) => {
    const tot = PRACTICES[d.id].length
    const directDone = PRACTICES[d.id].filter((_,i) => todayChecks[`${d.id}_${i}`]).length
    const crossBonus = Math.min(crossImpact[d.id] || 0, tot * 0.5) // cap cross-impact at 50% of total
    const effectiveDone = Math.min(directDone + crossBonus, tot)
    acc[d.id] = Math.round((effectiveDone / tot) * 100)
    return acc
  }, {})

  const strongest = DOMAINS.reduce((b, d) => domainScores[d.id] >= (b.score||0) ? {...d, score: domainScores[d.id]} : b, {})
  const weakest   = DOMAINS.reduce((b, d) => domainScores[d.id] <= (b.score??100) ? {...d, score: domainScores[d.id]} : b, {})

  // Coaching tip — based on weakest domain from onboarding or today's scores
  const coachingDomain = onboardingProfile
    ? ['d1','d2','d3','d4','d5'].reduce((w, id) => (onboardingProfile.scores[id] || 5) < (onboardingProfile.scores[w] || 5) ? id : w, 'd1')
    : weakest.id || 'd1'
  const COACHING_TIPS = {
    d1: 'Source is your tuning fork — and it is the frequency body asking for attention today. Begin with Stillness Exposure. Even 5 minutes of resting as the awareness beneath thought recalibrates every other dimension.',
    d2: 'Your Form frequency body is the platform everything else runs on. A depleted vessel cannot sustain coherence. Today: prioritize sleep quality, move your body, and fuel it with intention.',
    d3: 'Your Field is holding charge today. Unprocessed emotion is the most common source of incoherence — it distorts thought, suppresses Source access, and embeds into Code. Name one feeling you are carrying. Locate it in your body. Breathe into it.',
    d4: 'Your Mind frequency body is your primary tuning point today. Before reacting to anything external, set your Morning Directive. One deliberate intention is the difference between a day that happens to you and one you create.',
    d5: 'Your Code is the operating system running most of what happens today. One Pattern Interrupt — catching an automatic reaction and choosing differently — begins to rewrite the program. That gap between stimulus and response is where your freedom lives.',
  }

  // Weekly review prompt — show on Sundays or if not done this week
  const isSunday = new Date().getDay() === 0
  const weekKey = `week_${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`
  const [weeklyReviews] = useLS('q_weekly_review', {})
  const weeklyDue = isSunday && !weeklyReviews[weekKey]

  // Compute streak for a given practice key
  const getPracticeStreak = (pk) => {
    let streak = 0
    const now = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      if (checked[d.toDateString()]?.[pk]) streak++
      else if (i > 0) break
    }
    return streak
  }

  // Check and fire milestones
  const checkMilestones = (pk, newChecked) => {
    const MILESTONE_DEFS = [
      { id: 'first_practice',   label: 'First practice complete',      icon: '✦', check: () => true },
      { id: 'first_100',        label: 'First 100% day',               icon: '◎', check: () => {
        const total = Object.values(PRACTICES).flat().length
        const done = DOMAINS.reduce((a,d)=>a+PRACTICES[d.id].filter((_,j)=>newChecked[today]?.[`${d.id}_${j}`]).length, 0)
        return done >= total
      }},
      { id: `streak7_${pk}`,    label: `7-day streak: ${PRACTICES[pk.split('_')[0]]?.[parseInt(pk.split('_')[1])]?.name}`, icon: '🔥', check: () => getPracticeStreak(pk) >= 6 },
      { id: `streak21_${pk}`,   label: `21-day streak: ${PRACTICES[pk.split('_')[0]]?.[parseInt(pk.split('_')[1])]?.name} — habit installed`, icon: '⚡', check: () => getPracticeStreak(pk) >= 20 },
      { id: `streak30_${pk}`,   label: `30-day streak: ${PRACTICES[pk.split('_')[0]]?.[parseInt(pk.split('_')[1])]?.name}`, icon: '♦', check: () => getPracticeStreak(pk) >= 29 },
    ]
    for (const def of MILESTONE_DEFS) {
      if (!earnedMilestones.find(m => m.id === def.id) && def.check()) {
        const newMilestone = { id: def.id, label: def.label, icon: def.icon, date: new Date().toISOString() }
        setEarnedMilestones(prev => [...prev, newMilestone])
        clearTimeout(milestoneTimer.current)
        setMilestone(newMilestone)
        milestoneTimer.current = setTimeout(() => setMilestone(null), 5000)
        break // one milestone at a time
      }
    }
  }

  const handleCheck = pk => {
    const wasChecked = !!todayChecks[pk]
    const newChecked = { ...checked, [today]: { ...(checked[today]||{}), [pk]: !wasChecked }}
    setChecked(newChecked)
    // Mark today as an active day in the streak calendar
    if (!wasChecked) {
      setWeekDays(prev => ({ ...prev, [today]: true }))
      checkMilestones(pk, newChecked)
    }
    // Fire ripple if checking (not unchecking) and practice has cross-domain impacts
    if (!wasChecked) {
      const [domId, idxStr] = pk.split('_')
      const p = PRACTICES[domId]?.[parseInt(idxStr)]
      if (p?.cross?.length) {
        clearTimeout(rippleTimer.current)
        setRipple({ practice: p.name, domains: p.cross })
        rippleTimer.current = setTimeout(() => setRipple(null), 4500)
      }
    }
  }
  const handleMetric = (k,v) => setMetrics({ ...metrics, [k]:v })
  const handleRating = (k,v) => setRatings({ ...ratings, [k]:v })
  const handleNote   = (k,v) => setNotes({ ...notes, [k]:v })
  const toggleDay = dk => setWeekDays({ ...weekDays, [dk]: !weekDays[dk] })

  // Auto-compute active days from checked data
  const activeDays = Object.keys(checked).reduce((acc, dateStr) => {
    const dc = checked[dateStr] || {}
    const hasPractice = Object.values(dc).some(v => v === true)
    if (hasPractice) acc[dateStr] = true
    return acc
  }, {})

  const exportBackup = () => {
    let dayStatus = {}
    try { dayStatus = JSON.parse(localStorage.getItem('q_day_status') || '{}') } catch {}
    const data = { checked, weekDays, notes, ratings, metrics, directive, execTarget, evening, weekAdj, triggers, dayStatus, exported: new Date().toISOString() }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    a.download = `quintave_backup_${new Date().toISOString().slice(0,10)}.json`; a.click()
  }
  const exportNotes = () => {
    let out = 'QUINTAVE NOTES\nGenerated: ' + new Date().toLocaleString() + '\n' + '='.repeat(40) + '\n\n'
    DOMAINS.forEach(domain => {
      out += domain.name.toUpperCase() + '\n' + '-'.repeat(25) + '\n\n'
      PRACTICES[domain.id].forEach((p,i) => {
        const key=`${domain.id}_${i}`
        const entries=Object.keys(notes).filter(k=>k.startsWith(`${key}::`)&&!k.includes('::r::')&&notes[k]?.trim()).sort((a,b)=>new Date(b.split('::')[1])-new Date(a.split('::')[1]))
        if(entries.length){ out+=`  ${p.name}\n`; entries.forEach(k=>{const d=k.split('::')[1];const r=ratings[`${key}::r::${d}`]||0;out+=`  ${d}${r>0?` [${r}/10]`:''}\n  ${notes[k]}\n\n`})}
      })
    })
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'text/plain'}));a.download=`quintave_notes_${new Date().toISOString().slice(0,10)}.txt`;a.click()
  }
  const exportCSV = () => {
    let rows=['Date,Domain,Practice,Score,Metric,Completed,Note']
    DOMAINS.forEach(domain=>{PRACTICES[domain.id].forEach((p,i)=>{const key=`${domain.id}_${i}`;const dates=new Set();Object.keys(notes).filter(k=>k.startsWith(`${key}::`)&&!k.includes('::r::')).forEach(k=>dates.add(k.split('::')[1]));Object.keys(ratings).filter(k=>k.startsWith(`${key}::r::`)).forEach(k=>dates.add(k.split('::r::')[1]));Object.keys(checked).forEach(d=>{if(checked[d]?.[key])dates.add(d)});dates.forEach(d=>{const r=ratings[`${key}::r::${d}`]||'';const m=(metrics[`${key}::${d}`]||'').replace(/"/g,'""');const n=(notes[`${key}::${d}`]||'').replace(/"/g,'""');const done=checked[d]?.[key]?'yes':'no';rows.push(`"${d}","${domain.name}","${p.name}",${r},"${m}","${done}","${n}"`)})})})
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));a.download=`quintave_scores_${new Date().toISOString().slice(0,10)}.csv`;a.click()
  }
  const importBackup = e => {
    const file=e.target.files[0];if(!file)return
    const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.checked)setChecked(d.checked);if(d.weekDays)setWeekDays(d.weekDays);if(d.notes)setNotes(d.notes);if(d.ratings)setRatings(d.ratings);if(d.metrics)setMetrics(d.metrics);if(d.directive)setDirective(d.directive);if(d.execTarget)setExecTarget(d.execTarget);if(d.evening)setEvening(d.evening);if(d.weekAdj)setWeekAdj(d.weekAdj);if(d.triggers)setTriggers(d.triggers);if(d.dayStatus)localStorage.setItem('q_day_status', JSON.stringify(d.dayStatus));alert('Backup restored.')}catch{alert('Invalid file.')}};r.readAsText(file)
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const card = { background:'#fff', borderRadius:14, border:bdr, padding:'16px 18px', marginBottom:14 }

  // Gate: show onboarding if not completed
  if (!onboardingProfile) {
    return <Onboarding onComplete={(profile) => setOnboardingProfile(profile)} />
  }

  const displayName = onboardingProfile?.userName?.trim().split(' ')[0] || ''

  const handleTabChange = (nextTab) => {
    setTab(nextTab)
    trackEvent('tab_viewed', { tab: nextTab })
  }

  const openFeedback = () => {
    trackEvent('feedback_opened', { source: 'topbar' })
    const subject = encodeURIComponent('Quintave beta feedback')
    const body = encodeURIComponent('What worked?\n\nWhat felt confusing?\n\nWhat would make Quintave easier to use daily?\n')
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="app-shell">
      <style>{`
        @keyframes rippleFadeIn { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        .app-shell { min-height: 100vh; background: #F4F3F0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color: #1a1a18; }
        .app-container { max-width: 1060px; margin: 0 auto; padding: 24px 18px; }
        .topbar, .tabbar, .phase-tabs { -webkit-overflow-scrolling: touch; }
        .tap-target { min-height: 44px; }
        .mobile-details-toggle { display:none; }
        @media (max-width: 760px) {
          .app-container { padding: 14px 10px 24px; }
          .app-greeting { font-size: 18px !important; line-height: 1.15; }
          .topbar { height: 46px !important; padding: 0 8px !important; gap: 5px !important; }
          .topbar button, .topbar label { min-height: 34px !important; padding: 6px 10px !important; }
          .tabbar { padding: 0 8px !important; }
          .tabbar button { padding: 10px 12px !important; font-size: 12px !important; }
          .today-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .today-card { border-radius: 14px !important; padding: 14px 12px !important; margin-bottom: 12px !important; }
          .today-header { flex-direction: column !important; align-items: flex-start !important; }
          .status-pill { align-self: flex-start !important; }
          .phase-tabs { display:flex !important; overflow-x:auto !important; gap:8px !important; padding-bottom:8px !important; }
          .phase-pill { min-height: 42px !important; padding: 10px 13px !important; flex: 0 0 auto !important; }
          .practice-row { align-items: flex-start !important; padding: 14px 0 !important; }
          .practice-check { width: 34px !important; height: 34px !important; margin-top: 2px !important; }
          .day-locked-header { flex-direction: column !important; }
          .domain-impact-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .mobile-details-toggle { display:flex !important; }
          .desktop-details { display:none !important; }
          .mobile-hidden-by-default { display:none !important; }
          .signature-cta { justify-content: stretch !important; }
          .signature-cta button { width: 100% !important; justify-content: center !important; min-height:44px !important; }
          .secondary-card { padding: 14px !important; border-radius: 12px !important; }
        }
      `}</style>

      {showNoise && <NoiseAudit onClose={() => setShowNoise(false)}/>}
      {showPractitioner && (
        <div style={{ position:'fixed', inset:0, zIndex:700, overflowY:'auto' }}>
          <div style={{ position:'fixed', top:12, right:16, zIndex:800 }}>
            <button onClick={() => setShowPractitioner(false)}
              style={{ background:'#1a1a18', border:'none', borderRadius:8, padding:'8px 16px', color:'#fff', fontSize:13, cursor:'pointer' }}>
              ← Close
            </button>
          </div>
          <PractitionerView checked={checked} onboardingProfile={onboardingProfile}/>
        </div>
      )}
      {showSignature && (() => {
        // Build blended scores for signature — use onboarding baseline when no practices logged
        const sigScores = {}
        const hasAnyPractice = Object.values(domainScores).some(s => s > 0)
        DOMAINS.forEach(d => {
          const practiceScore = domainScores[d.id] || 0
          const baselineScore = onboardingProfile?.scores?.[d.id]
            ? Math.round((onboardingProfile.scores[d.id] / 10) * 100) : 50
          sigScores[d.id] = practiceScore > 0 ? practiceScore : baselineScore
        })
        const sigCoherence = getCoherenceScore(sigScores)
        return (
          <CoherenceSignature
            userName={onboardingProfile?.userName?.trim().split(' ')[0] || ''}
            domainScores={sigScores}
            coherenceScore={sigCoherence}
            onboardingProfile={onboardingProfile}
            onClose={() => setShowSignature(false)}/>
        )
      })()}
      {showMidday && (
        <MiddayMode
          onClose={() => setShowMidday(false)}
          checked={checked} setChecked={setChecked}/>
      )}
      {showEvening && (
        <EveningMode
          evening={evening} setEvening={setEvening}
          onClose={() => setShowEvening(false)}
          checked={checked} setChecked={setChecked}/>
      )}
      {showMorning && (
        <MorningMode
          checked={checked} setChecked={setChecked}
          directive={directive} setDirective={setDirective}
          onClose={() => setShowMorning(false)}/>
      )}
      {openDomain && (
        <DomainDeepDive
          domain={openDomain}
          checked={checked}
          metrics={metrics}
          ratings={ratings}
          notes={notes}
          onClose={() => setOpenDomain(null)}
          onCheck={handleCheck}/>
      )}
      {showBreathwork && <BreathworkTimer onClose={() => setShowBreathwork(false)}/>}
      {showWeekly && <WeeklyReview onClose={() => setShowWeekly(false)} checked={checked}/>}
      {showNotifs && <NotificationSettings onClose={() => setShowNotifs(false)}/>}

      {weeklyDue && (
        <div style={{ background: '#4A3FB5', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span>🌟 Sunday — time for your weekly review</span>
          <button onClick={() => setShowWeekly(true)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#fff', color: '#4A3FB5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Open review</button>
        </div>
      )}

      {/* Ripple notification banner */}
      {ripple && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, maxWidth: 480, width: 'calc(100% - 48px)',
          background: '#1a1a18', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', animation: 'rippleFadeIn 0.3s ease' }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{ripple.practice} is rippling</div>
            <div style={{ fontSize: 12, color: '#888780' }}>
              Cross-impact credit flowing to {ripple.domains.map(id => DOMAINS.find(d => d.id === id)?.name).join(', ')}
            </div>
          </div>
          <button onClick={() => { clearTimeout(rippleTimer.current); setRipple(null) }}
            style={{ background: 'none', border: 'none', color: '#888780', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Milestone celebration banner */}
      {milestone && (
        <div style={{ position: 'fixed', bottom: ripple ? 90 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: 998, maxWidth: 480, width: 'calc(100% - 48px)',
          background: 'linear-gradient(135deg, #4A3FB5, #7F77DD)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 8px 32px rgba(74,63,181,0.4)', animation: 'rippleFadeIn 0.3s ease' }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>{milestone.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>Milestone reached</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{milestone.label}</div>
          </div>
          <button onClick={() => { clearTimeout(milestoneTimer.current); setMilestone(null) }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Topbar — single scrollable row */}
      <div className="topbar" style={{ background:'#fff', borderBottom:bdr, position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', gap:6, padding:'0 14px', height:48, overflowX:'auto', msOverflowStyle:'none', scrollbarWidth:'none' }}>
        <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.03em', flexShrink:0, marginRight:2 }}>Quintave</div>
        <button onClick={() => { setTodayPhaseOverride('morning'); handleTabChange('today') }} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#1a1a18', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>☀ Morning</button>
        <button onClick={() => { setTodayPhaseOverride('midday'); handleTabChange('today') }} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#1D9E75', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>◈ Midday</button>
        <button onClick={() => { setTodayPhaseOverride('evening'); handleTabChange('today') }} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#7F77DD', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>☽ Evening</button>
        <button onClick={() => setShowSignature(true)} style={{ padding:'5px 10px', borderRadius:7, border:'1.5px solid #7F77DD', background:'#EEEDFE', color:'#3C3489', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>✦ Signature</button>
        <button onClick={() => setShowNoise(true)} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#FAEEDA', color:'#633806', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>∿ Noise</button>
        <button onClick={() => setShowPractitioner(true)} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#E6F1FB', color:'#0C447C', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>◈ Coach</button>
        <button onClick={() => setShowBreathwork(true)} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Breathwork</button>
        <button onClick={() => setShowWeekly(true)} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Review</button>
        <button onClick={() => setShowNotifs(true)} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Reminders</button>
        <button onClick={openFeedback} style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#F8F7F4', color:'#1a1a18', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>Feedback</button>
        <button onClick={exportBackup} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#1a1a18', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:500, whiteSpace:'nowrap', flexShrink:0 }}>Save</button>
        <label style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
          Restore<input type="file" accept=".json" onChange={importBackup} style={{ display:'none' }}/>
        </label>
        <button onClick={() => { if(window.confirm('Clear today\'s practice? This cannot be undone.')) setChecked({...checked,[today]:{}}) }}
          style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>Clear</button>
      </div>

      {/* Tab bar */}
      <div className="tabbar" style={{ background:'#fff', borderBottom:bdr, padding:'0 16px', display:'flex', overflowX:'auto', msOverflowStyle:'none', scrollbarWidth:'none' }}>
        {[['today','Today'],['library','Practice Library'],['progress','Progress'],['analytics','Analytics'],['frequency','Frequency'],['launch','Launch'],['history','History'],['map','System Map'],['foundation','Foundation'],['schedule','Schedule'],['programs','Programs']].map(([id,lbl]) => (
          <button key={id} onClick={() => handleTabChange(id)}
            style={{ padding:'10px 16px', fontSize:13, cursor:'pointer', border:'none', background:'none', color: tab===id ? '#1a1a18' : '#888', fontWeight: tab===id ? 600 : 400, borderBottom: tab===id ? '2px solid #1a1a18' : '2px solid transparent', whiteSpace:'nowrap' }}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="app-container">

        {/* ── TODAY ── */}
        {tab === 'today' && <>
          <div style={{ marginBottom:20 }}>
            <div className="app-greeting" style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.03em', marginBottom:2 }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}{displayName ? `, ${displayName}` : ''}.
            </div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>Five frequency bodies. One daily tuning practice.</div>

            {/* Today Engine — primary alignment flow */}
            <DailyFocus
              checked={checked || {}}
              setChecked={setChecked}
              onboardingProfile={onboardingProfile}
              domainScores={domainScores || {}}
              onBreathwork={() => setShowBreathwork(true)}
              selectedPhaseOverride={todayPhaseOverride}/>

            <div style={{ background: '#EEEDFE', borderRadius:10, padding:'12px 16px', borderLeft:'3px solid #7F77DD' }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#3C3489', marginBottom:4 }}>Today's tuning focus</div>
              <div style={{ fontSize:13, color:'#3C3489', lineHeight:1.6 }}>{COACHING_TIPS[coachingDomain]}</div>
            </div>
          </div>

          <div className="today-grid" style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, marginBottom:16, alignItems:'stretch' }}>
            <div style={{ ...card, marginBottom:0, display:'flex', gap:18, alignItems:'center' }}>
              <Ring pct={dailyPct}/>
              <div>
                <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Tuning session</div>
                <input type="date" defaultValue={new Date().toISOString().slice(0,10)}
                  style={{ width:140, fontSize:13, color:'#1a1a18', background:'#F7F6F3', border:bdr, borderRadius:7, padding:'6px 9px', fontFamily:'inherit', outline:'none', marginBottom:10 }}/>
                <div style={{ display:'flex', gap:18 }}>
                  <div><div style={{ fontSize:16, fontWeight:700 }}>{doneToday}/{totalCount}</div><div style={{ fontSize:11, color:'#888' }}>Practices tuned</div></div>
                  <div><div style={{ fontSize:16, fontWeight:700, color: triggerRate>0?'#1D9E75':'#1a1a18' }}>{triggerRate}%</div><div style={{ fontSize:11, color:'#888' }}>Pattern overrides</div></div>
                </div>
              </div>
            </div>

            <div style={{ ...card, marginBottom:0 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>◉ Morning Directive</div>
              <input value={directive[today]||''} onChange={e=>setDirective({...directive,[today]:e.target.value})}
                placeholder="Today I intend to be / feel / create..."
                style={{ width:'100%', fontSize:13, color:'#1a1a18', background:'#F7F6F3', border:bdr, borderRadius:8, padding:'8px 10px', fontFamily:'inherit', outline:'none', marginBottom:8 }}/>
              <input value={execTarget[today]||''} onChange={e=>setExecTarget({...execTarget,[today]:e.target.value})}
                placeholder="The one action that matters most today"
                style={{ width:'100%', fontSize:13, color:'#1a1a18', background:'#F7F6F3', border:bdr, borderRadius:8, padding:'8px 10px', fontFamily:'inherit', outline:'none' }}/>
            </div>

            <div style={{ ...card, marginBottom:0, minWidth:190 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>⊡ Resonance Pulse</div>
              {doneToday === 0 ? (
                <div style={{ fontSize:12, color:'#888', textAlign:'center', padding:'8px 0', lineHeight:1.6 }}>
                  Complete practices to see your resonance pulse.
                </div>
              ) : <>
                <div style={{ background: strongest.bg||'#F7F6F3', borderRadius:8, padding:'8px 10px', marginBottom:8 }}>
                  <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>Highest resonance</div>
                  <div style={{ fontSize:13, fontWeight:600, color: strongest.text||'#1a1a18' }}>{strongest.name||'—'}: {strongest.score||0}%</div>
                </div>
                <div style={{ background: weakest.bg||'#FCEBEB', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'#888', marginBottom:2 }}>Primary interference</div>
                  <div style={{ fontSize:13, fontWeight:600, color: weakest.text||'#A32D2D' }}>{weakest.name||'—'}: {weakest.score||0}%</div>
                </div>
              </>}
            </div>
          </div>

          {/* Active program indicator */}
          {(() => {
            const ap = (() => { try { return JSON.parse(localStorage.getItem('q_active_program') || 'null') } catch { return null } })()
            if (!ap) return null
            const PROG_COLORS = { gentle: { color:'#1D9E75', bg:'#E1F5EE', text:'#085041', icon:'♥' }, full: { color:'#7F77DD', bg:'#EEEDFE', text:'#3C3489', icon:'◈' }, mastery: { color:'#D85A30', bg:'#FAECE7', text:'#712B13', icon:'✦' } }
            const pc = PROG_COLORS[ap.id] || PROG_COLORS.gentle
            const daysPassed = Math.floor((Date.now() - new Date(ap.startDate)) / (1000*60*60*24))
            const WEEK_FOCUSES = {
              gentle: ['Establish the rhythm','Deepen the anchor','Notice the interference','Integration'],
              full: ['Full system orientation','Primary interference work','Cross-domain integration','Rhythm deepening','Code work','Source anchoring','Field clearing','Full coherence'],
              mastery: ['Commitment installation','Morning Mode daily','Code excavation','Field completion','Source deepening','Form optimization','Intent installation','Relationship field','Shadow integration','Coherence consolidation','Expansion','Embodiment']
            }
            const focuses = WEEK_FOCUSES[ap.id] || WEEK_FOCUSES.gentle
            const currentWeek = Math.min(Math.ceil((daysPassed + 1) / 7), focuses.length)
            const weekFocus = focuses[currentWeek - 1]
            return (
              <div style={{ background: pc.bg, borderRadius: 10, border: `1px solid ${pc.color}30`, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{pc.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: pc.color, marginBottom: 2 }}>
                    {ap.name} · Day {daysPassed + 1} · Week {currentWeek}
                  </div>
                  <div style={{ fontSize: 12, color: pc.text }}>{weekFocus}</div>
                </div>
                <button onClick={() => setTab('programs')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `0.5px solid ${pc.color}40`, background: 'rgba(255,255,255,0.6)', color: pc.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>View →</button>
              </div>
            )
          })()}

          {/* Week 1 guided path — shows for first 7 days only */}
          {(() => {
            if (!onboardingProfile?.completedAt) return null
            const daysSince = Math.floor((Date.now() - new Date(onboardingProfile.completedAt)) / (1000*60*60*24))
            if (daysSince > 7) return null
            const dayNum = daysSince + 1
            const WEEK1 = [
              { day:1, domain:'d1', practice:'Stillness Exposure', why:'Start with Source — the anchor of everything else. Even 5 minutes of stillness sets the frequency for your entire day.' },
              { day:2, domain:'d2', practice:'Breathwork', why:'Tune the nervous system. Box breathing in the morning calibrates your stress response for the whole day.' },
              { day:3, domain:'d3', practice:'Name + Locate Emotion', why:'Begin reading your Field. Once a day, name one emotion and place your hand on where you feel it.' },
              { day:4, domain:'d4', practice:'Morning Directive', why:'Claim the day before it claims you. One intention, written before you touch your phone.' },
              { day:5, domain:'d5', practice:'Pattern Interrupt', why:'Choose one automatic reaction to interrupt today. The gap between stimulus and response is where your freedom lives.' },
              { day:6, domain:'d1', practice:'Observer Drill', why:'Deepen your Source practice. Count each moment you catch yourself lost in thought — that catching is the work.' },
              { day:7, domain:'d2', practice:'Sleep 7h+', why:'Complete week one by anchoring Form. Tonight: consistent bedtime, no screens, cool room. The body is the platform everything runs on.' },
            ]
            const todayGuidance = WEEK1.find(w => w.day === Math.min(dayNum, 7))
            if (!todayGuidance) return null
            const guidanceDomain = DOMAINS.find(d => d.id === todayGuidance.domain)
            return (
              <div style={{ background: guidanceDomain.bg, borderRadius:12, border:`1px solid ${guidanceDomain.color}30`, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:guidanceDomain.color, marginBottom:6 }}>
                  Week 1 · Day {dayNum} of 7 — Your guided starting point
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:guidanceDomain.text, marginBottom:6 }}>
                  {guidanceDomain.icon} {todayGuidance.practice}
                </div>
                <div style={{ fontSize:13, color:guidanceDomain.text, lineHeight:1.65, opacity:0.85 }}>
                  {todayGuidance.why}
                </div>
                <div style={{ fontSize:11, color:guidanceDomain.color, marginTop:8, opacity:0.6 }}>
                  This card disappears after day 7 — by then you will know where to begin on your own.
                </div>
              </div>
            )
          })()}

          {/* Signature CTA */}
          <div className="signature-cta" style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button onClick={() => setShowSignature(true)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:99, border:'1.5px solid #7F77DD', background:'#EEEDFE', color:'#3C3489', fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'-0.01em' }}>
              <span style={{ fontSize:14 }}>✦</span>
              <span>View my coherence signature</span>
            </button>
          </div>

          <div className="mobile-details-toggle" style={{ display:'none', justifyContent:'stretch', marginBottom:12 }}>
            <button onClick={() => setShowTodayDetails(v => !v)}
              style={{ width:'100%', minHeight:44, borderRadius:10, border:bdr, background:'#fff', color:'#1a1a18', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              {showTodayDetails ? 'Hide supporting details' : 'Show supporting details'}
            </button>
          </div>

          {/* Cross-impact legend */}
          {Object.values(crossImpact).some(v => v > 0) && (
            <div className={showTodayDetails ? '' : 'desktop-details'} style={{ background:'#fff', borderRadius:10, border:bdr, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#1a1a18' }}>⚡ Ripple field active:</div>
              {DOMAINS.filter(d => crossImpact[d.id] > 0).map(d => (
                <div key={d.id} style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:d.bg, color:d.text, fontWeight:500 }}>
                  {d.name} +{Math.round(Math.min(crossImpact[d.id], PRACTICES[d.id].length * 0.5) / PRACTICES[d.id].length * 100)}%
                </div>
              ))}
            </div>
          )}

          <div className={showTodayDetails ? 'secondary-card' : 'desktop-details secondary-card'} style={{ ...card, marginTop:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Need the full practice library?</div>
              <div style={{ fontSize:12, color:'#666', lineHeight:1.5 }}>Today is now focused on the alignment flow. The complete domain practice cards live in Practice Library.</div>
            </div>
            <button onClick={() => handleTabChange('library')} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #1a1a18', background:'#1a1a18', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>Open Practice Library</button>
          </div>

          <div className={showTodayDetails ? '' : 'desktop-details'}><TriggerMap triggers={triggers} setTriggers={setTriggers}/></div>

          <div className={showTodayDetails ? 'today-grid' : 'desktop-details today-grid'} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>▽ Field Integration</div>
              <textarea value={evening[today]||''} onChange={e=>setEvening({...evening,[today]:e.target.value})}
                placeholder="What shifted in me today? What interference arose and how did I meet it? What wants attention tomorrow?"
                rows={5} style={{ width:'100%', fontSize:13, color:'#1a1a18', background:'#F7F6F3', border:bdr, borderRadius:8, padding:'8px 10px', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.6 }}/>
            </div>
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>One-variable tuning adjustment</div>
              <input value={weekAdj[today]||''} onChange={e=>setWeekAdj({...weekAdj,[today]:e.target.value})}
                placeholder="One small change that will improve my coherence next week..."
                style={{ width:'100%', fontSize:13, color:'#1a1a18', background:'#F7F6F3', border:bdr, borderRadius:8, padding:'8px 10px', fontFamily:'inherit', outline:'none', marginBottom:12 }}/>
              <div style={{ fontSize:12, color:'#5F5E5A', background:'#F7F6F3', borderRadius:8, padding:'10px 12px', lineHeight:1.6 }}>
                <strong>Data is stored locally.</strong> Use Save data before clearing your browser or switching devices.
              </div>
            </div>
          </div>
        </>}

        {/* ── PRACTICE LIBRARY — FULL DOMAIN PRACTICES ── */}
        {tab === 'library' && <>
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#777', marginBottom:4 }}>Practice Library</div>
                <h2 style={{ margin:0, fontSize:22, letterSpacing:'-0.03em' }}>All domain practices</h2>
              </div>
              <button onClick={() => handleTabChange('today')} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #1a1a18', background:'#1a1a18', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Return to Today</button>
            </div>
            <div style={{ fontSize:13, color:'#666', lineHeight:1.6 }}>
              Use this area for exploration, manual tuning, and full-domain work. The Today page remains the focused alignment flow.
            </div>
          </div>

          {DOMAINS.map(domain => (
            <DCard key={domain.id} domain={domain}
              checked={checked} onCheck={handleCheck}
              metrics={metrics} onMetric={handleMetric}
              ratings={ratings} onRating={handleRating}
              notes={notes} onNote={handleNote}
              onBreathwork={() => setShowBreathwork(true)}
              crossImpact={crossImpact}
              onDeepDive={() => setOpenDomain(domain)}/>
          ))}
        </>}

        {/* ── ANALYTICS — COHERENCE FRAMEWORK ── */}
        {tab === 'analytics' && <AnalyticsTab
          checked={checked || {}}
          onboardingProfile={onboardingProfile}
          domainScores={domainScores || {}}
          dailyPct={dailyPct || 0}
          streakCount={streakCount || 0}
          triggerRate={triggerRate || 0}
          setShowSignature={setShowSignature}
          setOnboardingProfile={setOnboardingProfile}
          exportNotes={exportNotes}
          exportCSV={exportCSV}
          exportBackup={exportBackup}/>}


        {tab === 'frequency' && <FrequencyLayer
          checked={checked || {}}
          onboardingProfile={onboardingProfile}
          domainScores={domainScores || {}}
        />}

        {tab === 'launch' && <LaunchMetrics />}

        {/* ── HISTORY ── */}
        {tab === 'history' && <HistoryTab
          checked={checked || {}}
          directive={directive || {}}
          evening={evening || {}}
          earnedMilestones={earnedMilestones || []}/>}

        
        {/* ── SYSTEM MAP ── */}
        {tab === 'map' && <SystemMap domainScores={domainScores} onboardingProfile={onboardingProfile}/>}

        {/* ── FOUNDATION ── */}
        {tab === 'foundation' && <Foundation/>}

        {/* ── PROGRAMS ── */}
        {tab === 'progress' && <ProgressTab
          checked={checked || {}}
          onboardingProfile={onboardingProfile}
          earnedMilestones={earnedMilestones || []}
          domainScores={domainScores || {}}/>}

        {tab === 'programs' && <Programs checked={checked} domainScores={domainScores} onboardingProfile={onboardingProfile}/>}

        {/* ── SCHEDULE — adaptive ── */}
        {tab === 'schedule' && <ScheduleTab checked={checked}/>}

      </div>

      <FeedbackButton dailyPct={dailyPct} streakCount={streakCount} weakest={weakest} />
    </div>
  )
}
