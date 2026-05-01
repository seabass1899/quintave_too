import React, { useState, useEffect, useRef } from 'react'

// Morning sequence — ordered by optimal flow
// Source first (sets the anchor), Form (breathwork), Field, Mind, Code
const MORNING_SEQUENCE = [
  {
    domainId: 'd1',
    name: 'Stillness Exposure',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    duration: '5–20 min',
    instruction: 'Find stillness. Close your eyes or soften your gaze. Allow everything to be exactly as it is. You are not trying to meditate correctly — you are practicing the willingness to remain still.',
    cue: 'Rest as the awareness that is aware. Not as the thoughts. As the awareness itself.',
    breathPattern: null,
  },
  {
    domainId: 'd1',
    name: 'Observer Drill',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    duration: '5 min',
    instruction: 'Notice a thought arising. Instead of following it, label it silently: "thinking." Return to the awareness that noticed the thought — not the thought itself.',
    cue: 'Each time you catch a distraction, that catching IS the practice. Count each catch.',
    breathPattern: null,
  },
  {
    domainId: 'd2',
    name: 'Breathwork',
    icon: '♥',
    color: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
    duration: '5 min',
    instruction: 'Breathe through your nose only. Belly expands first, then chest. Shoulders do not rise. Use Box Breathing: inhale 4, hold 4, exhale 4, hold 4.',
    cue: 'You are tuning your nervous system. Each exhale activates the parasympathetic — the state of safety and coherence.',
    breathPattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4, rounds: 6, label: 'Box Breathing' },
  },
  {
    domainId: 'd4',
    name: 'Morning Directive',
    icon: '◈',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    duration: '3 min',
    instruction: 'Before touching your phone or engaging with anything external, set your intention for today. One state of being. One execution target.',
    cue: 'The first 20 minutes determine the frequency of the day. Choose deliberately.',
    breathPattern: null,
    hasInput: true,
    inputLabel: 'Today I intend to...',
    inputKey: 'q_directive',
  },
  {
    domainId: 'd4',
    name: 'Visualization Practice',
    icon: '◈',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    duration: '5–10 min',
    instruction: 'Close your eyes. Build your intended reality in as much sensory detail as possible. Step into it as if it is already real. Feel the emotions of that reality in your body now.',
    cue: 'Mental rehearsal activates the same neural pathways as physical experience. The felt sense is the installation.',
    breathPattern: null,
  },
  {
    domainId: 'd3',
    name: 'Gratitude + Reframe',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    duration: '3–5 min',
    instruction: 'Write three specific gratitudes — not generic, but precise moments. For each, pause and actually feel it for 10 seconds. Then write one reframe: a challenge that is actually a gift.',
    cue: 'Specificity is the mechanism. Vague gratitude does not move the needle. The feeling does.',
    breathPattern: null,
  },
  {
    domainId: 'd5',
    name: 'Intention Installation',
    icon: '☽',
    color: '#D85A30',
    bg: '#FAECE7',
    text: '#712B13',
    duration: '2 min',
    instruction: 'Choose one affirmation that represents who you are choosing to be today. State it in the present tense. Repeat it 7 times slowly, generating the feeling of its truth on each repetition. Let this be the last installation before you enter the field.',
    cue: 'An affirmation felt deeply for 20 seconds rewires more than a week of passive repetition. The feeling is the installation — not the words.',
    breathPattern: null,
  },
]

// Practice key mapping — links Morning Mode practices to Today tab tracker
const MORNING_KEYS = {
  'Stillness Exposure': 'd1_1',
  'Observer Drill': 'd1_0',
  'Breathwork': 'd2_4',
  'Morning Directive': 'd4_0',
  'Visualization Practice': 'd4_4',
  'Gratitude + Reframe': 'd3_2',
  'Intention Installation': 'd5_5',
}

// Breath animation component
function BreathGuide({ pattern, active }) {
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
    const total = pattern[phase]
    setCount(total); setProgress(0)
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
  if (!active) return null

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
          <button onClick={start} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {phase === 'done' ? 'Again' : 'Start'}
          </button>
        ) : (
          <button onClick={stop} style={{ padding: '8px 24px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Stop</button>
        )}
      </div>
    </div>
  )
}

export default function MorningMode({ checked, setChecked, directive, setDirective, onClose }) {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState([])
  const [inputVal, setInputVal] = useState('')
  const [done, setDone] = useState(false)

  const today = new Date().toDateString()
  const current = MORNING_SEQUENCE[step]
  const totalSteps = MORNING_SEQUENCE.length
  const isLast = step === totalSteps - 1

  const markComplete = () => {
    // Tick this practice in the Today tab
    const pk = MORNING_KEYS[current.name]
    if (pk && setChecked) {
      setChecked(prev => ({
        ...prev,
        [today]: { ...(prev[today] || {}), [pk]: true }
      }))
    }
    // Save directive input if applicable
    if (current.inputKey === 'q_directive' && inputVal && setDirective) {
      setDirective(prev => ({ ...prev, [today]: inputVal }))
    }
    setCompleted(prev => [...prev, step])
    if (isLast) setDone(true)
    else setStep(s => s + 1)
  }

  const skip = () => {
    if (isLast) setDone(true)
    else setStep(s => s + 1)
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  // Completion screen
  if (done) {
    const completedCount = completed.length
    const completedPractices = MORNING_SEQUENCE.filter((_,i) => completed.includes(i))
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0C0B0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7F77DD', marginBottom: 12 }}>Morning session complete</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.3 }}>
          {completedCount} of {totalSteps} practices tuned.
        </div>
        <div style={{ fontSize: 15, color: '#888', lineHeight: 1.7, maxWidth: 400, marginBottom: 24 }}>
          You have set the frequency for today. Step into your day from this place.
        </div>
        {completedPractices.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.08)', padding: '14px 20px', marginBottom: 28, maxWidth: 360, width: '100%' }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Logged in Today tab</div>
            {completedPractices.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>✓</div>
                <div style={{ fontSize: 12, color: '#C0BEBA', textAlign: 'left' }}>{p.name}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ padding: '14px 36px', borderRadius: 10, border: 'none', background: '#7F77DD', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Enter my day →
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0C0B0F', display: 'flex', flexDirection: 'column', zIndex: 900, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#444' }}>Morning Mode</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {MORNING_SEQUENCE.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 99, background: completed.includes(i) ? '#7F77DD' : i === step ? '#fff' : '#222', transition: 'all 0.3s' }}/>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '0.5px solid #333', borderRadius: 8, padding: '6px 14px', color: '#666', fontSize: 12, cursor: 'pointer' }}>Exit</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* Step counter */}
          <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, textAlign: 'center' }}>
            Practice {step + 1} of {totalSteps}
          </div>

          {/* Domain badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: `${current.color}18`, border: `0.5px solid ${current.color}30` }}>
              <span style={{ fontSize: 14 }}>{current.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: current.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {current.domainId === 'd1' ? 'Source' : current.domainId === 'd2' ? 'Form' : current.domainId === 'd3' ? 'Field' : current.domainId === 'd4' ? 'Mind' : 'Code'}
              </span>
            </div>
          </div>

          {/* Practice name */}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 400, color: '#fff', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {current.name}
          </div>

          {/* Duration */}
          <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 28 }}>{current.duration}</div>

          {/* Instruction */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.07)', padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#C0BEBA', lineHeight: 1.8 }}>{current.instruction}</div>
          </div>

          {/* Cue */}
          <div style={{ padding: '0 4px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: current.color, lineHeight: 1.7, fontStyle: 'italic', opacity: 0.85 }}>"{current.cue}"</div>
          </div>

          {/* Breathwork guide */}
          {current.breathPattern && (
            <BreathGuide pattern={current.breathPattern} active={true}/>
          )}

          {/* Input for Morning Directive */}
          {current.hasInput && (
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <input value={inputVal}
                onChange={e => { setInputVal(e.target.value); setDirective({ ...directive, [today]: e.target.value }) }}
                placeholder={current.inputLabel}
                style={{ width: '100%', fontSize: 15, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', outline: 'none' }}/>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '20px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
        <button onClick={skip}
          style={{ flex: 1, padding: '14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#555', fontSize: 14, cursor: 'pointer' }}>
          Skip
        </button>
        <button onClick={markComplete}
          style={{ flex: 3, padding: '14px', borderRadius: 10, border: 'none', background: current.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isLast ? 'Complete session →' : 'Done — next practice →'}
        </button>
      </div>
    </div>
  )
}
