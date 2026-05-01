import React, { useState } from 'react'
import { DOMAINS, PRACTICES, getCoherenceState, getCoherenceScore } from '../../data'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

function MiniBar({ value, max, color, height = 6 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ height, borderRadius: 99, background: '#EEEDE9', overflow: 'hidden' }}>
      <div style={{ height, borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.5s' }}/>
    </div>
  )
}

function TrendSpark({ data, color }) {
  if (!data || data.length < 2) return null
  const w = 80, h = 28, pad = 2
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - (v / max) * (h - pad * 2)
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={2.5} fill={color}/>
    </svg>
  )
}

export default function ProgressTab({ checked, onboardingProfile, earnedMilestones, domainScores }) {
  const [expandedDomain, setExpandedDomain] = useState(null)
  const today = new Date()
  
  // Defensive defaults - Android can pass undefined before state settles
  const safeChecked = checked || {}
  const safeMilestones = earnedMilestones || []
  const safeDomainScores = domainScores || {}

  // ── 30-day history ──
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (29 - i))
    const dk = d.toDateString()
    const dc = safeChecked[dk] || {}
    const done = DOMAINS.reduce((a, dom) => a + PRACTICES[dom.id].filter((_, j) => dc[`${dom.id}_${j}`]).length, 0)
    const total = Object.values(PRACTICES).flat().length
    const scores = {}
    DOMAINS.forEach(dom => {
      try {
        const dn = PRACTICES[dom.id].filter((_, j) => dc[`${dom.id}_${j}`]).length
        scores[dom.id] = Math.round((dn / PRACTICES[dom.id].length) * 100)
      } catch(e) { scores[dom.id] = 0 }
    })
    const coherence = getCoherenceScore(scores)
    return { date: dk, label: d.getDate(), done, total, pct: Math.round((done / total) * 100), coherence, scores, hasPractice: done > 0 }
  })

  const activeDays = last30.filter(d => d.hasPractice).length
  const avgCoherence = activeDays > 0
    ? Math.round(last30.filter(d => d.hasPractice).reduce((a, d) => a + d.coherence, 0) / activeDays)
    : onboardingProfile?.overallScore || 0

  const todayData = last30[last30.length - 1]
  const coherenceState = getCoherenceState(avgCoherence)

  // ── Per-domain 30-day data ──
  const domainProgress = DOMAINS.map(d => {
    const scores7 = [], scores30 = []
    for (let i = 0; i < 30; i++) {
      const day = last30[i]
      if (i >= 23) scores7.push(day.scores[d.id])
      scores30.push(day.scores[d.id])
    }
    const avg7 = Math.round(scores7.reduce((a, b) => a + b, 0) / 7)
    const avg30 = Math.round(scores30.reduce((a, b) => a + b, 0) / 30)
    const trend = avg7 > avg30 + 5 ? 'rising' : avg7 < avg30 - 5 ? 'falling' : 'stable'

    // Streak for each practice in this domain
    const practiceData = PRACTICES[d.id].map((p, i) => {
      let streak = 0
      const now = new Date()
      for (let j = 0; j < 90; j++) {
        const dt = new Date(now); dt.setDate(now.getDate() - j)
        if (safeChecked[dt.toDateString()]?.[`${d.id}_${i}`]) streak++
        else if (j > 0) break
      }
      const totalDone = Object.keys(safeChecked).filter(dk => safeChecked[dk]?.[`${d.id}_${i}`]).length
      return { ...p, streak, totalDone, key: `${d.id}_${i}` }
    })

    // Mastery thresholds
    const THRESHOLDS = {
      d1: [{ level: 'Accessed', score: 40 }, { level: 'Stable', score: 60 }, { level: 'Embodied', score: 80 }, { level: 'Anchored', score: 95 }],
      d2: [{ level: 'Rebuilding', score: 40 }, { level: 'Functional', score: 60 }, { level: 'Optimized', score: 80 }, { level: 'Thriving', score: 95 }],
      d3: [{ level: 'Noticing', score: 40 }, { level: 'Processing', score: 60 }, { level: 'Integrating', score: 80 }, { level: 'Clear', score: 95 }],
      d4: [{ level: 'Aware', score: 40 }, { level: 'Directing', score: 60 }, { level: 'Deliberate', score: 80 }, { level: 'Generative', score: 95 }],
      d5: [{ level: 'Seeing', score: 40 }, { level: 'Interrupting', score: 60 }, { level: 'Rewriting', score: 80 }, { level: 'Liberated', score: 95 }],
    }
    const thresholds = THRESHOLDS[d.id]
    const currentThreshold = [...thresholds].reverse().find(t => avg7 >= t.score)
    const nextThreshold = thresholds.find(t => avg7 < t.score)

    return { ...d, avg7, avg30, trend, practiceData, thresholds, currentThreshold, nextThreshold, scores30 }
  })

  // ── Overall streak ──
  let overallStreak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const dk = d.toDateString()
    const dc = safeChecked[dk] || {}
    const done = DOMAINS.reduce((a, dom) => a + PRACTICES[dom.id].filter((_, j) => dc[`${dom.id}_${j}`]).length, 0)
    if (done > 0) overallStreak++
    else if (i > 0) break
  }

  // ── Total practices ever completed ──
  const totalEver = Object.values(safeChecked).reduce((total, dc) => {
    return total + Object.values(dc || {}).filter(v => v === true).length
  }, 0)

  // ── Best day ──
  const bestDay = [...last30].sort((a, b) => b.pct - a.pct)[0]

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>Your progress</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Your coherence journey — all in one place.</div>
      </div>

      {/* ── Row 1: Key stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Current state', value: coherenceState.label, sub: `${avgCoherence}/100 avg`, color: coherenceState.color, bg: coherenceState.bg },
          { label: 'Day streak', value: `${overallStreak}`, sub: overallStreak >= 7 ? 'on a roll' : 'keep going', color: '#1D9E75', bg: '#E1F5EE' },
          { label: 'Active days', value: `${activeDays}`, sub: 'last 30 days', color: '#7F77DD', bg: '#EEEDFE' },
          { label: 'Total practices', value: `${totalEver}`, sub: 'all time', color: '#378ADD', bg: '#E6F1FB' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: `0.5px solid ${s.color}25` }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, opacity: 0.7 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: 30-day coherence + milestones ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* 30-day bar chart */}
        <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>30-day coherence</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Daily practice completion — each bar is one day</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
            {last30.map((d, i) => {
              const h = Math.max(d.hasPractice ? 4 : 1, (d.pct / 100) * 60)
              const isToday = i === 29
              return (
                <div key={i} title={`${d.date}: ${d.pct}%`}
                  style={{ flex: 1, height: h, borderRadius: 2, background: isToday ? '#7F77DD' : d.hasPractice ? `rgba(127,119,221,${0.25 + (d.pct / 100) * 0.75})` : '#EEEDE9', transition: 'height 0.3s', cursor: 'default' }}/>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 10, color: '#888' }}>30 days ago</div>
            <div style={{ fontSize: 10, color: '#888' }}>Today: {todayData.pct}%</div>
          </div>
          {bestDay.hasPractice && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#EEEDFE', borderRadius: 8, fontSize: 11, color: '#3C3489' }}>
              Best day: {bestDay.pct}% on {bestDay.date.split(' ').slice(0, 3).join(' ')}
            </div>
          )}
        </div>

        {/* Milestones */}
        <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Milestones</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Significant markers on your coherence journey</div>
          {safeMilestones.length === 0 ? (
            <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '20px 0' }}>
              Complete your first practice to earn your first milestone.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...safeMilestones].reverse().slice(0, 5).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F7F6F3', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              ))}
              {safeMilestones.length > 5 && (
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>+{safeMilestones.length - 5} more in History</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Domain progress ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Frequency body progress</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>7-day average resonance per body — tap any to see practice detail</div>
        {domainProgress.map(d => {
          const isExpanded = expandedDomain === d.id
          return (
            <div key={d.id} style={{ marginBottom: 12, borderBottom: bdr, paddingBottom: 12 }}>
              {/* Domain header */}
              <div onClick={() => setExpandedDomain(isExpanded ? null : d.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: isExpanded ? 12 : 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{d.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                      {d.currentThreshold && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: d.bg, color: d.text, fontWeight: 600 }}>{d.currentThreshold.level}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendSpark data={d.scores30.slice(-14)} color={d.color}/>
                      <span style={{ fontSize: 11, color: '#888' }}>{d.trend === 'rising' ? '↑' : d.trend === 'falling' ? '↓' : '→'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: d.avg7 >= 60 ? d.color : '#E24B4A' }}>{d.avg7}%</span>
                      <span style={{ fontSize: 11, color: '#888' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  <MiniBar value={d.avg7} max={100} color={d.color}/>
                  {d.nextThreshold && (
                    <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>
                      Next: {d.nextThreshold.level} at {d.nextThreshold.score}% · {Math.max(0, d.nextThreshold.score - d.avg7)} pts away
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded practice detail */}
              {isExpanded && (
                <div style={{ paddingLeft: 38 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 8 }}>Practice history</div>
                  {d.practiceData.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < d.practiceData.length - 1 ? bdr : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{p.totalDone} times total</div>
                      </div>
                      {p.streak > 0 && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: p.streak >= 21 ? '#7F77DD' : p.streak >= 7 ? '#D85A30' : '#1D9E75' }}>
                          {p.streak >= 21 ? '⚡' : p.streak >= 7 ? '🔥' : '✦'} {p.streak}d
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#888', minWidth: 60, textAlign: 'right' }}>
                        {p.totalDone === 0 ? 'not started' : p.totalDone === 1 ? '1 session' : `${p.totalDone} sessions`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Row 4: Baseline progression ── */}
      {(() => {
        const history = (() => { try { return JSON.parse(localStorage.getItem('q_onboarding_history') || '[]') } catch { return [] } })()
        const allSnapshots = [...history, onboardingProfile ? { ...onboardingProfile, isCurrent: true } : null].filter(Boolean).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
        if (allSnapshots.length < 1) return null
        return (
          <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Baseline signature over time</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Your coherence signature from each assessment — retake monthly to see your evolution</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {allSnapshots.map((snap, si) => {
                const state = getCoherenceState(snap.overallScore || 0)
                return (
                  <div key={si} style={{ minWidth: 160, background: '#F7F6F3', borderRadius: 10, padding: '12px 14px', border: snap.isCurrent ? `1.5px solid ${state.color}` : bdr, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: state.color, marginBottom: 4 }}>
                      {snap.isCurrent ? 'Current' : `Assessment ${si + 1}`}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: state.color, marginBottom: 2 }}>{snap.overallScore || 0}</div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{state.label}</div>
                    {DOMAINS.map(d => (
                      <div key={d.id} style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 9, color: d.color }}>{d.icon} {d.name}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: d.color }}>{snap.scores?.[d.id] || 0}/10</span>
                        </div>
                        <MiniBar value={snap.scores?.[d.id] || 0} max={10} color={d.color} height={3}/>
                      </div>
                    ))}
                    <div style={{ fontSize: 9, color: '#aaa', marginTop: 6 }}>
                      {new Date(snap.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {si > 0 && (() => {
                      const prev = allSnapshots[si - 1]
                      const delta = (snap.overallScore || 0) - (prev.overallScore || 0)
                      return delta !== 0 ? (
                        <div style={{ fontSize: 10, fontWeight: 600, color: delta > 0 ? '#1D9E75' : '#E24B4A', marginTop: 4 }}>
                          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} pts
                        </div>
                      ) : null
                    })()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
