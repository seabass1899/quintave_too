/**
 * WeeklyIntelligenceReport.jsx
 * src/features/insights/WeeklyIntelligenceReport.jsx
 *
 * Full 6-section weekly intelligence report.
 * Placed under the Insights tab.
 */

import React, { useState, useMemo } from 'react'
import { generateWeeklyReport } from './weeklyInsightsEngine'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

const DOMAIN_COLORS = {
  d1: '#7F77DD', d2: '#1D9E75', d3: '#BA7517', d4: '#378ADD', d5: '#E24B4A',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, color = '#888' }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color, marginBottom: 10 }}>
      {label}
    </div>
  )
}

function SoWhat({ text }) {
  return (
    <div style={{ fontSize: 12, color: '#3C3489', background: '#F3F1FF', borderRadius: 8, padding: '8px 11px', marginTop: 10, lineHeight: 1.55, fontStyle: 'italic' }}>
      ◈ {text}
    </div>
  )
}

function ConfidenceDot({ confidence }) {
  const color = confidence >= 0.85 ? '#1D9E75' : confidence >= 0.7 ? '#BA7517' : '#888'
  return (
    <div title={`${Math.round(confidence * 100)}% confidence`}
      style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 2 }} />
  )
}

// ─── Section 1: Weekly Summary ────────────────────────────────────────────────

function SummaryCard({ summary }) {
  const trendColor = summary.trend === 'rising' ? '#085041'
    : summary.trend === 'stable' ? '#378ADD' : '#BA7517'
  const trendBg = summary.trend === 'rising' ? '#E1F5EE'
    : summary.trend === 'stable' ? '#E6F1FB' : '#FAEEDA'
  const trendLabel = summary.trend === 'rising' ? '↑ Rising'
    : summary.trend === 'stable' ? '→ Stable' : '↓ Declining'

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a1a18, #2a2a26)', borderRadius: 16, padding: '20px 22px', marginBottom: 14, color: '#fff' }}>
      <SectionHeader label="Your week in coherence" color="#aaa" />
      <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.25, marginBottom: 12, letterSpacing: '-0.02em' }}>
        {summary.headline}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Aligned days', value: `${summary.locked}/7` },
          { label: 'Consistency', value: `${Math.round(summary.completionRate * 100)}%` },
          { label: 'Signal generated', value: `${summary.weeklySignal} practices` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, background: trendBg, color: trendColor, padding: '4px 10px', borderRadius: 99 }}>{trendLabel}</span>
        {summary.weekOverWeek !== null && (
          <span style={{ fontSize: 12, color: '#aaa' }}>
            {summary.weekOverWeek > 0 ? `+${summary.weekOverWeek}%` : `${summary.weekOverWeek}%`} vs last week
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
        {summary.soWhat}
      </div>
    </div>
  )
}

// ─── Section 2: Body Trends ───────────────────────────────────────────────────

function BodyTrendsCard({ bodyTrends }) {
  if (!bodyTrends?.hasSufficientData) return null

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <SectionHeader label="Body trends this week" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
        {bodyTrends.domains.map(d => {
          const trendIcon = d.trend === 'rising' ? '↑' : d.trend === 'falling' ? '↓' : '→'
          const trendColor = d.trend === 'rising' ? d.color : d.trend === 'falling' ? '#E24B4A' : '#888'
          return (
            <div key={d.id} style={{ background: '#F8F7F4', borderRadius: 10, padding: '10px 12px', borderTop: `3px solid ${d.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a18', marginBottom: 4 }}>{d.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 20, fontWeight: 950, color: d.color }}>{d.pct7}%</span>
                <span style={{ fontSize: 13, color: trendColor, fontWeight: 700 }}>{trendIcon}</span>
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>this week</div>
            </div>
          )
        })}
      </div>
      {bodyTrends.soWhat && <SoWhat text={bodyTrends.soWhat} />}
    </div>
  )
}

// ─── Section 3: Most Effective Practice ──────────────────────────────────────

function EffectivePracticeCard({ effectivePractice }) {
  if (!effectivePractice || effectivePractice.confidence < 0.65) return null

  return (
    <div style={{ background: '#fff', border: bdr, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <SectionHeader label="Highest leverage practice" />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1a1a18', marginBottom: 4 }}>
            {effectivePractice.practice.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: '#E1F5EE', color: '#085041', padding: '3px 9px', borderRadius: 99, fontWeight: 700 }}>
              {effectivePractice.rate}% completion rate
            </span>
            <span style={{ fontSize: 12, color: '#888' }}>
              {effectivePractice.rippleDomain} domain
            </span>
          </div>
        </div>
        <ConfidenceDot confidence={effectivePractice.confidence} />
      </div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
        {effectivePractice.impact}
      </div>
      {effectivePractice.avoided && (
        <div style={{ fontSize: 12, color: '#BA7517', background: '#FAEEDA', borderRadius: 8, padding: '7px 10px', marginBottom: 8 }}>
          ⚠ Most avoided: <strong>{effectivePractice.avoided.name}</strong> — {Math.round((1 - effectivePractice.avoided.rate) * 100)}% skip rate
        </div>
      )}
      <SoWhat text={effectivePractice.soWhat} />
    </div>
  )
}

// ─── Section 4: Pattern Detection ────────────────────────────────────────────

const PATTERN_TYPE_STYLES = {
  strength:    { bg: '#E1F5EE', color: '#085041', icon: '◈' },
  synergy:     { bg: '#EEEDFE', color: '#3C3489', icon: '⟳' },
  interference:{ bg: '#FAEEDA', color: '#633806', icon: '⚡' },
  behavioral:  { bg: '#F4F3F0', color: '#1a1a18', icon: '◎' },
  momentum:    { bg: '#E6F1FB', color: '#0C447C', icon: '↑' },
}

function PatternCard({ pattern }) {
  const style = PATTERN_TYPE_STYLES[pattern.type] || PATTERN_TYPE_STYLES.behavioral
  return (
    <div style={{ border: `1px solid ${style.color}25`, borderLeft: `3px solid ${style.color}`, borderRadius: '0 12px 12px 0', padding: '12px 14px', marginBottom: 10, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 12, background: style.bg, color: style.color, padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>
            {style.icon} Pattern detected
          </span>
        </div>
        <ConfidenceDot confidence={pattern.confidence} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a18', marginBottom: 5, lineHeight: 1.3 }}>
        {pattern.headline}
      </div>
      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 6 }}>
        {pattern.detail}
      </div>
      <SoWhat text={pattern.soWhat} />
    </div>
  )
}

function PatternsSection({ patterns }) {
  if (!patterns || patterns.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <SectionHeader label="Patterns detected this week" />
      {patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
    </div>
  )
}

// ─── Section 5: Risk Prediction ───────────────────────────────────────────────

const RISK_SEVERITY_STYLES = {
  high:     { bg: '#FCEBEB', color: '#C0392B', border: '#E24B4A' },
  moderate: { bg: '#FAEEDA', color: '#633806', border: '#BA7517' },
  low:      { bg: '#F4F3F0', color: '#555',    border: '#AAA' },
}

function RiskCard({ risk }) {
  const style = RISK_SEVERITY_STYLES[risk.severity] || RISK_SEVERITY_STYLES.low
  return (
    <div style={{ background: style.bg, border: `1px solid ${style.border}30`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: style.color }}>
          {risk.severity === 'high' ? '⚠ High risk' : risk.severity === 'moderate' ? '⚡ Watch this' : 'ℹ Note'}
        </div>
        <ConfidenceDot confidence={risk.confidence} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a18', marginBottom: 5 }}>
        {risk.headline}
      </div>
      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.55, marginBottom: 6 }}>
        {risk.detail}
      </div>
      <div style={{ fontSize: 12, color: style.color, fontWeight: 700, marginBottom: 4 }}>
        If unaddressed: {risk.consequence}
      </div>
      <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '7px 10px', color: '#1a1a18', fontWeight: 600 }}>
        Action: {risk.action}
      </div>
    </div>
  )
}

function RisksSection({ risks }) {
  if (!risks || risks.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <SectionHeader label="Emerging friction" color="#BA7517" />
      {risks.map(r => <RiskCard key={r.id} risk={r} />)}
    </div>
  )
}

// ─── Section 6: Next Week Recommendation ─────────────────────────────────────

function RecommendationCard({ recommendation }) {
  return (
    <div style={{ background: '#1a1a18', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
      <SectionHeader label="Recommended focus for next week" color="#aaa" />
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
        {recommendation.focus}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Priority</div>
        <div style={{ fontSize: 14, color: '#fff', fontWeight: 700, lineHeight: 1.45 }}>{recommendation.priority}</div>
      </div>
      <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.6, marginBottom: 10 }}>
        {recommendation.reason}
      </div>
      <div style={{ background: '#7F77DD', borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: '#EEEDFE', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Today's move</div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.45 }}>{recommendation.action}</div>
      </div>
    </div>
  )
}

// ─── Insufficient Data State ──────────────────────────────────────────────────

function InsufficientDataState() {
  return (
    <div style={{ background: '#F8F7F4', borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>◈</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a18', marginBottom: 8 }}>
        Intelligence report is building
      </div>
      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
        Complete 3+ days of alignment practices to unlock the weekly intelligence report. The system needs behavioral data to detect real patterns — not fabricated ones.
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < 2 ? '#7F77DD' : '#E0DFDC' }}/>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>2 of 7 days tracked</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeeklyIntelligenceReport({ checked, dayStatus, domainScores }) {
  const report = useMemo(() => {
    try {
      return generateWeeklyReport(checked || {}, dayStatus || {}, domainScores || {})
    } catch (e) {
      console.error('Weekly report error:', e)
      return null
    }
  }, [])

  if (!report) return null

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.025em', color: '#1a1a18', marginBottom: 4 }}>
          Weekly Intelligence
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Week of {new Date(report.weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {report.hasSufficientData ? 'Based on your behavioral data' : 'Building pattern data'}
        </div>
      </div>

      {!report.hasSufficientData ? (
        <InsufficientDataState />
      ) : (
        <>
          <SummaryCard summary={report.summary} />
          <BodyTrendsCard bodyTrends={report.bodyTrends} />
          <EffectivePracticeCard effectivePractice={report.effectivePractice} />
          <PatternsSection patterns={report.patterns} />
          <RisksSection risks={report.risks} />
          <RecommendationCard recommendation={report.recommendation} />
        </>
      )}

      <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center', paddingTop: 10 }}>
        Report generated {new Date(report.generatedAt).toLocaleString()} · Patterns only shown at 65%+ confidence
      </div>
    </div>
  )
}
