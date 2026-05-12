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
      bg: 'linear-gradient(135deg, #F3F1FF, #FCFBF8)',
      border: '#7F77DD33',
      accent: '#7F77DD',
    },
    {
      icon: '◎',
      label: 'Primary Focus',
      value: formatLabel(primaryFocus, 'System'),
      bg: 'linear-gradient(135deg, #F4F6FB, #FFFFFF)',
      border: '#378ADD30',
      accent: '#378ADD',
    },
    {
      icon: '↗',
      label: 'Trajectory',
      value: formatLabel(trajectory, 'Baseline Building'),
      bg: 'linear-gradient(135deg, #FCFBF8, #F7F6F3)',
      border: '#D4AF3730',
      accent: '#BA7517',
    },
    {
      icon: '⚡',
      label: 'System Bias',
      value: formatLabel(systemBias, 'Stabilize First'),
      bg: 'linear-gradient(135deg, #EEEDFE, #FFF9F1)',
      border: '#7F77DD35',
      accent: '#3C3489',
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
            borderRadius: 16,
            padding: '14px 15px',
            boxShadow: '0 8px 22px rgba(60,52,137,0.055)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              background: card.accent,
              opacity: 0.75,
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginBottom: 8,
              paddingLeft: 2,
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
              paddingLeft: 2,
            }}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}
