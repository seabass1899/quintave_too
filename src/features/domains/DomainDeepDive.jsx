import React, { useState } from 'react'
import { DOMAINS as ALL_DOMAINS, PRACTICES, DOMAIN_META } from '../../data'


function tk() { return new Date().toDateString() }

export default function DomainDeepDive({ domain, checked, metrics, ratings, notes, onClose, onCheck }) {
  const today = tk()
  const meta = DOMAIN_META[domain.id]
  const practices = PRACTICES[domain.id]
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  // 30-day resonance trend
  const trend30 = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    const dk = d.toDateString()
    const dc = checked[dk] || {}
    const done = practices.filter((_, j) => dc[`${domain.id}_${j}`]).length
    trend30.push({ date: dk, pct: Math.round((done / practices.length) * 100), day: d.getDate() })
  }

  // 7-day average
  const avg7 = Math.round(trend30.slice(-7).reduce((a, b) => a + b.pct, 0) / 7)

  // Current mastery level
  const currentThreshold = [...meta.mastery_thresholds].reverse().find(t => avg7 >= t.score) || null
  const nextThreshold = meta.mastery_thresholds.find(t => avg7 < t.score)

  // Per-practice streaks
  const getStreak = (pk) => {
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      if (checked[d.toDateString()]?.[pk]) s++
      else if (i > 0) break
    }
    return s
  }

  // Trend SVG
  const w = 380, h = 70, pad = 8
  const xStep = (w - pad * 2) / (trend30.length - 1)
  const pts = trend30.map((d, i) => ({ x: pad + i * xStep, y: h - pad - (d.pct / 100) * (h - pad * 2) }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length-1].x},${h-pad} L${pts[0].x},${h-pad} Z`

  const feedsDomains = meta.feeds.map(id => ALL_DOMAINS.find(d => d.id === id)).filter(Boolean)
  const fedByDomains = meta.fed_by.map(id => ALL_DOMAINS.find(d => d.id === id)).filter(Boolean)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 500, padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 680, background: '#F4F3F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: domain.color, padding: '24px 28px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Frequency body deep dive</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 32 }}>{domain.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>{domain.name}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginLeft: 'auto', marginRight: 40 }}>{avg7}%</div>
          </div>
          {currentThreshold && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>Mastery level: {currentThreshold.level}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Philosophy */}
          <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: domain.color, marginBottom: 8 }}>The philosophy</div>
            <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.75 }}>{meta.philosophy}</div>
          </div>

          {/* 30-day trend */}
          <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>30-day resonance trend</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: avg7 >= 60 ? domain.color : '#E24B4A' }}>{avg7}% avg</div>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Daily completion % for {domain.name} practices only</div>
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id={`grad_${domain.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={domain.color} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={domain.color} stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[0, 50, 100].map(pct => (
                <line key={pct} x1={pad} y1={h-pad-(pct/100)*(h-pad*2)} x2={w-pad} y2={h-pad-(pct/100)*(h-pad*2)} stroke="#EEEDE9" strokeWidth={0.5}/>
              ))}
              <path d={areaD} fill={`url(#grad_${domain.id})`}/>
              <path d={pathD} fill="none" stroke={domain.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3.5} fill={domain.color} stroke="#fff" strokeWidth={1.5}/>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <div style={{ fontSize: 10, color: '#888' }}>30 days ago</div>
              <div style={{ fontSize: 10, color: '#888' }}>Today</div>
            </div>
          </div>

          {/* Mastery thresholds */}
          <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mastery thresholds</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Specific markers for this frequency body</div>
            {meta.mastery_thresholds.map((t, i) => {
              const achieved = avg7 >= t.score
              return (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, opacity: achieved ? 1 : 0.45 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: achieved ? domain.color : '#EEEDE9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {achieved ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/> : <div style={{ fontSize: 9, color: '#888', fontWeight: 700 }}>{i+1}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: achieved ? domain.color : '#1a1a18', marginBottom: 2 }}>{t.level} <span style={{ fontSize: 11, fontWeight: 400, color: '#888' }}>({t.score}%+ sustained)</span></div>
                    <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.6 }}>{t.desc}</div>
                  </div>
                </div>
              )
            })}
            {nextThreshold && (
              <div style={{ background: domain.bg, borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
                <div style={{ fontSize: 11, color: domain.text }}>
                  <strong>Next threshold:</strong> {nextThreshold.level} — sustain {nextThreshold.score}%+ average for 7+ days
                </div>
              </div>
            )}
          </div>

          {/* Practices with streaks */}
          <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Practice roster</div>
            {practices.map((p, i) => {
              const pk = `${domain.id}_${i}`
              const isDone = checked[today]?.[pk]
              const streak = getStreak(pk)
              const lastMetric = Object.keys(metrics).filter(k => k.startsWith(`${pk}::`)).sort((a,b) => new Date(b.split('::')[1]) - new Date(a.split('::')[1]))[0]
              const lastMetricVal = lastMetric ? metrics[lastMetric] : null
              const lastMetricDate = lastMetric ? lastMetric.split('::')[1] : null
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < practices.length - 1 ? bdr : 'none' }}>
                  <div onClick={() => onCheck(pk)}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${isDone ? domain.color : 'rgba(0,0,0,0.2)'}`, background: isDone ? domain.color : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDone && <svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isDone ? '#888' : '#1a1a18', textDecoration: isDone ? 'line-through' : 'none' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>Target: {p.target}</span>
                      {lastMetricVal && <span style={{ color: domain.color }}>Last: {lastMetricVal} <span style={{ color: '#888', fontWeight: 400 }}>({lastMetricDate})</span></span>}
                    </div>
                  </div>
                  {streak > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: streak >= 21 ? '#7F77DD' : streak >= 7 ? '#D85A30' : '#1D9E75', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {streak >= 21 ? '⚡' : streak >= 7 ? '🔥' : '✦'} {streak}d
                    </div>
                  )}
                  {p.cross?.length > 0 && (
                    <div style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: domain.bg, color: domain.text, fontWeight: 600 }}>
                      ↗ {p.cross.length}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Connection map */}
          <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Frequency connections</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 8 }}>When resonant, lifts</div>
                {feedsDomains.length > 0 ? feedsDomains.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: d.bg, borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{d.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: d.text }}>{d.name}</span>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#888' }}>—</div>}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 8 }}>Supported by</div>
                {fedByDomains.length > 0 ? fedByDomains.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: d.bg, borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{d.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: d.text }}>{d.name}</span>
                  </div>
                )) : <div style={{ fontSize: 12, color: '#888' }}>Source has no dependencies — it is the reference frequency.</div>}
              </div>
            </div>
          </div>

          {/* Interference sources */}
          <div style={{ background: domain.bg, borderRadius: 12, border: `1px solid ${domain.color}20`, padding: '16px 18px', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: domain.color, marginBottom: 10 }}>Common interference sources</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {meta.interference.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: domain.color, flexShrink: 0 }}/>
                  <div style={{ fontSize: 12, color: domain.text }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
