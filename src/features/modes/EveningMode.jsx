import React, { useState } from 'react'

// Practice key mapping — links Evening Mode practices to Today tab tracker
const EVENING_KEYS = {
  'Name + Locate Emotion': 'd3_0',
  'Emotional Log': 'd3_1',
  'Forgiveness Protocol': 'd3_4',
  'Field Integration': 'd1_3',
  'Pre-Sleep Programming': 'd5_1',
}

const EVENING_SEQUENCE = [
  {
    domainId: 'd3',
    name: 'Name + Locate Emotion',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    duration: '3 min',
    instruction: 'Before processing the day intellectually, check in with your body first. What is the strongest feeling you are carrying from today? Name it precisely — not "stressed" or "tired" but the actual emotion beneath. Place your hand on where you feel it. Breathe into it three times.',
    cue: 'The body always knows before the mind catches up. Let it speak first.',
  },
  {
    domainId: 'd3',
    name: 'Emotional Log',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    duration: '5 min',
    instruction: 'Write three emotional events from today — moments when you felt something notable, positive or negative. For each: the trigger, the feeling, the body sensation. Then look across all three and ask: "Is there a pattern here?"',
    cue: 'What you do not name, you cannot see. What you cannot see, you cannot change.',
    hasInput: true,
    inputLabel: 'Key emotional event from today...',
  },
  {
    domainId: 'd3',
    name: 'Forgiveness Protocol',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    duration: '5 min',
    instruction: 'Bring to mind one person or situation carrying unresolved charge from today — frustration, hurt, or disappointment. Repeat four phrases directed at them silently or aloud: "I am sorry. Please forgive me. Thank you. I love you." You are not apologizing to them — you are releasing the charge you are carrying.',
    cue: 'Unforgiven grievances consume energy through the night. Release them now so your subconscious can process freely rather than replay.',
    hasInput: true,
    inputLabel: 'What charge am I releasing tonight...',
  },
  {
    domainId: 'd1',
    name: 'Field Integration',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    duration: '3 min',
    instruction: 'Sit quietly. Review the day from the perspective of the observer — the awareness that watched all of it — not from the perspective of the person it happened to. What do you notice from this vantage point that you could not see while inside the experience?',
    cue: 'Every day is a transmission from the field. The observer can read it. The personality can only react to it.',
    hasInput: true,
    inputLabel: 'What I notice from the observer perspective...',
  },
  {
    domainId: 'd5',
    name: 'Pre-Sleep Programming',
    icon: '☽',
    color: '#D85A30',
    bg: '#FAECE7',
    text: '#712B13',
    duration: '3 min',
    instruction: 'Choose one state or belief you want your subconscious to process tonight. Repeat it slowly 10 times as you lie down, pairing each repetition with the feeling of its truth. The hypnagogic window — the drift toward sleep — is the most receptive state for installation.',
    cue: 'The last impression before sleep seeds the night. Choose it deliberately.',
    hasInput: true,
    inputLabel: 'Tonight I am installing...',
  },
]

export default function EveningMode({ evening, setEvening, onClose, checked, setChecked }) {
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState([])
  const [inputs, setInputs] = useState({})
  const [done, setDone] = useState(false)
  const today = new Date().toDateString()
  const current = EVENING_SEQUENCE[step]
  const isLast = step === EVENING_SEQUENCE.length - 1

  const markComplete = () => {
    // Tick this practice in the Today tab
    const pk = EVENING_KEYS[current.name]
    if (pk && setChecked) {
      setChecked(prev => ({
        ...prev,
        [today]: { ...(prev[today] || {}), [pk]: true }
      }))
    }
    // Save all evening inputs combined to main evening state
    if (current.hasInput && setEvening) {
      const combined = Object.values(inputs).filter(v => v && v.trim()).join(' | ')
      if (combined) setEvening(prev => ({ ...prev, [today]: combined }))
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
    const completedPractices = EVENING_SEQUENCE.filter((_,i) => completed.includes(i))
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>☽</div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7F77DD', marginBottom: 12 }}>Evening integration complete</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.3 }}>
          The day is complete.<br/>You have processed what needed processing.
        </div>
        <div style={{ fontSize: 15, color: '#666', lineHeight: 1.7, maxWidth: 400, marginBottom: 20 }}>
          Rest now. Your subconscious will continue the work through the night.
        </div>
        {completedPractices.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)', padding: '14px 20px', marginBottom: 28, maxWidth: 340, width: '100%' }}>
            <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Logged in Today tab</div>
            {completedPractices.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>✓</div>
                <div style={{ fontSize: 12, color: '#9A98A8', textAlign: 'left' }}>{p.name}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ padding: '14px 36px', borderRadius: 10, border: 'none', background: '#7F77DD', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Rest well →
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080810', display: 'flex', flexDirection: 'column', zIndex: 900, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#333' }}>Evening Integration</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {EVENING_SEQUENCE.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 99, background: completed.includes(i) ? '#7F77DD' : i === step ? '#fff' : '#1a1a1a', transition: 'all 0.3s' }}/>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '6px 14px', color: '#555', fontSize: 12, cursor: 'pointer' }}>Exit</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, textAlign: 'center' }}>
            Practice {step + 1} of {EVENING_SEQUENCE.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: `${current.color}15`, border: `0.5px solid ${current.color}25` }}>
              <span style={{ fontSize: 14 }}>{current.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: current.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {current.domainId === 'd1' ? 'Source' : current.domainId === 'd2' ? 'Form' : current.domainId === 'd3' ? 'Field' : current.domainId === 'd4' ? 'Mind' : 'Code'}
              </span>
            </div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 400, color: '#E8E6F0', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {current.name}
          </div>
          <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 28 }}>{current.duration}</div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.05)', padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, color: '#9A98A8', lineHeight: 1.8 }}>{current.instruction}</div>
          </div>
          <div style={{ padding: '0 4px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: current.color, lineHeight: 1.7, fontStyle: 'italic', opacity: 0.75 }}>"{current.cue}"</div>
          </div>
          {current.hasInput && (
            <textarea
              value={inputs[current.inputKey] || ''}
              onChange={e => setInputs(p => ({ ...p, [current.inputKey]: e.target.value }))}
              placeholder={current.inputLabel}
              rows={3}
              style={{ width: '100%', fontSize: 14, color: '#C0BEBA', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.7 }}/>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px', borderTop: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
        <button onClick={skip} style={{ flex: 1, padding: '14px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#444', fontSize: 14, cursor: 'pointer' }}>Skip</button>
        <button onClick={markComplete} style={{ flex: 3, padding: '14px', borderRadius: 10, border: 'none', background: current.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isLast ? 'Complete — rest well →' : 'Done — next →'}
        </button>
      </div>
    </div>
  )
}
