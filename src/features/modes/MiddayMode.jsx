import React, { useState, useRef, useEffect } from 'react'

const MIDDAY_SEQUENCE = [
  {
    domainId: 'd1',
    name: '5 Recall Triggers',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    duration: '2 min',
    instruction: 'Pause completely. You are mid-field — the day has been pulling at you. This moment is a deliberate return. Ask silently: "Who is aware of this moment right now?" Rest in the awareness that noticed the question — not in any thought or answer.',
    cue: 'You are not your inbox. You are not your to-do list. You are the awareness that is watching all of it. Return here.',
  },
  {
    domainId: 'd2',
    name: 'Hydration Protocol',
    icon: '♥',
    color: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
    duration: '2 min',
    instruction: 'Check your water intake since waking. Have you reached 50% of your daily target? If not, drink a full glass of water now — before coffee, before anything else. Your cognitive function at midday is directly correlated with your hydration since morning.',
    cue: 'Most afternoon energy dips are dehydration, not tiredness. Water first. Always.',
  },
  {
    domainId: 'd4',
    name: 'Thought Audit',
    icon: '◈',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    duration: '3 min',
    instruction: 'What thoughts have been running most strongly this morning? Write them down without editing. Then label each one: useful or noise. For each noise thought, write one grounded replacement: "The truth is: ___"',
    cue: 'You cannot think your way out of a thought you have not examined. The audit is how you reclaim the director\'s chair.',
    hasInput: true,
    inputLabel: 'Dominant thought running right now...',
    inputKey: 'q_midday_thought',
  },
  {
    domainId: 'd5',
    name: 'Pattern Interrupt',
    icon: '☽',
    color: '#D85A30',
    bg: '#FAECE7',
    text: '#712B13',
    duration: '2 min',
    instruction: 'Name one automatic behavior or reaction that showed up this morning — a moment where you responded before you thought. You do not need to fix it now. Simply name it, see it clearly, and choose how you would respond differently this afternoon.',
    cue: 'Seeing the pattern is the interrupt. You cannot choose differently what you cannot see happening.',
  },
  {
    domainId: 'd4',
    name: 'Afternoon Directive',
    icon: '◈',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    duration: '2 min',
    instruction: 'Set one clear intention for the rest of the day. Not a task — a state of being. How do you want to move through the afternoon? What quality do you want to bring to everything you touch?',
    cue: 'The afternoon is a fresh field. You get to choose what frequency you bring into it.',
    hasInput: true,
    inputLabel: 'My intention and mantra for this afternoon...',
    inputKey: 'q_midday_directive',
  },
]

// Practice key mapping — links Midday Mode practices to Today tab tracker
const MIDDAY_KEYS = {
  '5 Recall Triggers': 'd1_2',
  'Hydration Protocol': 'd2_6',
  'Thought Audit': 'd4_2',
  'Pattern Interrupt': 'd5_0',
  'Afternoon Directive': 'd4_6',
}

function BreathGuide({ pattern }) {
  const [phase, setPhase] = useState('ready')
  const [count, setCount] = useState(0)
  const [round, setRound] = useState(0)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)
  const phases = ['inhale','hold1','exhale','hold2'].filter(ph => pattern[ph] > 0)
  const phaseLabels = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' }
  const phaseColors = { inhale: '#7F77DD', hold1: '#378ADD', exhale: '#1D9E75', hold2: '#BA7517' }

  const stop = () => { clearInterval(intervalRef.current); setPhase('ready'); setCount(0); setRound(0); setProgress(0) }
  const start = () => { setRound(1); setPhase('inhale'); setCount(pattern.inhale); setProgress(0) }

  useEffect(() => {
    if (phase === 'ready' || phase === 'done') return
    clearInterval(intervalRef.current)
    const total = pattern[phase]; setCount(total); setProgress(0)
    intervalRef.current = setInterval(() => {
      setCount(prev => {
        setProgress(((total - prev + 1) / total) * 100)
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          const idx = phases.indexOf(phase)
          if (idx === phases.length - 1) {
            const next = round + 1
            if (next > pattern.rounds) { setPhase('done'); return 0 }
            setRound(next); setPhase(phases[0])
          } else { setPhase(phases[idx + 1]) }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [phase])

  const circ = 2 * Math.PI * 40
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pattern.label} · {pattern.rounds} rounds</div>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={40} fill="none" stroke="#EEEDE9" strokeWidth={6}/>
        <circle cx={50} cy={50} r={40} fill="none"
          stroke={phase !== 'ready' && phase !== 'done' ? phaseColors[phase] : '#EEEDE9'}
          strokeWidth={6} strokeDasharray={circ}
          strokeDashoffset={circ - (progress / 100) * circ}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s, stroke 0.3s' }}/>
        <text x={50} y={46} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1a1a18">
          {phase === 'ready' ? '·' : phase === 'done' ? '✓' : count}
        </text>
        <text x={50} y={60} textAnchor="middle" fontSize={9} fill="#888">
          {phase === 'ready' ? 'tap start' : phase === 'done' ? 'complete' : phaseLabels[phase]}
        </text>
        {phase !== 'ready' && phase !== 'done' && (
          <text x={50} y={72} textAnchor="middle" fontSize={8} fill="#aaa">{round}/{pattern.rounds}</text>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 8 }}>
        {phase === 'ready' || phase === 'done' ? (
          <button onClick={start} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {phase === 'done' ? 'Again' : 'Start'}
          </button>
        ) : (
          <button onClick={stop} style={{ padding: '8px 24px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Stop</button>
        )}
      </div>
    </div>
  )
}

export default function MiddayMode({ onClose, checked, setChecked }) {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState([])
  const [inputs, setInputs] = useState({})
  const [done, setDone] = useState(false)
  const today = new Date().toDateString()
  const current = MIDDAY_SEQUENCE[step]
  const isLast = step === MIDDAY_SEQUENCE.length - 1

  const markComplete = () => {
    // Tick this practice in the Today tab
    const pk = MIDDAY_KEYS[current.name]
    if (pk && setChecked) {
      setChecked(prev => ({
        ...prev,
        [today]: { ...(prev[today] || {}), [pk]: true }
      }))
    }
    setCompleted(prev => [...prev, step])
    if (isLast) setDone(true)
    else setStep(s => s + 1)
  }

  const skip = () => {
    if (isLast) setDone(true)
    else setStep(s => s + 1)
  }

  if (done) {
    const completedPractices = MIDDAY_SEQUENCE.filter((_,i) => completed.includes(i))
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0A0F0C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>◈</div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#1D9E75', marginBottom: 12 }}>Midday reset complete</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.3 }}>
          You have returned to center.
        </div>
        <div style={{ fontSize: 15, color: '#888', lineHeight: 1.7, maxWidth: 400, marginBottom: 20 }}>
          The afternoon is a fresh field. Step back into it from this place — deliberate, clear, and grounded.
        </div>
        {completedPractices.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.08)', padding: '14px 20px', marginBottom: 28, maxWidth: 340, width: '100%' }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Logged in Today tab</div>
            {completedPractices.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>✓</div>
                <div style={{ fontSize: 12, color: '#C0BEBA', textAlign: 'left' }}>{p.name}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ padding: '14px 36px', borderRadius: 10, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Return to my day →
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0F0C', display: 'flex', flexDirection: 'column', zIndex: 900, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444' }}>Midday Reset</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {MIDDAY_SEQUENCE.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 99, background: completed.includes(i) ? '#1D9E75' : i === step ? '#fff' : '#222', transition: 'all 0.3s' }}/>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '0.5px solid #333', borderRadius: 8, padding: '6px 14px', color: '#666', fontSize: 12, cursor: 'pointer' }}>Exit</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, textAlign: 'center' }}>
            Practice {step + 1} of {MIDDAY_SEQUENCE.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: `${current.color}18`, border: `0.5px solid ${current.color}30` }}>
              <span style={{ fontSize: 14 }}>{current.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: current.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {current.domainId === 'd1' ? 'Source' : current.domainId === 'd2' ? 'Form' : current.domainId === 'd3' ? 'Field' : current.domainId === 'd4' ? 'Mind' : 'Code'}
              </span>
            </div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: '#fff', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {current.name}
          </div>
          <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 28 }}>{current.duration}</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.07)', padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#C0BEBA', lineHeight: 1.8 }}>{current.instruction}</div>
          </div>
          <div style={{ padding: '0 4px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: current.color, lineHeight: 1.7, fontStyle: 'italic', opacity: 0.85 }}>"{current.cue}"</div>
          </div>
          {current.breathPattern && <BreathGuide pattern={current.breathPattern}/>}
          {current.hasInput && (
            <div style={{ marginTop: 16 }}>
              <input value={inputs[current.inputKey] || ''}
                onChange={e => setInputs(p => ({ ...p, [current.inputKey]: e.target.value }))}
                placeholder={current.inputLabel}
                style={{ width: '100%', fontSize: 15, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', outline: 'none' }}/>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
        <button onClick={skip} style={{ flex: 1, padding: '14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#555', fontSize: 14, cursor: 'pointer' }}>Skip</button>
        <button onClick={markComplete} style={{ flex: 3, padding: '14px', borderRadius: 10, border: 'none', background: current.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isLast ? 'Complete reset →' : 'Done — next →'}
        </button>
      </div>
    </div>
  )
}
