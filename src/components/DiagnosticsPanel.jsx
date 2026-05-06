import React from 'react'

export default function DiagnosticsPanel({ plan, domainScores }) {
  if (!plan && !domainScores) return null

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{
      position: 'fixed',
      bottom: 70,
      right: 16,
      background: '#1a1a18',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '14px 16px',
      fontSize: 11,
      maxWidth: 260,
      zIndex: 9998,
      color: '#fff',
      fontFamily: 'monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: '#888', marginBottom: 10 }}>
        ◈ Diagnostics — press D to close
      </div>

      {/* Domain scores */}
      {domainScores && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>DOMAIN SCORES</div>
          {Object.entries(domainScores).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 3 }}>
              <span style={{ color: '#aaa' }}>{k}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 60, height: 4, borderRadius: 99,
                  background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${v}%`, height: '100%', borderRadius: 99,
                    background: v > 60 ? '#1D9E75' : v > 30 ? '#BA7517' : '#E24B4A' }}/>
                </div>
                <span style={{ color: '#fff', fontWeight: 600, minWidth: 28 }}>{v}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan info */}
      {plan && (
        <>
          {plan.weakestDomain && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#888' }}>Weakest: </span>
              <span style={{ color: '#E24B4A' }}>{plan.weakestDomain?.name || plan.weakestDomain}</span>
            </div>
          )}
          {plan.currentPhase && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#888' }}>Phase: </span>
              <span style={{ color: '#7F77DD' }}>{plan.currentPhase}</span>
            </div>
          )}
          {plan.phases?.morning?.items && (
            <div>
              <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>TODAY MORNING</div>
              {plan.phases.morning.items.map((item, i) => (
                <div key={i} style={{ color: '#ccc', marginBottom: 2 }}>• {item.name || item}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
