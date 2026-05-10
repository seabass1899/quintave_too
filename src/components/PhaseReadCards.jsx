// ─── PhaseReadCards.jsx ───────────────────────────────────────────────────────

import React from 'react'

export default function PhaseReadCards({ phase, primaryFocus, trajectory, systemBias }) {

  const cards = [
    {
      label: 'Current Phase',
      value: phase || '—',
      color: '#7F77DD',
      bg: '#EEEDFE',
      text: '#3C3489',
      icon: '✦',
    },
    {
      label: 'Primary Focus',
      value: primaryFocus || '—',
      color: '#E24B4A',
      bg: '#FCEBEB',
      text: '#791F1F',
      icon: '⚡',
    },
    {
      label: 'Trajectory',
      value: trajectory || '—',
      color: '#BA7517',
      bg: '#FAEEDA',
      text: '#633806',
      icon: '↗',
    },
    {
      label: 'System Response',
      value: systemBias || '—',
      color: '#1D9E75',
      bg: '#E1F5EE',
      text: '#085041',
      icon: '◎',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      margin: '10px 0',
    }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: card.bg,
          border: `1px solid ${card.color}30`,
          borderRadius: 10,
          padding: '10px 12px',
          borderTop: `3px solid ${card.color}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 5,
          }}>
            <span style={{ fontSize: 11, color: card.color }}>{card.icon}</span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: card.color,
            }}>
              {card.label}
            </span>
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: card.text,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}
