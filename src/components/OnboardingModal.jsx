import { useState } from 'react'

const DOMAIN_STYLES = {
  Source: { color: '#7F77DD', bg: '#EEEDFE', text: '#3C3489', icon: '✦' },
  Form:   { color: '#1D9E75', bg: '#E1F5EE', text: '#085041', icon: '♥' },
  Field:  { color: '#BA7517', bg: '#FAEEDA', text: '#633806', icon: '∿' },
  Mind:   { color: '#378ADD', bg: '#E6F1FB', text: '#0C447C', icon: '◈' },
  Code:   { color: '#D85A30', bg: '#FAECE7', text: '#712B13', icon: '☽' },
}

const DOMAIN_DESCRIPTIONS = {
  Source: 'The stabilizing reference. Your center point. Immovable and always present.',
  Form:   'Body, energy, sleep, recovery. The physical vessel everything else runs on.',
  Field:  'Emotion, nervous system, relational energy. The feeling body.',
  Mind:   'Attention, thought, intention, mental clarity. The conscious director.',
  Code:   'Habits, identity, subconscious patterns. The operating system beneath awareness.',
}

const slides = [
  {
    title: 'Welcome to Quintave',
    subtitle: 'Five frequency bodies. One daily tuning practice.',
    body: ({ }) => (
      <>
        <p style={{ color: '#5F5E5A', lineHeight: 1.7, marginBottom: 18 }}>
          You are not broken. Quintave helps you detect drift across the five
          frequency bodies that shape your daily experience — and correct
          back toward Source alignment.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(DOMAIN_STYLES).map(([name, style]) => (
            <div key={name} style={{
              padding: '8px 14px', borderRadius: 999,
              background: style.bg, border: `1px solid ${style.color}40`,
              fontWeight: 700, color: style.text, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{style.icon}</span><span>{name}</span>
            </div>
          ))}
        </div>
      </>
    )
  },
  {
    title: 'The Five Frequency Bodies',
    subtitle: 'Each body can drift — and each can be corrected.',
    body: ({ }) => (
      <div style={{ display: 'grid', gap: 8 }}>
        {Object.entries(DOMAIN_STYLES).map(([name, style]) => (
          <div key={name} style={{
            border: `1px solid ${style.color}30`,
            borderLeft: `3px solid ${style.color}`,
            borderRadius: 10, padding: '10px 14px',
            background: style.bg,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>{style.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: style.text, marginBottom: 2, fontSize: 13 }}>{name}</div>
              <div style={{ color: style.text, fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>{DOMAIN_DESCRIPTIONS[name]}</div>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    title: 'Source is the anchor',
    subtitle: 'Everything else calibrates to it.',
    body: ({ }) => (
      <>
        <div style={{
          background: '#EEEDFE', border: '1px solid #7F77DD30',
          borderLeft: '3px solid #7F77DD', borderRadius: 12,
          padding: '14px 18px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: '#3C3489', lineHeight: 1.7 }}>
            Source is immovable. It does not drift, stress, or get injured.
            It is the reference frequency all other bodies must harmonize with.
            Your daily practices are instruments of alignment — bringing Form,
            Field, Mind, and Code back into resonance with Source.
          </div>
        </div>
        <p style={{ color: '#5F5E5A', lineHeight: 1.7, fontSize: 13 }}>
          Every morning begins with Source. Every correction points back to it.
          The further a body drifts from Source, the more interference you feel
          in daily life.
        </p>
      </>
    )
  },
  {
    title: 'Daily Alignment',
    subtitle: 'The system reads your state and builds your plan.',
    body: ({ }) => (
      <>
        <p style={{ color: '#5F5E5A', lineHeight: 1.7, marginBottom: 16 }}>
          Each day Quintave detects which frequency body has drifted furthest
          from Source and builds a correction plan for that body. You do not
          need to do everything — simply complete your minimum daily alignment.
        </p>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8,
          flexWrap: 'wrap', marginBottom: 16,
        }}>
          {[
            { label: 'Morning', color: '#1a1a18', bg: '#1a1a18', text: '#fff', desc: 'Initialize' },
            { label: 'Midday',  color: '#1D9E75', bg: '#E1F5EE', text: '#085041', desc: 'Correct' },
            { label: 'Evening', color: '#7F77DD', bg: '#EEEDFE', text: '#3C3489', desc: 'Integrate' },
          ].map((phase, i, arr) => (
            <div key={phase.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                padding: '8px 16px', borderRadius: 99,
                background: phase.bg, border: `1px solid ${phase.color}40`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: phase.text }}>{phase.label}</div>
                <div style={{ fontSize: 10, color: phase.text, opacity: 0.7 }}>{phase.desc}</div>
              </div>
              {i < arr.length - 1 && <span style={{ color: '#ccc', fontSize: 16 }}>→</span>}
            </div>
          ))}
        </div>
        <p style={{ color: '#888', lineHeight: 1.6, fontSize: 12 }}>
          Complete Morning to unlock Midday. Complete Midday to unlock Evening.
          Lock the daily minimum to build your streak.
        </p>
      </>
    )
  },
  {
    title: 'Begin your alignment',
    subtitle: 'The goal is coherence, not perfection.',
    body: ({ }) => (
      <>
        <p style={{ color: '#5F5E5A', lineHeight: 1.7, marginBottom: 14 }}>
          Missing a day is feedback — not failure. Quintave adapts to you,
          detects recurring drift patterns, and adjusts tomorrow's plan accordingly.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { icon: '✦', title: 'Source first', desc: 'Every morning begins with Source — the anchor before anything else.' },
            { icon: '⚡', title: 'Correction, not perfection', desc: 'One aligned day begins restoring the frequency. Consistency builds the plane.' },
            { icon: '◎', title: 'The system reads you', desc: 'Your plan changes based on what your frequency bodies actually need today.' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '10px 14px',
              background: '#F7F6F3', borderRadius: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  },
]

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0)
  const isLast = step === slides.length - 1
  const slide = slides[step]
  const Body = slide.body

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,25,0.6)',
      zIndex: 9999, display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#fff', borderRadius: 20,
        padding: window.innerWidth < 768 ? '20px 18px' : '28px 28px', maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.18)',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              flex: i === step ? 2 : 1, height: 4, borderRadius: 99,
              background: i <= step ? '#7F77DD' : '#EEEDE9',
              transition: 'all 0.3s',
            }}/>
          ))}
        </div>

        {/* Title */}
        <div style={{ fontSize: window.innerWidth < 768 ? 20 : 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, color: '#1a1a18' }}>
          {slide.title}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          {slide.subtitle}
        </div>

        {/* Body */}
        <div style={{ color: '#444', lineHeight: 1.8 }}>
          <Body />
        </div>

        {/* Navigation */}
        <div style={{
          marginTop: 24, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 16 : 6, height: 6,
                borderRadius: 99, background: i === step ? '#7F77DD' : '#EEEDE9',
                transition: 'all 0.3s',
              }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                background: 'none', border: '0.5px solid rgba(0,0,0,0.12)',
                borderRadius: 99, padding: '10px 18px',
                cursor: 'pointer', fontSize: 13, color: '#888',
              }}>Back</button>
            )}
            <button onClick={() => {
              if (isLast) {
                localStorage.setItem('q_ftue_complete', 'true')
                onComplete()
                return
              }
              setStep(s => s + 1)
            }} style={{
              background: '#1a1a18', color: '#fff', border: 'none',
              borderRadius: 99, padding: '11px 24px',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              {isLast ? 'Begin Today →' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
