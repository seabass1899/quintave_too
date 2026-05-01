import React, { useState } from 'react'
import { DOMAINS, COHERENCE_STATES } from '../../data'

// Inline coherence score — avoids import resolution issues on some mobile browsers
const getCoherenceScore = (scores) => {
  const s1 = (scores?.d1 || 0) * 1.5
  const s2 = (scores?.d2 || 0) + (scores?.d3 || 0) + (scores?.d4 || 0) + (scores?.d5 || 0)
  return Math.round((s1 + s2) / 6.5)
}
const getCoherenceState = (score) => {
  const states = [
    { label:'Scattered', min:0, max:20, color:'#E24B4A', bg:'#FCEBEB' },
    { label:'Stirring', min:21, max:40, color:'#BA7517', bg:'#FAEEDA' },
    { label:'Grounding', min:41, max:60, color:'#378ADD', bg:'#E6F1FB' },
    { label:'Aligning', min:61, max:80, color:'#7F77DD', bg:'#EEEDFE' },
    { label:'Whole', min:81, max:100, color:'#1D9E75', bg:'#E1F5EE' },
  ]
  return states.find(s => score >= s.min && score <= s.max) || states[0]
}

const FOCUS_MODE_PRACTICES = {
  d1: 'Stillness Exposure',
  d2: 'Breathwork',
  d3: 'Name + Locate Emotion',
  d4: 'Morning Directive',
  d5: 'Pattern Interrupt',
}

const INTERFERENCE_INSIGHTS = {
  d1: 'Source is your primary interference — the tuning fork itself. When Source access is low, the other four bodies have no reference frequency. They oscillate without anchor. This is always the highest-leverage place to begin. As Source resonance rises, everything else stabilizes faster.',
  d2: 'Form is your primary interference — the physical platform. The body is what everything else runs on. Chronic depletion in Form suppresses Source access, amplifies emotional reactivity, and undermines every conscious intention. Restore the vessel first.',
  d3: 'Field is your primary interference — the emotional body. Stored emotional charge is the most common source of incoherence. It distorts perception, scrambles thought, and embeds directly into Code as behavioral programs. Clearing the Field opens space in every other dimension.',
  d4: 'Mind is your primary interference — the conscious director. Without deliberate mental direction, the mind defaults to the subconscious Code — which means the past continuously programs the present. A clear Mind is what separates intention from outcome.',
  d5: 'Code is your primary interference — the operating system. Unexamined subconscious programs run 95% of behavior below the threshold of awareness. They override conscious intentions, generate the invisible ceiling on what feels possible, and replicate old experiences in new situations.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────


// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ total, current, color }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: '#888' }}>Question {current} of {total}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{Math.round((current / total) * 100)}% complete</div>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: '#E5E3DE', overflow: 'hidden' }}>
        <div style={{ height: 4, borderRadius: 99, background: color || '#1a1a18', width: `${(current / total) * 100}%`, transition: 'width 0.4s ease' }}/>
      </div>
    </div>
  )
}

function FrequencySlider({ value, onChange, color, low, high }) {
  const label = value <= 2 ? 'Deep distortion' : value <= 4 ? 'Interference active' : value <= 6 ? 'Partial resonance' : value <= 8 ? 'Strong resonance' : 'Full coherence'
  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input type="range" min={1} max={10} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: color, cursor: 'pointer' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <div key={n} onClick={() => onChange(n)}
              style={{ fontSize: 10, color: n === value ? color : '#C0BEBA', fontWeight: n === value ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{n}</div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F7F6F3', borderRadius: 99, padding: '6px 16px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}/>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{value}/10 — {label}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#F7F6F3', borderRadius: 10, padding: '10px 12px', border: bdr }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Low resonance (1–3)</div>
          <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.5 }}>{low}</div>
        </div>
        <div style={{ background: '#F7F6F3', borderRadius: 10, padding: '10px 12px', border: bdr }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>High resonance (8–10)</div>
          <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.5 }}>{high}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  // flat question index across all 15 questions
  const [questionIdx, setQuestionIdx] = useState(-1) // -1 = welcome
  const [scores, setScores] = useState({
    d1: [5, 5, 5], d2: [5, 5, 5], d3: [5, 5, 5], d4: [5, 5, 5], d5: [5, 5, 5],
  })
  const [userName, setUserName] = useState('')
  const [focusMode, setFocusMode] = useState(null)
  const [phase, setPhase] = useState('welcome') // welcome | questions | name | results
  const [animating, setAnimating] = useState(false)

  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const card = { background: '#fff', borderRadius: 16, border: bdr, padding: '28px 32px' }
  const wrapper = {
    minHeight: '100vh', background: '#F4F3F0',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    color: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px',
  }
  const inner = {
    width: '100%', maxWidth: 560,
    opacity: animating ? 0 : 1,
    transform: animating ? 'translateY(10px)' : 'translateY(0)',
    transition: 'all 0.22s ease',
  }

  // Build flat list of onboarding questions
  const allQuestions = DOMAINS.flatMap(domain =>
    (domain.questions || []).map((q, qi) => ({ domain, q, qi, domainQIdx: qi }))
  )

  const totalQuestions = allQuestions.length
  const currentQ = questionIdx >= 0 && questionIdx < totalQuestions ? allQuestions[questionIdx] : null

  // Compute domain average scores (1-10)
  const domainAvg = (id) => {
    const s = scores[id]
    return Math.round((s[0] + s[1] + s[2]) / 3)
  }

  const allDomainResults = DOMAINS.map(d => ({ ...d, score: domainAvg(d.id) }))
  const sorted = [...allDomainResults].sort((a, b) => a.score - b.score)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]

  // Weighted coherence score (Source 1.5x)
  const domainScoresForCalc = { d1: domainAvg('d1'), d2: domainAvg('d2'), d3: domainAvg('d3'), d4: domainAvg('d4'), d5: domainAvg('d5') }
  const overallScore = getCoherenceScore(domainScoresForCalc)
  const coherenceState = getCoherenceState(overallScore)

  const advance = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      if (phase === 'welcome') {
        setPhase('orient')
      } else if (phase === 'orient') {
        setPhase('questions')
        setQuestionIdx(0)
      } else if (phase === 'questions') {
        if (questionIdx < totalQuestions - 1) {
          setQuestionIdx(i => i + 1)
        } else {
          setPhase('name')
        }
      } else if (phase === 'name') {
        setPhase('results')
      }
      setAnimating(false)
    }, 220)
  }

  const back = () => {
    if (animating) return
    if (phase === 'questions' && questionIdx > 0) setQuestionIdx(i => i - 1)
    else if (phase === 'questions' && questionIdx === 0) setPhase('orient')
    else if (phase === 'orient') setPhase('welcome')
    else if (phase === 'name') { setPhase('questions'); setQuestionIdx(totalQuestions - 1) }
    else if (phase === 'results') setPhase('name')
  }

  const setScore = (domainId, qIdx, val) => {
    setScores(prev => ({ ...prev, [domainId]: prev[domainId].map((s, i) => i === qIdx ? val : s) }))
  }

  const handleComplete = (mode) => {
    const flatScores = {}
    DOMAINS.forEach(d => { flatScores[d.id] = domainAvg(d.id) })
    onComplete({
      userName,
      scores: flatScores,
      detailedScores: scores,
      weakestDomain: weakest.id,
      strongestDomain: strongest.id,
      overallScore,
      coherenceState: coherenceState.label,
      focusMode: mode,
      completedAt: new Date().toISOString(),
    })
  }

  // ── WELCOME ──────────────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div style={wrapper}>
        <div style={inner}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#888', textTransform: 'uppercase', marginBottom: 14 }}>A coherence instrument</div>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', color: '#1a1a18', marginBottom: 10 }}>Quintave</div>
            <div style={{ fontSize: 16, color: '#5F5E5A', lineHeight: 1.65, maxWidth: 360, margin: '0 auto' }}>
              Your best life is not built. It is revealed — when every part of you is in alignment.
            </div>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>You are a five-dimensional being.</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 20 }}>
              At your core is <strong>Source</strong> — the eternal, deathless self that needs no development. Around it orbit four frequency bodies: <strong>Form</strong>, <strong>Field</strong>, <strong>Mind</strong>, and <strong>Code</strong>. Each has a natural frequency. Each can be pulled into distortion by lower-vibration inputs.
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 22 }}>
              Quintave is a <strong>daily tuning practice</strong> — a system for bringing all five frequency bodies into resonance with Source. When that coherence is sustained, abundance, health, and freedom are not goals you chase. They are what naturally emerges.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[
                { name: 'Source', color: '#7F77DD', bg: '#EEEDFE', icon: '✦', desc: 'The tuning fork' },
                { name: 'Form',   color: '#1D9E75', bg: '#E1F5EE', icon: '♥', desc: 'The vessel' },
                { name: 'Field',  color: '#BA7517', bg: '#FAEEDA', icon: '∿', desc: 'The field' },
                { name: 'Mind',   color: '#378ADD', bg: '#E6F1FB', icon: '◈', desc: 'The director' },
                { name: 'Code',   color: '#D85A30', bg: '#FAECE7', icon: '☽', desc: 'The program' },
              ].map(d => (
                <div key={d.name} style={{ textAlign: 'center', background: d.bg, borderRadius: 10, padding: '14px 6px' }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{d.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: d.color, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontSize: 9, color: d.color, opacity: 0.7, lineHeight: 1.3 }}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#1a1a18', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#C0BEBA', lineHeight: 1.75 }}>
              We will begin with a <strong style={{ color: '#fff' }}>coherence baseline assessment</strong> — 15 questions, three per frequency body, approaching each dimension from three distinct angles. This produces a significantly more accurate signature than a single snapshot. Takes about 5–7 minutes.
            </div>
          </div>

          <button onClick={advance} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em', marginBottom: 10 }}>
            Begin my coherence baseline →
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>15 questions · 5–7 minutes · stored only on your device · never shown again</div>
        </div>
      </div>
    )
  }

  // ── ORIENT ───────────────────────────────────────────────────────────────────
  if (phase === 'orient') {
    return (
      <div style={wrapper}>
        <div style={inner}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#888', textTransform: 'uppercase', marginBottom: 12 }}>Before we begin</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1a18', marginBottom: 8 }}>What this system is actually for.</div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: bdr, padding: '24px 28px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.85, marginBottom: 16 }}>
              Most tools address one part of you. A fitness app for the body. A meditation app for the mind. A therapy app for emotions. They work in isolation — which is why results are often temporary.
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.85, marginBottom: 16 }}>
              Quintave is built on a different premise: <strong style={{ color: '#1a1a18' }}>you are a five-dimensional being</strong>, and your experience of life is shaped by how well all five dimensions are working together — and with each other.
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.85 }}>
              When they align, something shifts. Not as a result of effort — but as a natural consequence of coherence. Clarity arrives. Energy returns. Circumstances begin to reflect what is happening inside. This is what we mean by your best life. Not a destination. A state of being.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#EEEDFE', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>✦</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3C3489', marginBottom: 4 }}>Source</div>
              <div style={{ fontSize: 11, color: '#3C3489', lineHeight: 1.6, opacity: 0.85 }}>The core of who you are — beneath every thought, role, and circumstance. The anchor point everything else calibrates to.</div>
            </div>
            <div style={{ background: '#F7F6F3', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>♥ ∿ ◈ ☽</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a18', marginBottom: 4 }}>Form · Field · Mind · Code</div>
              <div style={{ fontSize: 11, color: '#5F5E5A', lineHeight: 1.6 }}>The four bodies that orbit the core — each with its own frequency, pulled in different directions by life. The daily practice brings them back into alignment.</div>
            </div>
          </div>

          <div style={{ background: '#1a1a18', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#C0BEBA', lineHeight: 1.8 }}>
              The baseline assessment that follows measures where each of your five bodies currently resonates. It takes 5–7 minutes and produces your personal coherence signature — the starting point for everything that follows.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 10 }}>
            <button onClick={back} style={{ padding: '14px', borderRadius: 12, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#5F5E5A' }}>← Back</button>
            <button onClick={advance} style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Begin the baseline assessment →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTIONS ─────────────────────────────────────────────────────────────────
  if (phase === 'questions' && currentQ) {
    const { domain, q, domainQIdx } = currentQ
    const currentScore = scores[domain.id][domainQIdx]
    const isNewDomain = domainQIdx === 0
    const questionNumber = questionIdx + 1

    return (
      <div style={{ ...wrapper, alignItems: 'flex-start', paddingTop: 32 }}>
        <div style={{ ...inner, maxWidth: 580 }}>
          <ProgressBar total={totalQuestions} current={questionNumber} color={domain.color}/>

          {/* Domain header — only on first question of each domain */}
          {isNewDomain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: domain.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {domain.icon}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: domain.color, marginBottom: 3 }}>
                  {domain.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{domain.headline}</div>
              </div>
            </div>
          )}

          {isNewDomain && (
            <div style={{ background: domain.bg, borderRadius: 12, padding: '14px 18px', marginBottom: 16, borderLeft: `3px solid ${domain.color}` }}>
              <div style={{ fontSize: 13, color: domain.text, lineHeight: 1.7 }}>{domain.sub}</div>
            </div>
          )}

          {/* Question card */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: domain.color, background: domain.bg, padding: '3px 8px', borderRadius: 99 }}>
                {domain.name} · {q.angle}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Question {domainQIdx + 1} of 3 for this body</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', lineHeight: 1.65, marginBottom: 24 }}>
              {q.q}
            </div>
            <FrequencySlider
              value={currentScore}
              onChange={val => setScore(domain.id, domainQIdx, val)}
              color={domain.color}
              low={q.low}
              high={q.high}
            />
          </div>

          {/* Interference note — only on last question of each domain */}
          {domainQIdx === 2 && (
            <div style={{ background: '#F7F6F3', borderRadius: 10, padding: '12px 16px', marginBottom: 14, borderLeft: '3px solid #D3D1C7' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 4 }}>When this body is out of resonance</div>
              <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.6 }}>{domain.interference}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: questionIdx > 0 ? '1fr 3fr' : '1fr', gap: 10 }}>
            {questionIdx > 0 && (
              <button onClick={back} style={{ padding: '14px', borderRadius: 12, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#5F5E5A' }}>← Back</button>
            )}
            <button onClick={advance} style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {questionIdx === totalQuestions - 1 ? 'Read my coherence signature →' : domainQIdx === 2 ? `Next frequency body →` : 'Next question →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── NAME ─────────────────────────────────────────────────────────────────────
  if (phase === 'name') {
    return (
      <div style={wrapper}>
        <div style={inner}>
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>One last thing.</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.7, marginBottom: 8 }}>
              This is your coherence baseline. Everything from here is a tuning process, not a fixing process.
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.7, marginBottom: 24 }}>What should we call you?</div>
            <input autoFocus value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && userName.trim() && advance()}
              placeholder="Your name or preferred name"
              style={{ width: '100%', fontSize: 16, color: '#1a1a18', background: '#F7F6F3', border: bdr, borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', outline: 'none', marginBottom: 6 }}/>
            <div style={{ fontSize: 11, color: '#888' }}>Stored locally on your device only — never shared.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 10 }}>
            <button onClick={back} style={{ padding: '14px', borderRadius: 12, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#5F5E5A' }}>← Back</button>
            <button onClick={advance} disabled={!userName.trim()}
              style={{ padding: '14px', borderRadius: 12, border: 'none', background: userName.trim() ? '#1a1a18' : '#E5E3DE', color: userName.trim() ? '#fff' : '#888', fontSize: 14, fontWeight: 600, cursor: userName.trim() ? 'pointer' : 'default' }}>
              Read my coherence signature →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const name = userName.trim().split(' ')[0]

    return (
      <div style={{ ...wrapper, alignItems: 'flex-start', paddingTop: 32 }}>
        <div style={{ ...inner, maxWidth: 600 }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Your coherence signature</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
              {name}, this is your current frequency.
            </div>
            <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.6 }}>
              This is not a judgment. It is a starting frequency. The work is tuning, not repairing.
            </div>
          </div>

          {/* Coherence state */}
          <div style={{ background: coherenceState.bg, borderRadius: 14, border: `1.5px solid ${coherenceState.color}40`, padding: '20px 24px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: coherenceState.color, marginBottom: 8 }}>Current coherence state</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: coherenceState.color, letterSpacing: '-0.03em', marginBottom: 6 }}>{coherenceState.label}</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.65, maxWidth: 400, margin: '0 auto' }}>{coherenceState.desc}</div>
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: coherenceState.color }}>{overallScore}/100</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Weighted coherence score — Source 1.5×</div>
          </div>

          {/* Resonance bars */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Your resonance signature — averaged across 3 angles per body</div>
            {allDomainResults.map((d, i) => (
              <div key={d.id} style={{ marginBottom: i < 4 ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{d.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Show individual question scores */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {scores[d.id].map((s, si) => (
                            <div key={si} style={{ width: 20, height: 20, borderRadius: 5, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: d.color }}>{s}</div>
                          ))}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: d.score <= 3 ? '#E24B4A' : d.score <= 6 ? '#BA7517' : '#1D9E75' }}>avg {d.score}/10</span>
                      </div>
                    </div>
                    <div style={{ height: 7, borderRadius: 99, background: '#EEEDE9', overflow: 'hidden' }}>
                      <div style={{ height: 7, borderRadius: 99, background: d.color, width: `${d.score * 10}%`, transition: 'width 0.7s ease' }}/>
                    </div>
                  </div>
                  {d.id === 'd1' && <div style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: '#EEEDFE', color: '#3C3489', fontWeight: 700, whiteSpace: 'nowrap' }}>TUNING FORK</div>}
                  {d.id === weakest.id && <div style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: '#FCEBEB', color: '#A32D2D', fontWeight: 700, whiteSpace: 'nowrap' }}>FOCUS HERE</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Primary interference */}
          <div style={{ background: weakest.bg, borderRadius: 14, border: `1px solid ${weakest.color}30`, padding: '20px 24px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: weakest.color, marginBottom: 6 }}>Primary interference — where to begin</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: weakest.text, marginBottom: 10 }}>{weakest.name} — avg {weakest.score}/10 across 3 angles</div>
            <div style={{ fontSize: 13, color: weakest.text, lineHeight: 1.75, opacity: 0.9 }}>{INTERFERENCE_INSIGHTS[weakest.id]}</div>
          </div>

          {/* Mode choice */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Choose your tuning path.</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.65, marginBottom: 20 }}>How much of the system do you want to engage with from day one?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setFocusMode('focus')}
                style={{ padding: '18px', borderRadius: 12, border: `2px solid ${focusMode === 'focus' ? '#1a1a18' : 'rgba(0,0,0,0.08)'}`, background: focusMode === 'focus' ? '#1a1a18' : '#F7F6F3', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: focusMode === 'focus' ? '#fff' : '#1a1a18', marginBottom: 5 }}>Gentle Tuning</div>
                <div style={{ fontSize: 11, color: focusMode === 'focus' ? '#C0BEBA' : '#888', lineHeight: 1.55, marginBottom: 10 }}>One practice per frequency body. Five total. Build coherence gradually before expanding to the full system.</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.values(FOCUS_MODE_PRACTICES).map((p,i) => (
                    <div key={i} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: focusMode === 'focus' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', color: focusMode === 'focus' ? '#C0BEBA' : '#5F5E5A' }}>{p}</div>
                  ))}
                </div>
              </button>
              <button onClick={() => setFocusMode('full')}
                style={{ padding: '18px', borderRadius: 12, border: `2px solid ${focusMode === 'full' ? '#1a1a18' : 'rgba(0,0,0,0.08)'}`, background: focusMode === 'full' ? '#1a1a18' : '#F7F6F3', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: focusMode === 'full' ? '#fff' : '#1a1a18', marginBottom: 5 }}>Full Tuning System</div>
                <div style={{ fontSize: 11, color: focusMode === 'full' ? '#C0BEBA' : '#888', lineHeight: 1.55, marginBottom: 10 }}>All 36 practices across all five frequency bodies. For those ready to engage the complete coherence system from day one.</div>
                <div style={{ fontSize: 10, color: focusMode === 'full' ? '#C0BEBA' : '#888' }}>36 practices · Full cross-impact scoring · All dimensions</div>
              </button>
            </div>
          </div>

          <button onClick={() => focusMode && handleComplete(focusMode)} disabled={!focusMode}
            style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: focusMode ? '#1a1a18' : '#E5E3DE', color: focusMode ? '#fff' : '#888', fontSize: 15, fontWeight: 700, cursor: focusMode ? 'pointer' : 'default', letterSpacing: '-0.01em', marginBottom: 10 }}>
            Begin my tuning practice →
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>
            Your coherence signature is saved as your baseline. Return to this assessment anytime to measure how far you have come.
          </div>
        </div>
      </div>
    )
  }

  return null
}
