export default function PhaseReadCards({
  phase,
  primaryFocus,
  trajectory,
  systemBias
}) {
  const cards = [
    {
      label: 'Current Phase',
      value: phase || 'Baseline'
    },
    {
      label: 'Primary Focus',
      value: primaryFocus || 'Unknown'
    },
    {
      label: 'Trajectory',
      value: trajectory || 'Baseline Building'
    },
    {
      label: 'System Bias',
      value: systemBias || 'Stabilize First'
    }
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 16,
        marginBottom: 18
      }}
    >
      {cards.map(card => (
        <div
          key={card.label}
          style={{
            background: '#fff',
            border: '1px solid #e5e5ef',
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#666',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600
            }}
          >
            {card.label}
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1a1a1a'
            }}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}
