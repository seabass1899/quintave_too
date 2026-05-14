import React, { useState } from 'react'

function formatLabel(value, fallback = 'Baseline') {
  if (!value) return fallback
  const map = {
    collapse_rebuild: 'Collapse / Rebuild',
    recovery: 'Recovery',
    stabilization: 'Stabilization',
    expansion: 'Expansion',
    integration: 'Integration',
    baseline_building: 'Baseline Building',
    lower_friction: 'Lower Friction',
    establish_baseline: 'Establish Baseline',
    increase_depth: 'Increase Depth',
    reinforce_momentum: 'Reinforce Momentum',
  }
  return map[value] || String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const phaseDescriptions = {
  recovery:          'stabilization before expansion',
  collapse_rebuild:  'restore before rebuilding',
  stabilization:     'building stable coherence',
  expansion:         'increasing depth carefully',
  integration:       'consolidating recent gains',
  baseline_building: 'building consistency',
  lower_friction:    'reduce resistance today',
  establish_baseline:'finding the starting signal',
  increase_depth:    'advancing with momentum',
  reinforce_momentum:'holding what is working',
}

export default function PhaseReadCards({ phase, primaryFocus, trajectory, systemBias }) {
  const [expanded, setExpanded] = useState(false)

  const cards = [
    {
      icon: '◈', label: 'Current Phase',
      value: formatLabel(phase),
      sub: phaseDescriptions[phase] || null,
      bg: '#EEEDFE', border: '#7F77DD30', accent: '#7F77DD',
    },
    {
      icon: '◎', label: 'Primary Focus',
      value: formatLabel(primaryFocus, 'System'),
      sub: null,
      bg: '#F4F3F0', border: 'rgba(0,0,0,0.08)', accent: '#1a1a18',
    },
    {
      icon: '↗', label: 'Trajectory',
      value: formatLabel(trajectory, 'Baseline Building'),
      sub: phaseDescriptions[trajectory] || null,
      bg: '#FAEEDA', border: '#BA751730', accent: '#BA7517',
    },
    {
      icon: '⚡', label: 'System Bias',
      value: formatLabel(systemBias, 'Stabilize First'),
      sub: phaseDescriptions[systemBias] || null,
      bg: '#E1F5EE', border: '#1D9E7530', accent: '#1D9E75',
    },
  ]

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isMobile) {
    // Mobile: show 2-line summary, tap to expand full 2×2 grid
    const primaryCard = cards[0]
    const focusCard = cards[1]
    return (
      <div style={{ marginTop: 10, marginBottom: 12 }}>
        {/* Collapsed summary — always visible */}
        <div
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: '#F4F3F0',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
            border: '0.5px solid rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, background: primaryCard.bg, color: primaryCard.accent, padding: '3px 9px', borderRadius: 99, border: `1px solid ${primaryCard.border}`, whiteSpace: 'nowrap' }}>
              {primaryCard.icon} {primaryCard.value}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#555', padding: '3px 9px', borderRadius: 99, background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>
              {focusCard.icon} {focusCard.value}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Expanded 2×2 grid */}
        {expanded && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 8,
          }}>
            {cards.map(card => (
              <div key={card.label} style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderTop: `3px solid ${card.accent}`,
                borderRadius: 10,
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ color: card.accent, fontSize: 12, fontWeight: 900 }}>{card.icon}</span>
                  <div style={{ fontSize: 9, color: '#6F6A7A', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 900 }}>
                    {card.label}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 950, letterSpacing: '-0.03em', color: '#1a1a18', lineHeight: 1.2 }}>
                  {card.value}
                </div>
                {card.sub && (
                  <div style={{ marginTop: 4, fontSize: 10, color: '#6B6780', lineHeight: 1.4, fontWeight: 500 }}>
                    {card.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop: full 4-card row (unchanged)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: 12,
      marginTop: 14,
      marginBottom: 16,
    }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: card.bg,
          border: `1px solid ${card.border}`,
          borderTop: `3px solid ${card.accent}`,
          borderRadius: 12,
          padding: '12px 14px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ color: card.accent, fontSize: 13, fontWeight: 900 }}>{card.icon}</span>
            <div style={{ fontSize: 10, color: '#6F6A7A', textTransform: 'uppercase', letterSpacing: '0.095em', fontWeight: 900 }}>
              {card.label}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '-0.035em', color: '#1a1a18', lineHeight: 1.15 }}>
            {card.value}
          </div>
          {card.sub && (
            <div style={{ marginTop: 5, fontSize: 11, color: '#6B6780', lineHeight: 1.4, fontWeight: 500 }}>
              {card.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
