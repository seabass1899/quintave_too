import React, { useMemo } from 'react'
import { DOMAINS } from '../../data'
import { calculateFrequencyState, FREQUENCY_PLANES, SOURCE_CONNECTION_LEVEL } from './frequencyModel'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function PlaneBadge({ plane, active = false }) {
  return (
    <div style={{
      border: `1px solid ${active ? plane.color + '55' : 'rgba(0,0,0,0.08)'}`,
      background: active ? plane.bg : '#fff',
      borderRadius: 12,
      padding: '10px 12px',
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      minHeight: 68,
    }}>
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        background: active ? plane.color : '#F0EFEC',
        color: active ? '#fff' : '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 950,
        flexShrink: 0,
      }}>{plane.level}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: active ? plane.color : '#1a1a18' }}>{plane.name}</div>
        <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>{plane.band}</div>
      </div>
    </div>
  )
}

function DomainFrequencyRow({ domain }) {
  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 13, padding: '12px 13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: domain.bg, color: domain.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{domain.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#1a1a18' }}>{domain.name}</div>
            <div style={{ fontSize: 10, color: '#888' }}>Anchor: {domain.anchorPractice}</div>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 950, color: domain.color }}>{domain.resonance}</div>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: '#F0EFEC', overflow: 'hidden' }}>
        <div style={{ height: 7, borderRadius: 999, background: domain.color, width: `${domain.resonance}%`, transition: 'width 220ms ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#888' }}>
        <span>Baseline {domain.baseline}</span>
        <span>Today {domain.practice}%</span>
      </div>
    </div>
  )
}

function ThresholdGate({ state }) {
  const ready = state.sourceConnectionReady
  return (
    <div style={{
      background: ready ? '#E1F5EE' : '#FAEEDA',
      border: `1px solid ${ready ? '#1D9E7535' : '#BA751735'}`,
      borderRadius: 16,
      padding: '15px 16px',
      marginTop: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', color: ready ? '#085041' : '#633806', marginBottom: 6 }}>
        Level {SOURCE_CONNECTION_LEVEL} Source Connection Gate
      </div>
      <div style={{ fontSize: 15, fontWeight: 950, color: ready ? '#085041' : '#633806', marginBottom: 5 }}>
        {ready ? 'Source contact is active' : 'Source contact is not yet stable'}
      </div>
      <div style={{ fontSize: 13, color: ready ? '#085041' : '#633806', lineHeight: 1.55 }}>
        {ready
          ? 'The Source fractal is available as a living reference point. The work now is stabilizing the other bodies around it.'
          : 'The system is still operating below the Source-connected band. Raise Source resonance and reduce domain spread to cross Plane 5.'}
      </div>
      {!ready && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {state.thresholdGap.source > 0 && <span style={pill('#8B84E8')}>Source gap: {state.thresholdGap.source}</span>}
          {state.thresholdGap.domainAverage > 0 && <span style={pill('#378ADD')}>System gap: {state.thresholdGap.domainAverage}</span>}
          {state.thresholdGap.harmony > 0 && <span style={pill('#BA7517')}>Harmony gap: {state.thresholdGap.harmony}</span>}
        </div>
      )}
    </div>
  )
}

function pill(color) {
  return {
    fontSize: 11,
    fontWeight: 850,
    borderRadius: 999,
    padding: '5px 9px',
    color,
    background: '#fff',
    border: `1px solid ${color}30`,
  }
}

export default function FrequencyLayer({ onboardingProfile, domainScores = {}, checked = {} }) {
  const state = useMemo(() => calculateFrequencyState({ onboardingProfile, domainScores, checked }), [onboardingProfile, domainScores, checked])
  const plane = state.plane
  const next = state.nextPlane

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Frequency Layer</div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.04em' }}>Source connection and 11-plane resonance</h2>
        <div style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.55 }}>
          This layer translates the five game pieces into a Level 1–11 frequency reading. Level 5 is the minimum Source-connection threshold.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: plane.bg, border: `1.5px solid ${plane.color}35`, borderRadius: 18, padding: '22px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: plane.color, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Current frequency plane</div>
              <div style={{ fontSize: 52, fontWeight: 950, color: plane.color, lineHeight: 0.95 }}>Level {state.level}</div>
              <div style={{ fontSize: 24, fontWeight: 950, color: plane.color, letterSpacing: '-0.03em', marginTop: 8 }}>{plane.name}</div>
              <div style={{ fontSize: 13, color: '#4d4b45', lineHeight: 1.62, marginTop: 10, maxWidth: 570 }}>{plane.desc}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '11px 13px', border: `1px solid ${plane.color}25`, minWidth: 122, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: plane.color }}>{state.rawFrequencyScore}</div>
              <div style={{ fontSize: 10, color: '#888' }}>weighted</div>
            </div>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: 18 }}>
            <div style={{ height: 9, borderRadius: 999, background: plane.color, width: `${state.progressWithinLevel}%`, transition: 'width 250ms ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 7, fontSize: 11, color: '#666' }}>
            <span>Progress inside Level {state.level}</span>
            <span>{state.level < 11 ? `${state.progressWithinLevel}% toward ${next.name}` : 'Full plane reached'}</span>
          </div>
          <ThresholdGate state={state} />
        </div>

        <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '18px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>Frequency components</div>
          {[
            ['Source resonance', state.source, '#8B84E8'],
            ['Variable-body average', state.nonSourceAvg, '#378ADD'],
            ['Harmony / domain balance', state.harmony, '#1D9E75'],
            ['Continuity / streak field', state.continuity, '#D85A30'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 850, color: '#1a1a18' }}>{label}</span>
                <span style={{ color, fontWeight: 950 }}>{value}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#F0EFEC', overflow: 'hidden' }}>
                <div style={{ width: `${value}%`, height: 6, borderRadius: 999, background: color }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, background: state.nextAction.domain.bg, borderRadius: 13, padding: '12px 13px', border: `1px solid ${state.nextAction.domain.color}30` }}>
            <div style={{ fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: state.nextAction.domain.color }}>Next frequency move</div>
            <div style={{ fontSize: 15, fontWeight: 950, color: state.nextAction.domain.text, marginTop: 5 }}>{state.nextAction.practice}</div>
            <div style={{ fontSize: 12, color: state.nextAction.domain.text, lineHeight: 1.5, marginTop: 4, opacity: 0.88 }}>{state.nextAction.reason}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 9, marginBottom: 14 }}>
        {state.domainResonance.map(domain => <DomainFrequencyRow key={domain.id} domain={domain} />)}
      </div>

      <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '18px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 950 }}>The 11 frequency planes</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>Planes 1–4 are below stable Source contact. Plane 5 and above are Source-connected operating bands.</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: state.sourceConnectionReady ? '#085041' : '#633806', background: state.sourceConnectionReady ? '#E1F5EE' : '#FAEEDA', borderRadius: 999, padding: '7px 10px', whiteSpace: 'nowrap' }}>
            {state.sourceConnectionReady ? 'Source-connected' : 'Below Level 5'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {FREQUENCY_PLANES.map(p => <PlaneBadge key={p.level} plane={p} active={p.level === state.level} />)}
        </div>
      </div>

      <div style={{ background: '#FCFBF8', border: bdr, borderRadius: 16, padding: '15px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 950, marginBottom: 7 }}>Interpretation</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.65 }}>
          The goal is not to make every body perfect. The goal is to bring Form, Field, Mind, and Code into enough harmony that Source can become the reference signal. Once Level 5 is crossed, the system shifts from restoration to stabilization.
        </div>
      </div>
    </div>
  )
}
