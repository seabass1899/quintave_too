/**
 * CoherenceProfile.jsx
 * src/features/profile/CoherenceProfile.jsx
 *
 * Sprint 7: Personal Coherence Profile — "Your Coherence Signature"
 * Six sections: Alignment Type | Behavioral Laws | Correction Order |
 *               Signature | Adaptive Style | Phase Performance
 */

import React, { useState, useMemo } from 'react'
import { generateCoherenceProfile } from './coherenceProfileEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children, accent = '#7F77DD' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: accent }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

// ─── 1. Alignment Type hero ───────────────────────────────────────────────────

function AlignmentTypeCard({ alignmentType, totalDays, momentumState }) {
  const momentumColors = {
    accelerating: { color: '#085041', bg: '#E1F5EE', label: '↑ Accelerating' },
    stable:       { color: '#378ADD', bg: '#E6F1FB', label: '→ Stable' },
    recovering:   { color: '#7F77DD', bg: '#EEEDFE', label: '↑ Recovering' },
  }
  const mc = momentumColors[momentumState] || momentumColors.recovering

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a18, #2a2a26)',
      borderRadius: 16, padding: '22px 24px', marginBottom: 14,
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#aaa', marginBottom: 8 }}>
        Your alignment type
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>
        {alignmentType.label}
      </div>
      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.65, marginBottom: 14 }}>
        {alignmentType.description}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 800, background: mc.bg, color: mc.color, padding: '3px 10px', borderRadius: 99 }}>
          {mc.label}
        </span>
        <span style={{ fontSize: 12, color: '#888', padding: '3px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
          {totalDays} days tracked
        </span>
      </div>
    </div>
  )
}

// ─── 2. Coherence Signature bars ─────────────────────────────────────────────

function CoherenceSignature({ bars }) {
  const max = Math.max(...bars.map(b => b.pct), 1)
  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <Section title="Coherence Signature" subtitle="Based on behavioral engagement — not self-reporting">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bars.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: b.color, flexShrink: 0 }}>{b.name}</div>
              <div style={{ flex: 1, height: 10, background: '#F0EFEC', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: 10, borderRadius: 999, background: b.color,
                  width: `${(b.pct / max) * 100}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ width: 32, fontSize: 11, fontWeight: 800, color: b.color, textAlign: 'right', flexShrink: 0 }}>
                {b.pct}%
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── 3. Behavioral Laws ───────────────────────────────────────────────────────

const STRENGTH_STYLES = {
  strong:   { color: '#085041', bg: '#E1F5EE', label: 'Strong pattern' },
  moderate: { color: '#378ADD', bg: '#E6F1FB', label: 'Moderate pattern' },
  emerging: { color: '#888',    bg: '#F4F3F0', label: 'Emerging pattern' },
}

function BehavioralLawsCard({ laws }) {
  if (!laws || laws.length === 0) return null
  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <Section title="Your Behavioral Laws" subtitle="Automatically derived from your practice history" accent="#3C3489">
        {laws.map((law, i) => {
          const style = STRENGTH_STYLES[law.strength] || STRENGTH_STYLES.emerging
          return (
            <div key={law.id} style={{
              borderLeft: `3px solid ${style.color}`,
              padding: '10px 14px',
              marginBottom: i < laws.length - 1 ? 10 : 0,
              background: '#FAFAFA',
              borderRadius: '0 10px 10px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: style.color }}>
                  Law {i + 1}
                </span>
                <span style={{ fontSize: 10, background: style.bg, color: style.color, padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>
                  {style.label}
                </span>
                <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>
                  {Math.round(law.confidence * 100)}% pattern strength
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', lineHeight: 1.35, marginBottom: 5 }}>
                {law.law}
              </div>
              <div style={{ fontSize: 12, color: style.color, lineHeight: 1.5, fontStyle: 'italic' }}>
                ◈ {law.implication}
              </div>
            </div>
          )
        })}
      </Section>
    </div>
  )
}

// ─── 4. Correction Order ─────────────────────────────────────────────────────

function CorrectionOrderCard({ order }) {
  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <Section title="Optimal Correction Order" subtitle="The sequence that creates the most downstream completion for you">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {order.map((d, i) => (
            <React.Fragment key={d.id}>
              <div style={{
                background: d.color + '18',
                border: `1.5px solid ${d.color}40`,
                borderRadius: 10,
                padding: '8px 14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{d.name}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                  {i === 0 ? 'First' : i === order.length - 1 ? 'Last' : `${i + 1}`}
                </div>
              </div>
              {i < order.length - 1 && (
                <span style={{ fontSize: 16, color: '#ccc' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 10, fontStyle: 'italic' }}>
          Derived from your co-completion patterns and domain engagement history.
        </div>
      </Section>
    </div>
  )
}

// ─── 5. Adaptive Style ───────────────────────────────────────────────────────

function AdaptiveStyleCard({ style, phasePerf }) {
  const items = [
    { label: 'Recovery response',  value: style.recoveryResponse },
    { label: 'Growth response',    value: style.growthResponse },
    { label: 'Failure trigger',    value: style.failureTrigger },
    { label: 'Best window',        value: style.bestWindow },
  ]

  const bestPhase = phasePerf.find(p => p.rate !== null)
  const worstPhase = phasePerf.slice().reverse().find(p => p.rate !== null)

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <Section title="Adaptive Style" subtitle="How your system responds to different conditions">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {items.map(({ label, value }) => (
            <div key={label} style={{ background: '#F8F7F4', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a18', lineHeight: 1.3 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Phase performance breakdown */}
        <div style={{ borderTop: bdr, paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 8 }}>
            Phase completion rates
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {phasePerf.filter(p => p.rate !== null).map(p => {
              const pct = Math.round(p.rate * 100)
              const color = pct >= 70 ? '#085041' : pct >= 45 ? '#378ADD' : '#E24B4A'
              const bg    = pct >= 70 ? '#E1F5EE' : pct >= 45 ? '#E6F1FB' : '#FCEBEB'
              return (
                <div key={p.phase} style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 950, color }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </Section>
    </div>
  )
}

// ─── Insufficient data state ──────────────────────────────────────────────────

function InsufficientData({ daysTracked }) {
  const daysNeeded = Math.max(0, 5 - daysTracked)
  return (
    <div style={{ background: '#F8F7F4', borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>◈</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a18', marginBottom: 8 }}>
        Your coherence profile is forming
      </div>
      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 20px' }}>
        Complete {daysNeeded} more aligned day{daysNeeded !== 1 ? 's' : ''} to unlock your behavioral identity. The profile is generated from real patterns — not estimates.
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < daysTracked ? '#7F77DD' : '#E0DFDC',
          }}/>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
        {daysTracked}/5 aligned days
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoherenceProfile({ checked, dayStatus, domainScores, onboardingProfile }) {
  const profile = useMemo(() => {
    try {
      return generateCoherenceProfile(
        checked || {}, dayStatus || {}, domainScores || {},
        onboardingProfile || null, new Date()
      )
    } catch (e) {
      console.error('CoherenceProfile error:', e)
      return null
    }
  }, [])

  if (!profile) return null

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.025em', color: '#1a1a18', marginBottom: 4 }}>
          Coherence Signature
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Your behavioral identity — generated from {profile.totalPracticesDone} practice completions
        </div>
      </div>

      {!profile.hasSufficientData ? (
        <InsufficientData daysTracked={profile.totalDaysTracked} />
      ) : (
        <>
          <AlignmentTypeCard
            alignmentType={profile.alignmentType}
            totalDays={profile.totalDaysTracked}
            momentumState={profile.momentumState}
          />
          <CoherenceSignature bars={profile.signatureBars} />
          <BehavioralLawsCard laws={profile.laws} />
          <CorrectionOrderCard order={profile.correctionOrder} />
          <AdaptiveStyleCard style={profile.adaptiveStyle} phasePerf={profile.phasePerformance} />
        </>
      )}

      <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center', paddingTop: 10 }}>
        Profile generated {new Date(profile.generatedAt).toLocaleString()} · Patterns shown at 65%+ strength only
      </div>
    </div>
  )
}
