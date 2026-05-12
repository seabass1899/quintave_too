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
  recovery:         'stabilization before expansion',
  collapse_rebuild: 'restore before rebuilding',
  stabilization:    'building stable coherence',
  expansion:        'increasing depth carefully',
  integration:      'consolidating recent gains',
  baseline_building:'building consistency',
  lower_friction:   'reduce resistance today',
  establish_baseline:'finding the starting signal',
  increase_depth:   'advancing with momentum',
  reinforce_momentum:'holding what is working',
}

export default function PhaseReadCards({
  phase,
  primaryFocus,
  trajectory,
  systemBias
}) {
  const cards = [
    {
      icon: '◈',
      label: 'Current Phase',
      value: formatLabel(phase),
      sub: phaseDescriptions[phase] || null,
      bg: '#EEEDFE',
      border: '#7F77DD30',
      accent: '#7F77DD',
    },
    {
      icon: '◎',
      label: 'Primary Focus',
      value: formatLabel(primaryFocus, 'System'),
      sub: null,
      bg: '#F4F3F0',
      border: 'rgba(0,0,0,0.08)',
      accent: '#1a1a18',
    },
    {
      icon: '↗',
      label: 'Trajectory',
      value: formatLabel(trajectory, 'Baseline Building'),
      sub: phaseDescriptions[trajectory] || null,
      bg: '#FAEEDA',
      border: '#BA751730',
      accent: '#BA7517',
    },
    {
      icon: '⚡',
      label: 'System Bias',
      value: formatLabel(systemBias, 'Stabilize First'),
      sub: phaseDescriptions[systemBias] || null,
      bg: '#E1F5EE',
      border: '#1D9E7530',
      accent: '#1D9E75',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12,
        marginTop: 14,
        marginBottom: 16,
      }}
    >
      {cards.map(card => (
        <div
          key={card.label}
          style={{
            background: card.bg,
            border: `1px solid ${card.border}`,
            borderTop: `3px solid ${card.accent}`,
            borderRadius: 12,
            padding: '12px 14px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                color: card.accent,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {card.icon}
            </span>

            <div
              style={{
                fontSize: 10,
                color: '#6F6A7A',
                textTransform: 'uppercase',
                letterSpacing: '0.095em',
                fontWeight: 900,
              }}
            >
              {card.label}
            </div>
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 950,
              letterSpacing: '-0.035em',
              color: '#1a1a18',
              lineHeight: 1.15,
            }}
          >
            {card.value}
          </div>
          {card.sub && (
            <div style={{
              marginTop: 5,
              fontSize: 11,
              color: '#6B6780',
              lineHeight: 1.4,
              fontWeight: 500,
            }}>
              {card.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
