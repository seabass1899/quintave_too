/**
 * PredictiveIntelligencePanel.jsx
 * src/features/insights/PredictiveIntelligencePanel.jsx
 *
 * Renders the full Predictive Intelligence section under Insights tab.
 * Three cards: Trajectory Forecast | Behavioral Risks | Momentum State
 */

import React, { useState, useMemo } from 'react'
import {
  getTrajectoryForecast,
  getBehavioralRisks,
  getMomentumState,
  predictTomorrow,
} from '../intelligence/patternLearningModel'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

// ─── Trajectory Forecast Card ─────────────────────────────────────────────────

const STATUS_CONFIG = {
  stabilizing: { icon: '🟢', color: '#085041', bg: '#E1F5EE', label: 'Stabilizing' },
  stable:      { icon: '🟡', color: '#BA7517', bg: '#FAEEDA', label: 'Stable'      },
  recovering:  { icon: '🟡', color: '#378ADD', bg: '#E6F1FB', label: 'Recovering'  },
  drifting:    { icon: '🟠', color: '#BA7517', bg: '#FAEEDA', label: 'Drifting'    },
  at_risk:     { icon: '🔴', color: '#C0392B', bg: '#FCEBEB', label: 'At risk'     },
}

function TrajectoryForecastCard({ forecast }) {
  const [expanded, setExpanded] = useState(false)
  if (!forecast) return null

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ background: '#F8F7F4', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', marginBottom: 5 }}>
            Trajectory Forecast
          </div>
          {/* Quick status pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {forecast.forecasts.map(f => {
              const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.stable
              return (
                <span key={f.id} style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                  {cfg.icon} {f.name}
                </span>
              )
            })}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Confidence</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a18' }}>{forecast.overallConfidence}%</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 12, fontStyle: 'italic' }}>
            If current behavior continues over the next 7 days:
          </div>
          {forecast.forecasts.map(f => {
            const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.stable
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: bdr }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a18' }}>{f.name}</span>
                    <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{f.label}</span>
                    {f.daysToChange && (
                      <span style={{ fontSize: 11, color: '#888' }}>~{f.daysToChange} days</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 4 }}>{f.soWhat}</div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>{Math.round(f.confidence * 100)}% confidence</div>
                </div>
              </div>
            )
          })}
          {!forecast.hasSufficientData && (
            <div style={{ fontSize: 11, color: '#888', marginTop: 10, fontStyle: 'italic' }}>
              Forecast accuracy improves with 7+ days of consistent check-ins.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Behavioral Risk Cards ────────────────────────────────────────────────────

const RISK_STYLES = {
  high:        { bg: '#FCEBEB', color: '#C0392B', border: '#E24B4A', icon: '⚠' },
  moderate:    { bg: '#FAEEDA', color: '#633806', border: '#BA7517', icon: '⚡' },
  opportunity: { bg: '#E1F5EE', color: '#085041', border: '#1D9E75', icon: '◈' },
}

function BehavioralRisksCard({ risks }) {
  const [expanded, setExpanded] = useState(false)
  if (!risks || risks.length === 0) return null

  const topRisk = risks[0]
  const topStyle = RISK_STYLES[topRisk.severity] || RISK_STYLES.moderate

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ background: '#F8F7F4', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', marginBottom: 5 }}>
            Behavioral Patterns Detected
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', marginBottom: 3 }}>
            {topStyle.icon} {topRisk.headline}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {risks.length} pattern{risks.length > 1 ? 's' : ''} detected — tap to see all
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginTop: 2 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px' }}>
          {risks.map((risk, i) => {
            const style = RISK_STYLES[risk.severity] || RISK_STYLES.moderate
            return (
              <div key={risk.id} style={{ background: style.bg, border: `1px solid ${style.border}30`, borderRadius: 12, padding: '12px 14px', marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: style.color, marginBottom: 5 }}>
                  {style.icon} {risk.severity === 'opportunity' ? 'Opportunity' : risk.severity === 'high' ? 'High risk' : 'Pattern detected'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', marginBottom: 5 }}>
                  {risk.headline}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.55, marginBottom: 8 }}>
                  {risk.detail}
                </div>
                <div style={{ fontSize: 12, color: style.color, fontWeight: 700, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '7px 10px' }}>
                  ◈ {risk.soWhat}
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>
                  {Math.round(risk.confidence * 100)}% confidence · Rule: {risk.rule}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Momentum State Card ──────────────────────────────────────────────────────

const MOMENTUM_ICONS = {
  accelerating: '↑↑',
  stable:       '→',
  fragile:      '~',
  declining:    '↓',
  recovering:   '↑',
}

function MomentumStateCard({ momentum }) {
  const [expanded, setExpanded] = useState(false)
  if (!momentum) return null

  const icon = MOMENTUM_ICONS[momentum.state] || '→'

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ background: '#F8F7F4', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#888', marginBottom: 5 }}>
            Signal Momentum
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: momentum.color }}>{icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: momentum.color }}>{momentum.label}</div>
              {momentum.daysToStabilization && (
                <div style={{ fontSize: 12, color: '#888' }}>
                  ~{momentum.daysToStabilization} days to stable momentum
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Streak</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a18' }}>{momentum.currentStreak}d</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
            {momentum.detail}
          </div>

          {/* Velocity indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Velocity', value: momentum.velocityTrend > 0.1 ? 'Rising' : momentum.velocityTrend < -0.1 ? 'Falling' : 'Neutral', color: momentum.velocityTrend > 0.1 ? '#085041' : momentum.velocityTrend < -0.1 ? '#E24B4A' : '#888' },
              { label: 'Bodies rising', value: momentum.risingBodies, color: momentum.risingBodies >= 2 ? '#085041' : '#888' },
              { label: 'Bodies falling', value: momentum.fallingBodies, color: momentum.fallingBodies >= 2 ? '#E24B4A' : '#888' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#F8F7F4', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* soWhat */}
          <div style={{ background: '#F3F1FF', borderRadius: 10, padding: '10px 13px', borderLeft: '3px solid #7F77DD' }}>
            <div style={{ fontSize: 12, color: '#3C3489', lineHeight: 1.55, fontStyle: 'italic' }}>
              ◈ {momentum.soWhat}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tomorrow Prediction Card (explicit, full version) ────────────────────────

function TomorrowPredictionFullCard({ pred }) {
  const [expanded, setExpanded] = useState(false)
  if (!pred) return null

  const dirColor = pred.predictedDirection === 'stable_or_rising' ? '#085041'
    : pred.predictedDirection === 'stable' ? '#378ADD' : '#BA7517'
  const dirBg = pred.predictedDirection === 'stable_or_rising' ? '#E1F5EE'
    : pred.predictedDirection === 'stable' ? '#E6F1FB' : '#FAEEDA'
  const arrow = pred.predictedDirection === 'stable_or_rising' ? '↑' : pred.predictedDirection === 'stable' ? '→' : '↓'

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ background: '#1a1a18', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#aaa', marginBottom: 5 }}>
            Tomorrow's Forecast
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 800, background: dirBg, color: dirColor, padding: '3px 10px', borderRadius: 99 }}>
              {arrow} {pred.predictedDirection === 'stable_or_rising' ? 'Rising' : pred.predictedDirection === 'stable' ? 'Stable' : 'At risk'}
            </span>
            {pred.likelyDrift && (
              <span style={{ fontSize: 12, color: '#ccc' }}>
                Likely drift: <strong style={{ color: '#fff' }}>{pred.likelyDrift.name}</strong>
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0, marginTop: 2 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
            {pred.directionLabel}
          </div>

          {/* Highest leverage move */}
          <div style={{ background: '#7F77DD', borderRadius: 10, padding: '11px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#EEEDFE', marginBottom: 4 }}>
              Highest leverage move tomorrow
            </div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.45 }}>
              {pred.highestLeverageMove}
            </div>
          </div>

          {/* Risks + Opportunities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {pred.risks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#BA7517', marginBottom: 6 }}>Risk factors</div>
                {pred.risks.map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#633806', background: '#FAEEDA', borderRadius: 8, padding: '7px 9px', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ opacity: 0.85 }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            )}
            {pred.opportunities.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#085041', marginBottom: 6 }}>Opportunities</div>
                {pred.opportunities.map((o, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#085041', background: '#E1F5EE', borderRadius: 8, padding: '7px 9px', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{o.label}</div>
                    <div style={{ opacity: 0.85 }}>{o.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Insufficient Data ────────────────────────────────────────────────────────

function InsufficientData() {
  return (
    <div style={{ background: '#F8F7F4', borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>◈</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a18', marginBottom: 6 }}>Predictive engine is calibrating</div>
      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
        Complete 5+ days of alignment practices to unlock behavioral predictions. The engine needs sequential day data to detect real patterns.
      </div>
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function PredictiveIntelligencePanel({ checked, dayStatus, domainScores }) {
  const date = useMemo(() => new Date(), [])

  const trajectoryForecast = useMemo(() => {
    try { return getTrajectoryForecast(checked || {}, dayStatus || {}, domainScores || {}, date) }
    catch { return null }
  }, [])

  const behavioralRisks = useMemo(() => {
    try { return getBehavioralRisks(checked || {}, dayStatus || {}, date) }
    catch { return [] }
  }, [])

  const momentumState = useMemo(() => {
    try { return getMomentumState(checked || {}, dayStatus || {}, date) }
    catch { return null }
  }, [])

  const tomorrowPred = useMemo(() => {
    try {
      return predictTomorrow(checked || {}, dayStatus || {}, domainScores || {}, date)
    }
    catch { return null }
  }, [])

  const hasSufficientData = trajectoryForecast?.hasSufficientData || momentumState?.hasSufficientData

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.025em', color: '#1a1a18', marginBottom: 4 }}>
          Predictive Intelligence
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Behavioral forecasting based on your pattern history
        </div>
      </div>

      {!hasSufficientData ? (
        <InsufficientData />
      ) : (
        <>
          <MomentumStateCard momentum={momentumState} />
          <TrajectoryForecastCard forecast={trajectoryForecast} />
          <BehavioralRisksCard risks={behavioralRisks} />
          <TomorrowPredictionFullCard pred={tomorrowPred} />
        </>
      )}

      <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center', paddingTop: 10 }}>
        Predictions only shown at 65%+ confidence · Not deterministic forecasts
      </div>
    </div>
  )
}
