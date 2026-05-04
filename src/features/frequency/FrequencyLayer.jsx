import React, { useMemo } from 'react'
import { calculateFrequencyState, FREQUENCY_PLANES, SOURCE_CONNECTION_LEVEL, GRAY_ZONE_CORE_THRESHOLD } from './frequencyModel'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function meterColor(value) {
  if (value >= 80) return '#1D9E75'
  if (value >= 60) return '#378ADD'
  if (value >= 45) return '#7F77DD'
  if (value >= 30) return '#BA7517'
  return '#E24B4A'
}

function MetricBar({ label, value, color = meterColor(value), suffix = '', help = '' }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, marginBottom: 5 }}>
        <span style={{ fontWeight: 850, color: '#1a1a18' }}>{label}</span>
        <span style={{ color, fontWeight: 950 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: '#F0EFEC', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 6, borderRadius: 999, background: color }} />
      </div>
      {help && <div style={{ fontSize: 11, color: '#777', marginTop: 4, lineHeight: 1.45 }}>{help}</div>}
    </div>
  )
}

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
      minHeight: 72,
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
        <div style={{ fontSize: 10, color: '#777', marginTop: 2 }}>{plane.range} · {plane.zone}</div>
      </div>
    </div>
  )
}

function MetricTile({ label, value }) {
  return (
    <div style={{ background:'#fff', border:bdr, borderRadius:14, padding:'13px 14px' }}>
      <div style={{ fontSize:10, color:'#777', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:20, color:'#1a1a18', fontWeight:950 }}>{value}</div>
    </div>
  )
}

function DomainFrequencyRow({ domain }) {
  const color = meterColor(domain.resonance)
  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: domain.color, fontSize: 16 }}>{domain.icon}</span>
          <div style={{ fontSize: 13, fontWeight: 950 }}>{domain.name}</div>
        </div>
        <div style={{ textAlign:'right' }}><div style={{ fontSize: 13, fontWeight: 950, color }}>{domain.resonance}</div><div style={{ fontSize: 10, color:'#777', fontWeight:800 }}>L{domain.level}</div></div>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: '#F0EFEC', overflow: 'hidden' }}>
        <div style={{ width: `${domain.resonance}%`, height: 7, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, fontSize: 10, color: '#777' }}>
        <span>Base {domain.baseline}</span>
        <span>Today {domain.practice}</span>
      </div>
      <div style={{ fontSize: 11, color: domain.color, marginTop: 7, fontWeight: 800 }}>{domain.anchorPractice}</div>
    </div>
  )
}

function SourceGate({ state }) {
  const color = state.sourceGateMet ? '#085041' : '#633806'
  const bg = state.sourceGateMet ? '#E1F5EE' : '#FAEEDA'
  return (
    <div style={{ marginTop: 15, background: bg, border: `1px solid ${color}25`, borderRadius: 14, padding: '12px 13px' }}>
      <div style={{ fontSize: 11, fontWeight: 950, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
        Level {SOURCE_CONNECTION_LEVEL} Source Gate · {state.sourceGateMet ? 'Open' : 'Closed'}
      </div>
      <div style={{ fontSize: 12, color, lineHeight: 1.55 }}>
        {state.sourceGateMet
          ? 'The minimum Source-connection threshold is active. The system can now stabilize above the Red Zone.'
          : `To cross Level 5: Source ≥ 50, coherence ≥ 45, 3 clean locked days, and core energy ≥ 50. Remaining gaps — Source ${state.thresholdGap.source}, coherence ${state.thresholdGap.coherence}, clean days ${state.thresholdGap.cleanLockedDays}, core ${state.thresholdGap.coreEnergy}.`}
      </div>
    </div>
  )
}

function GrayGate({ state }) {
  const open = state.grayGateMet
  const color = open ? '#2F333A' : '#5F6470'
  return (
    <div style={{ background: open ? '#E3E5E8' : '#F5F5F6', border: `1px solid ${color}25`, borderRadius: 14, padding: '12px 13px' }}>
      <div style={{ fontSize: 11, fontWeight: 950, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
        Gray Zone Gate · {open ? 'Open' : 'Locked'}
      </div>
      <div style={{ fontSize: 12, color, lineHeight: 1.55 }}>
        {open
          ? 'Gray Zone conditions are met: high core-cell integrity, domain harmony, clean streak continuity, and no recent missed days.'
          : `Requires core energy ≥ ${GRAY_ZONE_CORE_THRESHOLD}, Source ≥ 90, all domains ≥ 80, 30-day clean streak, and no recent missed days. Current gaps — core ${state.grayGateGap.coreEnergy}, Source ${state.grayGateGap.source}, domains ${state.grayGateGap.allDomains}, streak ${state.grayGateGap.streak}, recent misses ${state.grayGateGap.recentMissedDays}.`}
      </div>
    </div>
  )
}

export default function FrequencyLayer({ onboardingProfile, domainScores = {}, checked = {}, dayStatus = null }) {
  const state = useMemo(() => calculateFrequencyState({ onboardingProfile, domainScores, checked, dayStatus }), [onboardingProfile, domainScores, checked, dayStatus])
  const plane = state.plane
  const zoneColor = plane.color

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Frequency Layer</div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.04em' }}>Red, Blue, and Gray Zone progression</h2>
        <div style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.55 }}>
          Frequency climbs gradually. Daily signal can move quickly; plane level moves through core energy, Source access, harmony, and clean continuity.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: plane.bg, border: `1.5px solid ${plane.color}35`, borderRadius: 18, padding: '22px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: zoneColor, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>{state.zone}</div>
              <div style={{ fontSize: 52, fontWeight: 950, color: zoneColor, lineHeight: 0.95 }}>Level {state.level}</div>
              <div style={{ fontSize: 24, fontWeight: 950, color: zoneColor, letterSpacing: '-0.03em', marginTop: 8 }}>{plane.name}</div>
              <div style={{ fontSize: 13, color: '#4d4b45', lineHeight: 1.62, marginTop: 10, maxWidth: 600 }}>{plane.desc}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '11px 13px', border: `1px solid ${zoneColor}25`, minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Core Cell</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: zoneColor }}>{state.coreEnergy}%</div>
              <div style={{ fontSize: 10, color: '#888' }}>long-term reserve</div>
            </div>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: 18 }}>
            <div style={{ height: 9, borderRadius: 999, background: zoneColor, width: `${state.progressWithinLevel}%`, transition: 'width 250ms ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 7, fontSize: 11, color: '#666' }}>
            <span>Progress inside current level</span>
            <span>{state.progressWithinLevel}%</span>
          </div>
          <SourceGate state={state} />
        </div>

        <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '18px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>Energy economy</div>
          <MetricBar label="Core energy" value={state.coreEnergy} color={zoneColor} help="Long-term reserve. Clean locked days refill it slowly; missed days drain it." />
          <MetricBar label="Daily supply" value={state.dailySupply} color="#378ADD" help="Daily supply is proportional to core-cell reserve. More core = more energy available for the day." />
          <MetricBar label="Energy remaining" value={state.dailyEnergyRemaining} color={meterColor(state.dailyEnergyRemaining)} help="Estimated current-day reserve after execution, missed/reopened state, and practice activity." />
          <MetricBar label="Source-weighted coherence" value={state.coherence} color="#7F77DD" help="Source-weighted average of all five game pieces." />
          <MetricBar label="System coherence" value={state.systemCoherence} color="#7F77DD" help="Balance-adjusted coherence. Energy becomes usable only when the whole system is synchronized." />
          <MetricBar label="Domain harmony" value={state.harmony} color="#1D9E75" help="How balanced the five bodies are. A weak domain caps advancement." />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '18px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>Next frequency move</div>
          <div style={{ background: state.nextAction.domain.bg, borderRadius: 13, padding: '12px 13px', border: `1px solid ${state.nextAction.domain.color}30` }}>
            <div style={{ fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: state.nextAction.domain.color }}>{state.nextAction.domain.name}</div>
            <div style={{ fontSize: 16, fontWeight: 950, color: state.nextAction.domain.text, marginTop: 5 }}>{state.nextAction.practice}</div>
            <div style={{ fontSize: 12, color: state.nextAction.domain.text, lineHeight: 1.5, marginTop: 4, opacity: 0.88 }}>{state.nextAction.reason}</div>
          </div>
        </div>
        <GrayGate state={state} />
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: state.operatingMode.bg, border: `1px solid ${state.operatingMode.color}25`, borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em', color: state.operatingMode.color, marginBottom: 6 }}>Operating mode</div>
          <div style={{ fontSize: 19, fontWeight: 950, color: state.operatingMode.color }}>{state.operatingMode.label}</div>
          <div style={{ fontSize: 12, color: state.operatingMode.color, lineHeight: 1.55, marginTop: 6, opacity: 0.88 }}>{state.operatingMode.desc}</div>
        </div>

        <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 10 }}>Instability flags</div>
          {state.instabilityFlags.length === 0 ? (
            <div style={{ fontSize: 13, color:'#085041', background:'#E1F5EE', borderRadius:12, padding:'10px 12px', fontWeight:800 }}>No major instability flags detected.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {state.instabilityFlags.map(flag => (
                <div key={flag.id} style={{ fontSize:12, color:'#5F5E5A', background:'#F7F6F3', borderRadius:10, padding:'8px 10px' }}>• {flag.label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 950 }}>Harmonization gate</div>
            <div style={{ fontSize: 12, color:'#666', marginTop:3, lineHeight:1.55 }}>To advance from Level L to Level L+1, all non-Source domains must be harmonized at Level L. Source is already present from Level 5 upward and does not block higher-level harmonization.</div>
          </div>
          <div style={{ fontSize:11, fontWeight:900, borderRadius:999, padding:'7px 10px', background: state.blockingDomains.length ? '#FAEEDA' : '#E1F5EE', color: state.blockingDomains.length ? '#633806' : '#085041', alignSelf:'flex-start' }}>
            Harmonized at L{state.harmonization.harmonizedAt}
          </div>
        </div>
        {state.blockingDomains.length ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:8 }}>
            {state.blockingDomains.map(d => (
              <div key={d.id} style={{ background:d.bg, border:`1px solid ${d.color}30`, borderRadius:12, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:d.color, fontWeight:950, textTransform:'uppercase', letterSpacing:'0.08em' }}>{d.name} blocking advancement</div>
                <div style={{ fontSize:13, color:d.text, fontWeight:900, marginTop:4 }}>Current L{d.level} · needs {d.needed}% resonance</div>
                <div style={{ fontSize:12, color:d.text, lineHeight:1.5, marginTop:3, opacity:0.88 }}>Gap: +{d.gap}. Next stabilizer: {d.anchorPractice}.</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize:13, color:'#085041', background:'#E1F5EE', borderRadius:12, padding:'10px 12px', fontWeight:800 }}>No domain is currently blocking the next harmonization gate.</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9, marginBottom: 14 }}>
        <MetricTile label="Thought amplification" value={state.performanceLayer.thoughtAmplification} />
        <MetricTile label="Experience range" value={`${state.performanceLayer.perceivedExperienceRange}%`} />
        <MetricTile label="Environment match" value={`${state.performanceLayer.environmentMatch}%`} />
        <MetricTile label="Outcome quality" value={`${state.performanceLayer.outcomeQuality}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 9, marginBottom: 14 }}>
        {state.domainResonance.map(domain => <DomainFrequencyRow key={domain.id} domain={domain} />)}
      </div>

      <div style={{ background: '#fff', border: bdr, borderRadius: 18, padding: '18px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 950 }}>Frequency planes</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>Levels 1 and 2 are intentionally absent. Red Zone is any state below Level 5. Blue Zone is Level 5–9. Gray Zone is Level 10–11.</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, color: state.sourceGateMet ? '#085041' : '#633806', background: state.sourceGateMet ? '#E1F5EE' : '#FAEEDA', borderRadius: 999, padding: '7px 10px', whiteSpace: 'nowrap' }}>
            {state.sourceGateMet ? 'Source Gate Open' : 'Red Zone'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {FREQUENCY_PLANES.map(p => <PlaneBadge key={p.level} plane={p} active={p.level === Math.floor(state.level)} />)}
        </div>
      </div>

      <div style={{ background: '#FCFBF8', border: bdr, borderRadius: 16, padding: '15px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 950, marginBottom: 7 }}>Interpretation</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.65 }}>
          The app treats frequency as a gradual climb. Completion creates signal, signal feeds energy, and energy only becomes usable when the system is coherent. Advancement requires core reserve, clean continuity, Source access, and the harmonization gate: all non-Source domains must stabilize at the current level before the next level opens.
        </div>
      </div>
    </div>
  )
}
