import React, { useState } from 'react'
import { DOMAINS, COHERENCE_STATES } from '../../data'
import { signInWithMagicLink, getSession } from '../../app/supabaseClient'
import { syncLocalStateToCloud } from '../../app/services/syncService'

// Inline coherence score — avoids import resolution issues on some mobile browsers
const getCoherenceScore = (scores) => {
  // Inputs d1..d5 are each on a 0–10 scale (per-body averages).
  // Source (d1) is weighted 1.5×; total weight = 1.5 + 1 + 1 + 1 + 1 = 5.5.
  const weighted =
    (scores?.d1 || 0) * 1.5 +
    (scores?.d2 || 0) +
    (scores?.d3 || 0) +
    (scores?.d4 || 0) +
    (scores?.d5 || 0)
  const weightedAvg = weighted / 5.5   // weighted average on the 0–10 scale
  return Math.round(weightedAvg * 10)  // express on the 0–100 scale
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

function FrequencySlider({ value, onChange, color, low, high, answered }) {
  const label = value <= 2 ? 'Deep distortion' : value <= 4 ? 'Interference active' : value <= 6 ? 'Partial resonance' : value <= 8 ? 'Strong resonance' : 'Full coherence'
  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  return (
    <div>
      <div style={{ marginBottom: 14, opacity: answered ? 1 : 0.6, transition: 'opacity 0.2s ease' }}>
        <input type="range" min={1} max={10} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: answered ? color : '#C8C6CF', cursor: 'pointer' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <div key={n} onClick={() => onChange(n)}
              style={{ fontSize: 10, color: (answered && n === value) ? color : '#C0BEBA', fontWeight: (answered && n === value) ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{n}</div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        {answered ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F7F6F3', borderRadius: 99, padding: '6px 16px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}/>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>{value}/10 — {label}</div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F7F6F3', borderRadius: 99, padding: '6px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>Move the slider to answer</div>
          </div>
        )}
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
  // flat question index across all 25 questions
  const [questionIdx, setQuestionIdx] = useState(-1) // -1 = welcome
  const [scores, setScores] = useState({
    d1: [5, 5, 5, 5, 5], d2: [5, 5, 5, 5, 5], d3: [5, 5, 5, 5, 5], d4: [5, 5, 5, 5, 5], d5: [5, 5, 5, 5, 5],
  })
  const [userName, setUserName] = useState('')
  const [focusMode, setFocusMode] = useState(null)
  const [phase, setPhase] = useState('welcome') // welcome | questions | name | results | email
  const [animating, setAnimating] = useState(false)
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState('idle') // idle | sending | sent | skipped | error
  const [answered, setAnswered] = useState({}) // { [flat questionIdx]: true } — gates advancing until the slider is touched

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

  // Compute domain scores across 5 dimensions per body:
  //  [0] typical (stable baseline)      [1] current (this week)
  //  [2] behavioral (under pressure)    [3] depth (remembrance/embodiment/
  //  honesty/sovereignty/origin)        [4] capacity (return/regulation/
  //  projection/choice/rewriting — transformation ability)
  // Depth & capacity are weighted meaningfully — they're the truest signal of
  // a player's real coherence, not just their current week.
  const WEIGHTS = [0.22, 0.18, 0.18, 0.22, 0.20]  // sums to 1.0
  const wavg = (arr, weights) => {
    if (!Array.isArray(arr) || !arr.length) return 5
    // Use only as many weights as we have answers; renormalize if mismatched.
    const w = weights.slice(0, arr.length)
    const wsum = w.reduce((a, b) => a + b, 0) || 1
    return arr.reduce((acc, v, i) => acc + v * (w[i] ?? 0), 0) / wsum
  }
  const domainAvg = (id) => Math.round(wavg(scores[id], WEIGHTS))

  // Baseline = long-term reference the engine uses: typical + behavioral + depth.
  // (Excludes "current week" so a bad week doesn't drag the long-term anchor.)
  const domainBaseline = (id) => {
    const s = scores[id] || []
    return Math.round(wavg([s[0], s[2], s[3]].filter(v => v != null), [0.4, 0.3, 0.3]))
  }

  // Starting score = Day 1 coherence state (current week).
  const domainStarting = (id) => (scores[id]?.[1] ?? 5)

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

  const handleComplete = async (mode) => {
    const flatScores = {}
    const baselineScores = {}
    const startingScores = {}
    DOMAINS.forEach(d => {
      flatScores[d.id] = domainAvg(d.id)
      baselineScores[d.id] = domainBaseline(d.id)
      startingScores[d.id] = domainStarting(d.id)
    })

    // Enhanced detailed scores: store all five dimensions per domain
    const enhancedDetailedScores = {}
    DOMAINS.forEach(d => {
      const s = scores[d.id] || []
      enhancedDetailedScores[d.id] = {
        typical:    s[0],
        current:    s[1],
        behavioral: s[2],
        depth:      s[3],   // remembrance / embodiment / honesty / sovereignty / origin
        capacity:   s[4],   // return / regulation / projection / choice / rewriting
        weighted:   flatScores[d.id],
      }
    })

    // Gap analysis: domains where current is meaningfully below typical
    const gapAnalysis = DOMAINS
      .map(d => ({
        domainId: d.id,
        name: d.name,
        typical: scores[d.id][0],
        current: scores[d.id][1],
        gap: scores[d.id][0] - scores[d.id][1],
      }))
      .filter(g => g.gap >= 2)
      .sort((a, b) => b.gap - a.gap)

    onComplete({
      userName,
      scores: flatScores,
      baselineScores,
      startingScores,
      detailedScores: enhancedDetailedScores,
      gapAnalysis,
      weakestDomain: weakest.id,
      strongestDomain: strongest.id,
      overallScore,
      coherenceState: coherenceState.label,
      focusMode: mode,
      completedAt: new Date().toISOString(),
    })

    // Immediately sync to cloud if user is already authenticated
    // (happens when user completed email step before finishing onboarding)
    try {
      const session = await getSession()
      if (session?.user?.id) {
        // Small delay to ensure localStorage is written by onComplete handler
        setTimeout(() => {
          syncLocalStateToCloud(session.user.id).catch(() => {})
        }, 500)
      }
    } catch {}
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
              Manifestation isn't luck. It's resonance.
            </div>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>You are Source, moving through four bodies.</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 20 }}>
              At your core you are <strong>Source</strong> — whole, eternal, complete. You move through four frequency bodies: <strong>Form</strong> (physical), <strong>Field</strong> (emotional), <strong>Mind</strong> (mental), and <strong>Code</strong> (subconscious). When they fall out of tune with Source, life feels like resistance — effort that doesn't land.
            </div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 22 }}>
              Quintave is a <strong>daily tuning practice</strong> that brings all four bodies back into resonance with Source. When that resonance holds, creating the life you want becomes deliberate — your best life isn't something you chase. It's what naturally emerges.
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
              We will begin with a <strong style={{ color: '#fff' }}>coherence baseline assessment</strong> — 25 questions, five per frequency body. Each body is measured across five dimensions: your typical baseline, your current state this week, your patterns under pressure, the depth of your connection, and your capacity to return. This separates who you are from where you are right now — producing a significantly more accurate starting point. Takes about 7–10 minutes.
            </div>
          </div>

          <button onClick={advance} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em', marginBottom: 10 }}>
            Begin my coherence baseline →
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>25 questions · 5 dimensions per body · 7–10 minutes · private to you</div>
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
              Quintave is built on a different premise: <strong style={{ color: '#1a1a18' }}>you are Source, moving through four frequency bodies</strong> — and your experience of life is shaped by how well those four are in tune with Source, and with each other.
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
              <div style={{ fontSize: 11, color: '#5F5E5A', lineHeight: 1.6 }}>The four bodies that orbit the core — each with its own frequency, pulled in different directions by life. The daily practice brings them back into tune.</div>
            </div>
          </div>

          <div style={{ background: '#1a1a18', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#C0BEBA', lineHeight: 1.8 }}>
              The baseline assessment that follows measures where each of your five frequency bodies currently resonates. It takes 7–10 minutes and produces your personal coherence signature — the starting point for everything that follows.
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
    const isAnswered = !!answered[questionIdx]

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
              <div style={{ fontSize: 11, color: '#888' }}>Question {domainQIdx + 1} of 5 for this body</div>
            </div>
            {/* Dimension label — tells the user what this question is measuring */}
            <div style={{ fontSize: 10, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {(() => {
                const DIM_LABELS = {
                  typical: '⬤ Typical baseline — how this area is for you generally',
                  current: '⬤ Current state — how it is right now, this week',
                  behavioral: '⬤ Behavioral context — what happens when this area suffers',
                  remembrance: '⬤ Depth — how deeply you know yourself here',
                  practice: '⬤ Capacity — your ability to return and recover',
                  embodiment: '⬤ Depth — how attuned you are to this body',
                  regulation: '⬤ Capacity — how well you recover and rebalance',
                  'emotional honesty': '⬤ Depth — how honestly you meet this body',
                  'relational charge': '⬤ Capacity — your awareness in the moment',
                  'belief discernment': '⬤ Depth — your sovereignty over this body',
                  'choice alignment': '⬤ Capacity — how aligned your actions are',
                  'root pattern recognition': '⬤ Depth — how clearly you see this body',
                  'rewriting capacity': '⬤ Capacity — your power to choose differently',
                }
                return DIM_LABELS[q.dimension] || '⬤ ' + (q.angle || '')
              })()}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', lineHeight: 1.65, marginBottom: 24 }}>
              {q.q}
            </div>
            <FrequencySlider
              value={currentScore}
              onChange={val => { setScore(domain.id, domainQIdx, val); setAnswered(a => ({ ...a, [questionIdx]: true })) }}
              color={domain.color}
              low={q.low}
              high={q.high}
              answered={isAnswered}
            />
          </div>

          {/* Interference note — only on last question of each domain */}
          {domainQIdx === 4 && (
            <div style={{ background: '#F7F6F3', borderRadius: 10, padding: '12px 16px', marginBottom: 14, borderLeft: '3px solid #D3D1C7' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 4 }}>When this body is out of resonance</div>
              <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.6 }}>{domain.interference}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: questionIdx > 0 ? '1fr 3fr' : '1fr', gap: 10 }}>
            {questionIdx > 0 && (
              <button onClick={back} style={{ padding: '14px', borderRadius: 12, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#5F5E5A' }}>← Back</button>
            )}
            <button onClick={advance} disabled={!isAnswered} style={{ padding: '14px', borderRadius: 12, border: 'none', background: isAnswered ? '#1a1a18' : '#E5E3DE', color: isAnswered ? '#fff' : '#999', fontSize: 14, fontWeight: 600, cursor: isAnswered ? 'pointer' : 'default', transition: 'all 0.2s ease' }}>
              {questionIdx === totalQuestions - 1 ? 'Read my coherence signature →' : domainQIdx === 4 ? `Next frequency body →` : 'Next question →'}
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

          <button onClick={() => focusMode && setPhase('email')} disabled={!focusMode}
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

  // ── EMAIL SIGN-IN ────────────────────────────────────────────────────────────
  // Shown after mode selection — before completing onboarding.
  // Magic link sent to email; user can also skip (data stays local only).
  if (phase === 'email') {
    const handleSendMagicLink = async () => {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed || !trimmed.includes('@')) return
      setEmailStatus('sending')
      try {
        const { error } = await signInWithMagicLink(trimmed)
        if (error) throw error
        setEmailStatus('sent')
      } catch (e) {
        setEmailStatus('error')
      }
    }

    const handleSkip = () => {
      setEmailStatus('skipped')
      handleComplete(focusMode)
    }

    const handleContinueAfterSent = () => {
      handleComplete(focusMode)
    }

    return (
      <div style={wrapper}>
        <div style={inner}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#888', textTransform: 'uppercase', marginBottom: 14 }}>
              One last step
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Protect your progress.
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
              Enter your email to sync your coherence data across devices and protect against data loss.
              A sign-in link will be sent — no password needed.
            </div>
          </div>

          {emailStatus === 'sent' ? (
            /* Sent state */
            <div style={{ ...card, textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a18', marginBottom: 8 }}>
                Check your email
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 20 }}>
                A sign-in link was sent to <strong>{email}</strong>.
                Open it on any device to sync your progress automatically.
              </div>
              <button onClick={handleContinueAfterSent}
                style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Enter Quintave →
              </button>
            </div>
          ) : (
            /* Email input state */
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>
                  Your email
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMagicLink()}
                  placeholder="you@example.com"
                  autoFocus
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 10,
                    border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 15,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    marginBottom: 12, background: '#FAFAFA',
                  }}
                />

                {/* What you get */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { icon: '☁', text: 'Sync across devices' },
                    { icon: '🔒', text: 'Data never lost' },
                    { icon: '◈', text: 'Pattern memory preserved' },
                    { icon: '→', text: 'Access from anywhere' },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#555' }}>
                      <span style={{ fontSize: 14 }}>{icon}</span> {text}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSendMagicLink}
                  disabled={emailStatus === 'sending' || !email.trim().includes('@')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                    background: email.trim().includes('@') ? '#1a1a18' : '#E5E3DE',
                    color: email.trim().includes('@') ? '#fff' : '#888',
                    fontSize: 14, fontWeight: 700, cursor: email.trim().includes('@') ? 'pointer' : 'default',
                    marginBottom: 8,
                  }}>
                  {emailStatus === 'sending' ? 'Sending…' : 'Send sign-in link'}
                </button>

                {emailStatus === 'error' && (
                  <div style={{ fontSize: 12, color: '#A32D2D', textAlign: 'center', marginBottom: 8 }}>
                    Could not send link — check your email and try again.
                  </div>
                )}
              </div>

              <button onClick={handleSkip}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>
                Skip for now — continue without cloud sync
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 8 }}>
                You can always add cloud sync later from the app.
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
