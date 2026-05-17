/**
 * DailyCoachCard.jsx
 * src/features/coach/DailyCoachCard.jsx
 *
 * Sprint 8: Renders the dynamic coach message.
 * Replaces the static DesktopTuningFocus / MobileTuningFocus on the Today tab.
 */

import React, { useState } from 'react'

const TONE_STYLES = {
  warm:         { accent: '#7F77DD', bg: '#F3F1FF', border: '#7F77DD30', label: null },
  direct:       { accent: '#1a1a18', bg: '#F4F3F0', border: 'rgba(0,0,0,0.08)', label: null },
  measured:     { accent: '#378ADD', bg: '#E6F1FB', border: '#378ADD25', label: null },
  celebratory:  { accent: '#085041', bg: '#E1F5EE', border: '#1D9E7530', label: '✦' },
}

// ─── Daily Coach Card ─────────────────────────────────────────────────────────

export function DailyCoachCard({ message, isMobile }) {
  const [expanded, setExpanded] = useState(false)
  if (!message) return null

  const style = TONE_STYLES[message.tone] || TONE_STYLES.measured
  const pad   = isMobile ? '11px 13px' : '14px 18px'

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderLeft: `3px solid ${style.accent}`,
      borderRadius: '0 12px 12px 0',
      padding: pad,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: style.accent, marginBottom: 5 }}>
        {style.label ? `${style.label} ` : ''}Today's coaching
      </div>

      {/* Headline */}
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 900, color: '#1a1a18', lineHeight: 1.3, marginBottom: 6 }}>
        {message.headline}
      </div>

      {/* Body — collapsed on mobile to save space */}
      {isMobile ? (
        <>
          {expanded && (
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.65, marginBottom: 8 }}>
              {message.body}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: style.accent, fontWeight: 700, flex: 1 }}>
              → {message.action}
            </div>
            <span
              onClick={() => setExpanded(v => !v)}
              style={{ fontSize: 11, color: '#aaa', cursor: 'pointer', flexShrink: 0 }}
            >
              {expanded ? '▲ less' : '▼ why'}
            </span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.65, marginBottom: 10 }}>
            {message.body}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 800, color: style.accent,
            borderTop: `1px solid ${style.border}`, paddingTop: 8,
          }}>
            → {message.action}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Pattern Break Notice ─────────────────────────────────────────────────────

export function PatternBreakCoachCard({ message }) {
  if (!message) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, #E1F5EE, #F3F1FF)',
      border: '1px solid #1D9E7530',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#085041', marginBottom: 4 }}>
        {message.headline}
      </div>
      <div style={{ fontSize: 12, color: '#1a1a18', lineHeight: 1.55 }}>
        {message.body}
      </div>
    </div>
  )
}

// ─── Tomorrow Coach Line ──────────────────────────────────────────────────────

export function TomorrowCoachLine({ message }) {
  if (!message) return null
  return (
    <div style={{
      fontSize: 12, color: '#3C3489', lineHeight: 1.6,
      background: '#F3F1FF', borderRadius: 8,
      padding: '8px 12px', marginTop: 10,
      fontStyle: 'italic',
    }}>
      ◈ {message}
    </div>
  )
}
