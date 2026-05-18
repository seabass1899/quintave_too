/**
 * AnalyticsIntelligenceLayer.jsx
 * src/features/insights/AnalyticsIntelligenceLayer.jsx
 *
 * Sprint 9 — Analytics Intelligence Layer UI
 * Answers four questions from behavioral data with narrative intelligence.
 */

import React, { useState, useMemo } from 'react'
import { getAnalyticsIntelligence } from './analyticsIntelligenceEngine'

// ─── Shared primitives ────────────────────────────────────────────────────────

const DOMAIN_COLORS = {
  d1: '#7F77DD', d2: '#1D9E75', d3: '#BA7517', d4: '#378ADD', d5: '#E24B4A',
}

function SectionCard({ title, subtitle, children, defaultOpen = false, accentColor = '#7F77DD' }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          cursor: 'pointer',
          borderBottom: open ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
          userSelect: 'none',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 3, height: 16, background: accentColor, borderRadius: 2 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18' }}>{title}</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: '#888', marginTop: 3, marginLeft: 10 }}>{subtitle}</div>
          )}
        </div>
        <span style={{ fontSize: 13, color: '#aaa', fontWeight: 700 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: '14px 16px 16px' }}>{children}</div>}
    </div>
  )
}

function ConfidenceDot({ confidence }) {
  const pct  = Math.round(confidence * 100)
  const color = pct >= 80 ? '#1D9E75' : pct >= 70 ? '#BA7517' : '#aaa'
  return (
    <span style={{ fontSize: 10, color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {pct}% confidence
    </span>
  )
}

function SoWhat({ text, color = '#3C3489' }) {
  return (
    <div style={{
      background: `${color}10`,
      border: `0.5px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '9px 12px',
      marginTop: 10,
      fontSize: 12,
      color: '#333',
      lineHeight: 1.55,
    }}>
      <span style={{ fontWeight: 800, color, marginRight: 5 }}>→</span>
      {text}
    </div>
  )
}

function ActionPill({ text }) {
  return (
    <div style={{
      marginTop: 8,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: '#F8F7F4',
      border: '0.5px solid rgba(0,0,0,0.1)',
      borderRadius: 99,
      padding: '5px 12px',
      fontSize: 11,
      color: '#444',
      fontWeight: 600,
    }}>
      ◎ {text}
    </div>
  )
}

function InsufficientData({ daysNeeded = 7 }) {
  return (
    <div style={{
      padding: '20px 0',
      textAlign: 'center',
      color: '#aaa',
    }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>◈</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 6 }}>
        Calibrating
      </div>
      <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
        {daysNeeded}+ aligned days unlock this analysis. The engine needs enough signal to detect real patterns.
      </div>
    </div>
  )
}

// ─── 1. Intervention ROI ──────────────────────────────────────────────────────

function InterventionROISection({ data }) {
  if (!data?.ready) return <InsufficientData />

  const { items, topPractice, soWhat } = data

  return (
    <div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
        Ranked by impact on same-day and next-day completion.
      </div>

      {items.map((item, i) => (
        <div key={item.key} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: i < items.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
        }}>
          {/* Rank */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: i === 0 ? '#1a1a18' : '#F4F3F0',
            color: i === 0 ? '#fff' : '#555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 900,
            flexShrink: 0,
          }}>{i + 1}</div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a18' }}>{item.name}</span>
              <span style={{
                background: `${DOMAIN_COLORS[item.domainId] || '#888'}15`,
                color: DOMAIN_COLORS[item.domainId] || '#888',
                border: `0.5px solid ${DOMAIN_COLORS[item.domainId] || '#888'}30`,
                borderRadius: 99,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
              }}>{item.domainName}</span>
              {item.hasMomentum && (
                <span style={{ fontSize: 10, color: '#085041', fontWeight: 700 }}>↑ Momentum</span>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
              {item.sameDayLift > 0 && (
                <span style={{ fontSize: 11, color: '#085041', fontWeight: 700 }}>
                  +{item.sameDayLift}% same-day lift
                </span>
              )}
              {item.nextDayLift > 0 && (
                <span style={{ fontSize: 11, color: '#378ADD', fontWeight: 700 }}>
                  +{item.nextDayLift}% next-day carry
                </span>
              )}
              <ConfidenceDot confidence={item.confidence} />
            </div>

            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>{item.soWhat}</div>
          </div>
        </div>
      ))}

      <SoWhat text={soWhat} color="#3C3489" />
    </div>
  )
}

// ─── 2. Failure Analysis ──────────────────────────────────────────────────────

const SEVERITY_COLORS = { high: '#E24B4A', moderate: '#BA7517', low: '#888' }
const SEVERITY_LABELS = { high: 'High impact', moderate: 'Moderate', low: 'Low' }

function FailureAnalysisSection({ data }) {
  if (!data?.ready) return <InsufficientData />

  const { findings } = data

  return (
    <div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
        Patterns that predict incomplete days or signal collapse.
      </div>

      {findings.map((finding, i) => (
        <div key={finding.id} style={{
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: i < findings.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              background: `${SEVERITY_COLORS[finding.severity]}15`,
              color: SEVERITY_COLORS[finding.severity],
              border: `0.5px solid ${SEVERITY_COLORS[finding.severity]}40`,
              borderRadius: 99,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 800,
            }}>{SEVERITY_LABELS[finding.severity]}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a18' }}>{finding.title}</span>
          </div>

          {/* Stats */}
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4, lineHeight: 1.5 }}>
            {finding.stat}
          </div>
          {finding.comparison && (
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{finding.comparison}</div>
          )}

          <ConfidenceDot confidence={finding.confidence} />

          <SoWhat text={finding.soWhat} color={SEVERITY_COLORS[finding.severity]} />
          <ActionPill text={finding.action} />
        </div>
      ))}
    </div>
  )
}

// ─── 3. Success Chain Analysis ────────────────────────────────────────────────

const STRENGTH_COLORS = { strong: '#085041', moderate: '#378ADD', emerging: '#7F77DD' }

function SuccessChainSection({ data }) {
  if (!data?.ready) return <InsufficientData />

  const { chains } = data

  return (
    <div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
        Sequences that predict high-completion days and streak continuation.
      </div>

      {chains.map((chain, i) => (
        <div key={chain.id} style={{
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: i < chains.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
        }}>
          {/* Chain sequence visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {chain.sequence.map((step, j) => (
              <React.Fragment key={j}>
                <span style={{
                  background: j === 0 ? '#1a1a18' : `${STRENGTH_COLORS[chain.strength]}15`,
                  color: j === 0 ? '#fff' : STRENGTH_COLORS[chain.strength],
                  border: `0.5px solid ${j === 0 ? '#1a1a18' : STRENGTH_COLORS[chain.strength]}40`,
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>{step}</span>
                {j < chain.sequence.length - 1 && (
                  <span style={{ color: '#aaa', fontSize: 14, fontWeight: 700 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 22,
              fontWeight: 900,
              color: STRENGTH_COLORS[chain.strength],
              lineHeight: 1,
            }}>{chain.rate}%</span>
            <div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{chain.title}</div>
              <div style={{ marginTop: 3 }}>
                <ConfidenceDot confidence={chain.confidence} />
              </div>
            </div>
          </div>

          <SoWhat text={chain.soWhat} color={STRENGTH_COLORS[chain.strength]} />
          <ActionPill text={chain.action} />
        </div>
      ))}
    </div>
  )
}

// ─── 4. Causal Prediction ─────────────────────────────────────────────────────

function CausalPredictionSection({ data }) {
  if (!data?.ready) return <InsufficientData daysNeeded={10} />

  const { headline, body, recommendation, color, confidence, evidenceCount, evidence, confidenceLabel, riskLevel } = data

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: `${color}10`,
        border: `0.5px solid ${color}30`,
        borderRadius: 12,
        padding: '16px 16px 14px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {riskLevel === 'positive' ? '↑ Positive trajectory'
              : riskLevel === 'at_risk' ? '⚠ At risk'
              : '→ Stable trajectory'}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a18', marginBottom: 8, lineHeight: 1.4 }}>
          {headline}
        </div>
        <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>{body}</div>
      </div>

      {/* Recommendation */}
      <div style={{
        background: '#F8F7FB',
        border: '0.5px solid #7F77DD30',
        borderLeft: '3px solid #7F77DD',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 14,
        fontSize: 12,
        color: '#333',
        lineHeight: 1.55,
      }}>
        <span style={{ fontWeight: 800, color: '#3C3489', marginRight: 6 }}>Recommended:</span>
        {recommendation}
      </div>

      {/* Evidence */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Evidence ({evidenceCount} signals)
        </div>
        {evidence.map((e, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: 7,
            alignItems: 'flex-start',
            marginBottom: 5,
            fontSize: 11,
            color: '#555',
            lineHeight: 1.4,
          }}>
            <span style={{ color: '#aaa', flexShrink: 0 }}>◦</span>
            {e}
          </div>
        ))}
      </div>

      <ConfidenceDot confidence={confidence} />
      <span style={{ fontSize: 10, color: '#aaa', marginLeft: 8 }}>— {confidenceLabel}</span>
    </div>
  )
}

// ─── Master component ─────────────────────────────────────────────────────────

export default function AnalyticsIntelligenceLayer({ checked = {}, dayStatus = {}, domainScores = {} }) {
  const intelligence = useMemo(() => {
    try { return getAnalyticsIntelligence(checked, dayStatus, domainScores) }
    catch { return null }
  }, [Object.keys(checked).length, Object.keys(dayStatus).length])

  if (!intelligence) return null

  const { interventionROI, failureAnalysis, successChains, causalPrediction } = intelligence
  const anyReady = interventionROI?.ready || failureAnalysis?.ready
    || successChains?.ready || causalPrediction?.ready

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16, color: '#3C3489' }}>◈</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#1a1a18' }}>Analytics Intelligence</span>
        </div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
          Four questions answered from your behavioral data. All patterns shown at 65%+ confidence only.
        </div>
      </div>

      {!anyReady && (
        <div style={{
          background: '#F8F7F4',
          border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: 14,
          padding: '24px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#333', marginBottom: 8 }}>
            Building your intelligence profile
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
            Complete 7+ aligned days to unlock Analytics Intelligence. The engine needs enough behavioral data to detect real patterns — not noise.
          </div>
        </div>
      )}

      {anyReady && (
        <>
          <SectionCard
            title="What helps me most?"
            subtitle="Intervention ROI — practices ranked by impact"
            accentColor="#3C3489"
            defaultOpen={true}
          >
            <InterventionROISection data={interventionROI} />
          </SectionCard>

          <SectionCard
            title="What hurts me most?"
            subtitle="Failure analysis — patterns that predict incomplete days"
            accentColor="#E24B4A"
          >
            <FailureAnalysisSection data={failureAnalysis} />
          </SectionCard>

          <SectionCard
            title="What creates momentum?"
            subtitle="Success chains — sequences that compound alignment"
            accentColor="#085041"
          >
            <SuccessChainSection data={successChains} />
          </SectionCard>

          <SectionCard
            title="What is likely to happen next?"
            subtitle="Causal prediction — evidence-based trajectory forecast"
            accentColor="#BA7517"
          >
            <CausalPredictionSection data={causalPrediction} />
          </SectionCard>
        </>
      )}
    </div>
  )
}
