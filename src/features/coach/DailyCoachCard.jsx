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

// ─── Causal Narrative Card ────────────────────────────────────────────────────

/**
 * Renders the multi-day causal narrative below the daily coach card.
 * Expandable — collapsed by default to keep the Today tab clean.
 * Only shown when getCausalNarrativeMessage() returns a result.
 */
export function CausalNarrativeCard({ message, isMobile }) {
  const [open, setOpen] = React.useState(false)
  if (!message) return null

  const confPct   = Math.round((message.confidence || 0.7) * 100)
  const confColor = confPct >= 80 ? '#085041' : confPct >= 70 ? '#BA7517' : '#888'
  const confLabel = confPct >= 80 ? 'High confidence' : confPct >= 70 ? 'Moderate confidence' : 'Emerging pattern'

  return (
    <div style={{
      background: '#FAFAF8',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderLeft: '3px solid #7F77DD',
      borderRadius: '0 10px 10px 0',
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '9px 12px' : '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, color: '#7F77DD', fontWeight: 900 }}>◈</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#3C3489', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Why the plan looks like this
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: confColor,
            background: `${confColor}15`,
            border: `0.5px solid ${confColor}30`,
            borderRadius: 99,
            padding: '2px 7px',
          }}>{confPct}%</span>
          <span style={{ fontSize: 11, color: '#bbb', fontWeight: 700 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Collapsed state — shows headline as preview */}
      {!open && (
        <div style={{
          padding: isMobile ? '0 12px 9px' : '0 14px 10px',
          fontSize: 12,
          color: '#666',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {message.headline}
        </div>
      )}

      {/* Expanded state — full narrative */}
      {open && (
        <div style={{ padding: isMobile ? '0 12px 12px' : '0 14px 14px' }}>
          {/* Headline */}
          <div style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 800,
            color: '#1a1a18',
            lineHeight: 1.4,
            marginBottom: 10,
          }}>
            {message.headline}
          </div>

          {/* Narrative */}
          <div style={{
            fontSize: 12,
            color: '#444',
            lineHeight: 1.65,
            marginBottom: 10,
          }}>
            {message.narrative}
          </div>

          {/* Implication */}
          <div style={{
            background: '#F3F1FF',
            border: '0.5px solid #7F77DD25',
            borderLeft: '2px solid #7F77DD',
            borderRadius: '0 6px 6px 0',
            padding: '8px 10px',
            fontSize: 12,
            color: '#333',
            lineHeight: 1.55,
            marginBottom: message.timeframe ? 8 : 0,
          }}>
            <span style={{ fontWeight: 800, color: '#3C3489', marginRight: 5 }}>→</span>
            {message.implication}
          </div>

          {/* Timeframe */}
          {message.timeframe && (
            <div style={{
              fontSize: 11,
              color: '#888',
              lineHeight: 1.5,
              fontStyle: 'italic',
              marginTop: 6,
            }}>
              ⏱ {message.timeframe}
            </div>
          )}

          {/* Confidence footer */}
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '0.5px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: confColor, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>
              {confPct}% confidence — {confLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
