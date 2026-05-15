/**
 * AdaptiveReasonCard.jsx
 * src/features/intelligence/AdaptiveReasonCard.jsx
 *
 * Surfaces WHY a practice was selected today based on:
 * - decision signals (primary blocker, strategy, behavior mode)
 * - pattern profile (avoidance history, momentum, pairs)
 * - practice item properties (priority, domain, score, high leverage)
 *
 * Appears inside each practice row (below the "Why" line).
 * Maximum 3 bullets. No paragraphs.
 */

import React, { useState } from 'react'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

// Domain labels for readable bullet copy
const DOMAIN_NAMES = { d1: 'Source', d2: 'Form', d3: 'Field', d4: 'Mind', d5: 'Code' }
const DOMAIN_COLORS = {
  d1: '#7F77DD', d2: '#1D9E75', d3: '#BA7517', d4: '#378ADD', d5: '#E24B4A',
}

// Strategy → human-readable signal
const STRATEGY_SIGNALS = {
  recovery_first:                 'Recovery mode active — stability before complexity.',
  elevate_red_zone_body:          'Red zone body detected — elevation is the priority.',
  reduce_overload:                'Overload detected — reducing cognitive load today.',
  stabilize_interference_pressure:'Interference pressure high — stabilization selected.',
  restore_source_attunement:      'Source access is weak — anchor practices prioritized.',
  stabilize_source_access:        'Source gate not yet open — movable body correction.',
  advance_with_balance:           'System is coherent — advancing with balanced depth.',
}

// Behavior mode → human-readable signal
const MODE_SIGNALS = {
  lower_friction:     'Lower-friction practices selected based on recent completion patterns.',
  increase_depth:     'Depth increased — momentum detected in this domain.',
  reinforce_momentum: 'Momentum active — reinforcing what is already working.',
  collapse_rebuild:   'Collapse state — basic stabilization before anything else.',
}

function buildReasonBullets(item, decision, patternProfile) {
  const bullets = []
  const domainId = item?.phaseDomainId || item?.domain?.id
  const domainName = DOMAIN_NAMES[domainId] || item?.domain?.name || 'Domain'

  // Bullet 1: Primary selection reason from decision
  const primaryId = decision?.primaryBlockerId
  const secondaryId = decision?.secondaryBlockerId

  if (domainId === primaryId) {
    const bodyName = DOMAIN_NAMES[primaryId] || domainName
    bullets.push({
      text: `${bodyName} is the primary correction target today — highest coherence drag detected.`,
      type: 'primary',
    })
  } else if (domainId === secondaryId) {
    bullets.push({
      text: `${domainName} is the secondary drift point — addressed after the primary correction.`,
      type: 'secondary',
    })
  } else if (domainId === 'd1') {
    bullets.push({
      text: 'Source anchor selected to establish the reference field before correcting movable bodies.',
      type: 'anchor',
    })
  } else if (item?.priority === 'Optional') {
    bullets.push({
      text: `Optional support selected to add signal without overloading the system.`,
      type: 'optional',
    })
  } else {
    bullets.push({
      text: `${domainName} selected to support system-wide coherence.`,
      type: 'support',
    })
  }

  // Bullet 2: Adaptive pattern signal (if profile has data)
  if (patternProfile?.hasEnoughData) {
    const avoidedKey = patternProfile?.avoidance?.find(a => a.domainId === domainId)
    const momentumKey = patternProfile?.momentum?.find(m => m.domainId === domainId && m.key !== item?.key)
    const isAvoided = patternProfile?.avoidance?.some(a => a.key === item?.key)
    const isMomentum = patternProfile?.momentum?.some(m => m.key === item?.key)
    const behaviorMode = decision?.behaviorMode

    if (isAvoided && behaviorMode === 'lower_friction') {
      bullets.push({
        text: `A higher-friction option in this domain was deprioritized — lower resistance path selected.`,
        type: 'adaptive',
      })
    } else if (isMomentum) {
      const rate = patternProfile.momentum.find(m => m.key === item.key)?.rate
      bullets.push({
        text: `${item.name} has a ${rate ? Math.round(rate * 100) + '%' : 'high'} completion rate in your history — reinforcing what works.`,
        type: 'momentum',
      })
    } else if (avoidedKey) {
      bullets.push({
        text: `${domainName} has shown resistance. This practice was selected as a lower-friction entry point.`,
        type: 'adaptive',
      })
    } else if (momentumKey) {
      bullets.push({
        text: `${domainName} has active momentum — building on existing progress.`,
        type: 'momentum',
      })
    } else if (MODE_SIGNALS[behaviorMode]) {
      bullets.push({
        text: MODE_SIGNALS[behaviorMode],
        type: 'mode',
      })
    }
  } else if (decision?.behaviorMode && MODE_SIGNALS[decision.behaviorMode]) {
    bullets.push({
      text: MODE_SIGNALS[decision.behaviorMode],
      type: 'mode',
    })
  }

  // Bullet 3: High leverage or strategy signal
  if (item?.highLeverage && item?.leverageLabel) {
    bullets.push({
      text: `High leverage — ${item.leverageLabel.toLowerCase()}.`,
      type: 'leverage',
    })
  } else if (decision?.strategy && STRATEGY_SIGNALS[decision.strategy] && bullets.length < 3) {
    bullets.push({
      text: STRATEGY_SIGNALS[decision.strategy],
      type: 'strategy',
    })
  }

  // Cap at 3 bullets, deduplicate type
  const seen = new Set()
  return bullets.filter(b => {
    if (seen.has(b.type)) return false
    seen.add(b.type)
    return true
  }).slice(0, 3)
}

function bulletColor(type, domainColor) {
  switch (type) {
    case 'primary':   return '#3C3489'
    case 'momentum':  return '#085041'
    case 'adaptive':  return '#7F77DD'
    case 'leverage':  return '#BA7517'
    case 'anchor':    return '#7F77DD'
    case 'strategy':  return '#555'
    default:          return '#666'
  }
}

export default function AdaptiveReasonCard({ item, decision, patternProfile, isMobile }) {
  const [expanded, setExpanded] = useState(false)

  if (!item || !decision) return null

  // Only show if we have meaningful adaptation signal or explicit high leverage
  const hasAdaptation = patternProfile?.hasEnoughData || item?.highLeverage || decision?.behaviorMode
  if (!hasAdaptation) return null

  const bullets = buildReasonBullets(item, decision, patternProfile)
  if (bullets.length === 0) return null

  const domainId = item?.phaseDomainId || item?.domain?.id
  const accentColor = DOMAIN_COLORS[domainId] || '#7F77DD'

  // Collapsed: just a subtle "◈ Adapted" tag on mobile to keep cards compact
  if (isMobile && !expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: '#F3F1FF',
          border: '0.5px solid #7F77DD30',
          borderRadius: 6,
          padding: '3px 8px',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 9, color: '#7F77DD', fontWeight: 900 }}>◈</span>
        <span style={{ fontSize: 10, color: '#7F77DD', fontWeight: 700 }}>Why selected ▼</span>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 6,
      background: '#F8F7FB',
      border: `0.5px solid ${accentColor}25`,
      borderLeft: `2px solid ${accentColor}`,
      borderRadius: isMobile ? 8 : 10,
      padding: isMobile ? '8px 10px' : '9px 12px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: bullets.length > 0 ? 6 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: accentColor, fontWeight: 900 }}>◈</span>
          <span style={{ fontSize: 10, color: accentColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Why this was selected
          </span>
        </div>
        {isMobile && (
          <span
            onClick={() => setExpanded(false)}
            style={{ fontSize: 10, color: '#aaa', cursor: 'pointer' }}
          >▲</span>
        )}
      </div>

      {/* Bullets */}
      {bullets.map((bullet, i) => (
        <div key={i} style={{
          fontSize: 11,
          color: bulletColor(bullet.type, accentColor),
          lineHeight: 1.5,
          marginBottom: i < bullets.length - 1 ? 4 : 0,
          display: 'flex',
          gap: 6,
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0, opacity: 0.7, marginTop: 1 }}>•</span>
          <span>{bullet.text}</span>
        </div>
      ))}

      {/* Predicted effect */}
      {item.scoreTotal > 0 && (
        <div style={{
          marginTop: 7,
          paddingTop: 6,
          borderTop: `0.5px solid ${accentColor}20`,
          fontSize: 10,
          color: '#888',
          fontWeight: 600,
        }}>
          Predicted signal: +{item.scoreTotal} coherence points
          {item.highLeverage ? ' · High leverage' : ''}
        </div>
      )}
    </div>
  )
}
