import React, { useState } from 'react'
import { DOMAINS, PRACTICES, COHERENCE_STATES, getCoherenceState } from '../../data'

const DAYS = ['S','M','T','W','T','F','S']

function RadarChart({ scores }) {
  const size = 300
  const cx = size / 2, cy = size / 2, r = 95
  const n = DOMAINS.length
  const labelR = r + 38
  const angle = (i) => (i * 2 * Math.PI / n) - Math.PI / 2
  const gridPts = (frac) => DOMAINS.map((_, i) => {
    const a = angle(i)
    return `${(cx + r * frac * Math.cos(a)).toFixed(1)},${(cy + r * frac * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  const dataPts = DOMAINS.map((d, i) => {
    const a = angle(i)
    const pct = Math.max((scores[d.id] || 0) / 100, 0.03)
    return { x: cx + r * pct * Math.cos(a), y: cy + r * pct * Math.sin(a) }
  })
  const spokePts = DOMAINS.map((_, i) => {
    const a = angle(i)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const labelPts = DOMAINS.map((d, i) => {
    const a = angle(i)
    return { x: cx + labelR * Math.cos(a), y: cy + labelR * Math.sin(a),
      anchor: Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end',
      name: d.name, color: d.color, score: scores[d.id] || 0 }
  })
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1].map(f => (
        <polygon key={f} points={gridPts(f)} fill="none" stroke={f===1?"#D5D3CE":"#ECEAE5"} strokeWidth={f===1?1:0.6}/>
      ))}
      {spokePts.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E0DEDB" strokeWidth={0.8}/>)}
      <polygon points={dataPts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="rgba(127,119,221,0.13)" stroke="#7F77DD" strokeWidth={2} strokeLinejoin="round"/>
      {dataPts.map((p,i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4.5} fill={DOMAINS[i].color} stroke="#fff" strokeWidth={1.5}/>)}
      {labelPts.map((p,i) => (
        <text key={i} textAnchor={p.anchor} fontSize={10} fontFamily="-apple-system,sans-serif">
          <tspan x={p.x} y={p.y} fontWeight={600} fill="#2C2C2A">{p.name.split(' ')[0]}</tspan>
          {p.name.split(' ').length > 1 && <tspan x={p.x} dy={13} fontWeight={600} fill="#2C2C2A">{p.name.split(' ').slice(1).join(' ')}</tspan>}
          <tspan x={p.x} dy={13} fill={p.color} fontWeight={700} fontSize={11}>{p.score}%</tspan>
        </text>
      ))}
      {[25,50,75].map(pct => <text key={pct} x={cx+3} y={cy - r*(pct/100) + 3} fontSize={7} fill="#C0BEBA">{pct}</text>)}
    </svg>
  )
}

export default function AnalyticsTab({ checked, onboardingProfile, domainScores, dailyPct, streakCount, triggerRate, setShowSignature, setOnboardingProfile, exportNotes, exportCSV, exportBackup }) {
  const safeChecked = checked || {}
  const today = new Date().toDateString()
  const activeDays = Object.keys(safeChecked).reduce((acc, dateStr) => {
    const dayChecks = safeChecked[dateStr] || {}
    acc[dateStr] = Object.values(dayChecks).some(Boolean)
    return acc
  }, {})
  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const card = { background:'#fff', borderRadius:14, border:bdr, padding:'16px 18px', marginBottom:14 }


          // ── Compute coherence score (Source weighted 1.5x) ──
          const today2 = new Date()
          const getDayScore = (domId, dateStr) => {
            const dc = safeChecked[dateStr] || {}
            const direct = PRACTICES[domId].filter((_,j) => dc[`${domId}_${j}`]).length
            return Math.round((direct / PRACTICES[domId].length) * 100)
          }
          const getDayCoherence = (dateStr) => {
            const scores = { d1: getDayScore('d1', dateStr), d2: getDayScore('d2', dateStr), d3: getDayScore('d3', dateStr), d4: getDayScore('d4', dateStr), d5: getDayScore('d5', dateStr) }
            const s1 = scores.d1 * 1.5
            const s2 = scores.d2
            const s3 = scores.d3
            const s4 = scores.d4
            const s5 = scores.d5
            return Math.round((s1 + s2 + s3 + s4 + s5) / 6.5)
          }

          const todayCoherence = getDayCoherence(today)

          // 7-day coherence average
          let weekTotal = 0
          for(let i=6;i>=0;i--){ const d=new Date(today2);d.setDate(today2.getDate()-i); weekTotal+=getDayCoherence(d.toDateString()) }
          const weekAvgCoherence = Math.round(weekTotal/7)

          // 30-day coherence history — seed with onboarding baseline for days with no data
          const baselineScore = onboardingProfile?.overallScore || null
          const onboardingDate = onboardingProfile?.completedAt ? new Date(onboardingProfile.completedAt) : null
          const coherenceHistory = []
          for(let i=29;i>=0;i--){
            const d=new Date(today2); d.setDate(today2.getDate()-i)
            const dk=d.toDateString()
            const practiceScore = getDayCoherence(dk)
            const dc = safeChecked[dk] || {}
            const hasPractices = Object.values(dc).some(v=>v===true)
            // Use practice score if practices logged, else baseline if onboarding done before this date
            // Apply noise audit interference drag if logged that day
            const noiseAudits = (() => { try { return JSON.parse(localStorage.getItem('q_noise_audits') || '{}') } catch { return {} } })()
            const dayNoise = noiseAudits[dk]
            const interferenceScore = dayNoise ? (() => {
              const cats = [{id:'social',impact:3},{id:'news',impact:3},{id:'drama',impact:4},{id:'video',impact:2},{id:'noise',impact:2},{id:'toxic',impact:4},{id:'validation',impact:3},{id:'multitask',impact:2}]
              const total = cats.reduce((s,c) => s + ((dayNoise[c.id]||0) * c.impact), 0)
              const max = cats.reduce((s,c) => s + c.impact * 3, 0)
              return Math.round((total/max)*100)
            })() : 0
            const noiseDrag = Math.round(interferenceScore * 0.15) // High interference reduces score by up to 15%
            const baseScore = hasPractices ? practiceScore
              : (baselineScore && onboardingDate && d >= onboardingDate) ? Math.round(baselineScore * 0.6)
              : 0
            const score = Math.max(0, baseScore - noiseDrag)
            coherenceHistory.push({ date:dk, score, label:d.getDate() })
          }

          // Coherence state
          const CSTATES = [
            { label:'Scattered',  min:0,  max:20, color:'#E24B4A', bg:'#FCEBEB', desc:'Frequency bodies are largely disconnected from Source. Operating primarily from subconscious programming and reactivity.' },
            { label:'Stirring',   min:21, max:40, color:'#BA7517', bg:'#FAEEDA', desc:'First contact with the framework. The interference patterns are becoming visible. Source is glimpsed occasionally.' },
            { label:'Grounding', min:41, max:60, color:'#378ADD', bg:'#E6F1FB', desc:'Practices are becoming consistent. Each frequency body is finding its rhythm. Source access is more reliable.' },
            { label:'Aligning', min:61, max:80, color:'#7F77DD', bg:'#EEEDFE', desc:'Frequent alignment across all five bodies. Source is the operating reference point most of the time.' },
            { label:'Whole',    min:81, max:100, color:'#1D9E75', bg:'#E1F5EE', desc:'All five frequency bodies in sustained resonance with Source. Abundance, health, and freedom emerge naturally.' },
          ]
          const cState = CSTATES.find(s => todayCoherence >= s.min && todayCoherence <= s.max) || CSTATES[0]
          const nextState = CSTATES[CSTATES.indexOf(cState)+1]
          const progressToNext = nextState ? Math.round(((todayCoherence - cState.min) / (nextState.min - cState.min)) * 100) : 100

          // Per-domain 7-day resonance + trend
          const domainResonance = DOMAINS.map(d => {
            let week=[], prev=[]
            for(let i=6;i>=0;i--){ const dt=new Date(today2);dt.setDate(today2.getDate()-i); week.push(getDayScore(d.id,dt.toDateString())) }
            for(let i=13;i>=7;i--){ const dt=new Date(today2);dt.setDate(today2.getDate()-i); prev.push(getDayScore(d.id,dt.toDateString())) }
            const avg7 = Math.round(week.reduce((a,b)=>a+b,0)/7)
            const avg14 = Math.round(prev.reduce((a,b)=>a+b,0)/7)
            const trend = avg7 > avg14+3 ? 'rising' : avg7 < avg14-3 ? 'falling' : 'stable'
            const resonanceLabel = avg7 <= 20 ? 'Deep distortion' : avg7 <= 40 ? 'Interference active' : avg7 <= 60 ? 'Partial resonance' : avg7 <= 80 ? 'Strong resonance' : 'Full coherence'
            return { ...d, avg7, avg14, trend, resonanceLabel }
          })

          // Primary interference = lowest 7-day resonance body
          const primaryInterference = [...domainResonance].sort((a,b) => a.avg7 - b.avg7)[0]

          // Mastery thresholds per domain
          const THRESHOLDS = {
            d1: [
              { level: 'Accessed', score: 40, desc: 'You can reach observer awareness intentionally, in calm conditions, for brief periods.' },
              { level: 'Stable',   score: 60, desc: 'Observer awareness is accessible within 2 minutes of intention in most conditions.' },
              { level: 'Embodied', score: 80, desc: 'Source is your default operating state. You notice when you have left it — and return quickly.' },
              { level: 'Anchored', score: 95, desc: 'You live from Source consistently, including under pressure, conflict, and uncertainty.' },
            ],
            d2: [
              { level: 'Rebuilding', score: 40, desc: 'Sleep, movement, and nutrition are becoming more consistent. Energy is stabilizing.' },
              { level: 'Functional', score: 60, desc: '7h+ sleep most nights, daily movement, adequate protein. The vessel is maintained.' },
              { level: 'Optimized',  score: 80, desc: 'The body is performing — consistent energy, recovery, and physical resilience across the week.' },
              { level: 'Thriving',   score: 95, desc: 'The physical instrument is a source of vitality, not friction. Form supports every other dimension.' },
            ],
            d3: [
              { level: 'Noticing',    score: 40, desc: 'You are beginning to name emotions rather than being entirely consumed by them.' },
              { level: 'Processing',  score: 60, desc: 'Most emotional activations are named, located, and released within the same day.' },
              { level: 'Aligning', score: 80, desc: 'Emotion moves through you cleanly. Charge rarely accumulates overnight.' },
              { level: 'Clear',       score: 95, desc: 'The Field is largely free of stored charge. You are a clear emotional conductor.' },
            ],
            d4: [
              { level: 'Aware',       score: 40, desc: 'You are beginning to notice your thought patterns rather than being fully identified with them.' },
              { level: 'Directing',   score: 60, desc: 'Morning Directive is consistent. Thought audits reveal your dominant mental patterns.' },
              { level: 'Deliberate',  score: 80, desc: 'Your conscious mind operates with sustained intention. Reactive thinking is the exception.' },
              { level: 'Generative',  score: 95, desc: 'Your mind creates rather than reacts. Beliefs are examined and chosen. Focus is a resource you command.' },
            ],
            d5: [
              { level: 'Seeing',       score: 40, desc: 'You can identify at least 3 automatic programs running your behavior.' },
              { level: 'Interrupting', score: 60, desc: 'You regularly catch patterns before they fully execute and choose differently.' },
              { level: 'Rewriting',    score: 80, desc: 'Several previously automatic patterns have been replaced by chosen responses, held for 30+ days.' },
              { level: 'Liberated',    score: 95, desc: 'Your behavior is primarily conscious and chosen. Old programs no longer run without your awareness.' },
            ],
          }

          const INTERFERENCE_RX = {
            d1: 'Begin with Stillness Exposure today. Even 5 minutes of resting as the awareness beneath thought recalibrates every other frequency body.',
            d2: 'Prioritize sleep and movement before anything else. A depleted vessel cannot sustain coherence regardless of mental or spiritual effort.',
            d3: 'Do the Name + Locate Emotion practice now. Identify one feeling you are carrying, locate it in your body, and breathe into it for 90 seconds without fixing it.',
            d4: "Set your Morning Directive before engaging with any external input today. One deliberate intention shifts the entire day's frequency.",
            d5: 'Execute one Pattern Interrupt today — catch an automatic reaction and pause before responding. That gap is the practice.',
          }

          // Coherence trend SVG
          const w=360, h=80, pad=10
          const xStep=(w-pad*2)/(coherenceHistory.length-1)
          const pts=coherenceHistory.map((d,i)=>({ x:pad+i*xStep, y:h-pad-(d.score/100)*(h-pad*2) }))
          const pathD=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          const areaD=`${pathD} L${pts[pts.length-1].x},${h-pad} L${pts[0].x},${h-pad} Z`

  return (
    <>
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:2 }}>Coherence Mirror</div>
              <div style={{ fontSize:13, color:'#888' }}>Your frequency signature across all five bodies — updated daily.</div>
            </div>

            {/* ── ROW 1: Coherence State + Score ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14, marginTop:20 }}>

              {/* Coherence State */}
              <div style={{ background:cState.bg, borderRadius:14, border:`1.5px solid ${cState.color}30`, padding:'20px 22px' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:cState.color, marginBottom:8 }}>Current coherence state</div>
                <div style={{ fontSize:28, fontWeight:700, color:cState.color, letterSpacing:'-0.03em', marginBottom:8 }}>{cState.label}</div>
                <div style={{ fontSize:12, color:'#5F5E5A', lineHeight:1.65, marginBottom:16 }}>{cState.desc}</div>
                {nextState && <>
                  <div style={{ fontSize:10, color:'#888', marginBottom:6 }}>Progress to {nextState.label}</div>
                  <div style={{ height:6, borderRadius:99, background:'rgba(0,0,0,0.08)', overflow:'hidden', marginBottom:4 }}>
                    <div style={{ height:6, borderRadius:99, background:cState.color, width:`${progressToNext}%`, transition:'width 0.5s' }}/>
                  </div>
                  <div style={{ fontSize:11, color:'#888' }}>{progressToNext}% of the way there</div>
                </>}
              </div>

              {/* Coherence Score */}
              <div style={{ ...card, marginBottom:0 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#888', marginBottom:12 }}>Coherence score</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:4 }}>
                  <div style={{ fontSize:52, fontWeight:700, letterSpacing:'-0.04em', color:cState.color, lineHeight:1 }}>{todayCoherence}</div>
                  <div style={{ fontSize:18, color:'#888', paddingBottom:6 }}>/100</div>
                </div>
                <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>Source weighted 1.5× as the tuning fork</div>
                <button onClick={() => setShowSignature(true)} style={{ padding:'7px 14px', borderRadius:8, border:'0.5px solid #7F77DD40', background:'#EEEDFE', color:'#3C3489', fontSize:11, fontWeight:500, cursor:'pointer', marginBottom:4 }}>
                  ✦ View & share my signature
                </button>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div style={{ background:'#F7F6F3', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:3 }}>7-day average</div>
                    <div style={{ fontSize:20, fontWeight:700, color:'#1a1a18' }}>{weekAvgCoherence}</div>
                  </div>
                  <div style={{ background:'#F7F6F3', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:3 }}>Days tracked</div>
                    <div style={{ fontSize:20, fontWeight:700, color:'#1a1a18' }}>{Object.keys(safeChecked).length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Coherence Trajectory + Resonance Signature ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

              {/* Coherence Trajectory */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Coherence trajectory</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:16 }}>30-day coherence score — not just completion %</div>
                <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow:'visible' }}>
                  <defs>
                    <linearGradient id="cohGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cState.color} stopOpacity="0.25"/>
                      <stop offset="100%" stopColor={cState.color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[0,25,50,75,100].map(pct => (
                    <line key={pct} x1={pad} y1={h-pad-(pct/100)*(h-pad*2)} x2={w-pad} y2={h-pad-(pct/100)*(h-pad*2)} stroke="#EEEDE9" strokeWidth={0.5}/>
                  ))}
                  {[0,25,50,75].map(pct => (
                    <text key={pct} x={pad} y={h-pad-(pct/100)*(h-pad*2)-2} fontSize={7} fill="#C0BEBA">{pct}</text>
                  ))}
                  <path d={areaD} fill="url(#cohGrad)"/>
                  <path d={pathD} fill="none" stroke={cState.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
                  <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={4} fill={cState.color} stroke="#fff" strokeWidth={1.5}/>
                  <text x={pts[pts.length-1].x+6} y={pts[pts.length-1].y+4} fontSize={9} fill={cState.color} fontWeight={600}>{coherenceHistory[coherenceHistory.length-1].score}</text>
                </svg>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <div style={{ fontSize:10, color:'#888' }}>30 days ago</div>
                  <div style={{ fontSize:10, color:'#888' }}>Today</div>
                </div>
              </div>

              {/* Resonance Signature */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Resonance signature</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:14 }}>7-day average per frequency body + trend</div>
                {domainResonance.map((d,i) => (
                  <div key={d.id} style={{ marginBottom: i<4 ? 12 : 0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:d.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{d.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>{d.name}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:10, color:'#888' }}>{d.resonanceLabel}</span>
                            <span style={{ fontSize:13 }}>{d.trend==='rising'?'↑':d.trend==='falling'?'↓':'→'}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:d.avg7>=60?d.color:'#E24B4A' }}>{d.avg7}%</span>
                          </div>
                        </div>
                        <div style={{ height:6, borderRadius:99, background:'#EEEDE9', overflow:'hidden' }}>
                          <div style={{ height:6, borderRadius:99, background:d.color, width:`${d.avg7}%`, transition:'width 0.5s' }}/>
                        </div>
                      </div>
                      {d.id==='d1' && <div style={{ fontSize:8, padding:'1px 5px', borderRadius:99, background:'#EEEDFE', color:'#3C3489', fontWeight:700, whiteSpace:'nowrap' }}>FORK</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ROW 3: Primary Interference + Radar ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

              {/* Primary Interference */}
              <div style={{ background:primaryInterference.bg, borderRadius:14, border:`1px solid ${primaryInterference.color}30`, padding:'20px 22px' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:primaryInterference.color, marginBottom:8 }}>Primary interference</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{primaryInterference.icon}</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:primaryInterference.text }}>{primaryInterference.name}</div>
                    <div style={{ fontSize:12, color:primaryInterference.text, opacity:0.8 }}>{primaryInterference.avg7}% resonance · 7-day average</div>
                  </div>
                </div>
                <div style={{ fontSize:13, color:primaryInterference.text, lineHeight:1.7, opacity:0.9, marginBottom:14 }}>
                  {primaryInterference.id==='d1' && 'Source is your primary interference. Without the tuning fork resonating clearly, the other four bodies have no reference frequency. This is always the highest-leverage place to begin.'}
                  {primaryInterference.id==='d2' && 'Form is your primary interference. The physical vessel is depleted — and a depleted instrument cannot produce coherent sound regardless of intention or awareness.'}
                  {primaryInterference.id==='d3' && 'Field is your primary interference. Stored emotional charge creates the most pervasive distortion pattern — it colors every thought, every perception, and embeds directly into Code.'}
                  {primaryInterference.id==='d4' && 'Mind is your primary interference. Without deliberate mental direction, the conscious field amplifies every lower-frequency input it receives rather than filtering it.'}
                  {primaryInterference.id==='d5' && 'Code is your primary interference. Unexamined programs are running most of your behavior below the threshold of awareness — continuously generating the past in the present.'}
                </div>
                <div style={{ background:'rgba(255,255,255,0.5)', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:primaryInterference.text, marginBottom:4 }}>Today's prescription</div>
                  <div style={{ fontSize:12, color:primaryInterference.text, lineHeight:1.6 }}>{INTERFERENCE_RX[primaryInterference.id]}</div>
                </div>
              </div>

              {/* Resonance Radar */}
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Resonance map</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:8 }}>A perfect pentagon = full coherence across all five bodies. Distortion reveals where interference lives.</div>
                <RadarChart scores={domainScores}/>
              </div>
            </div>

            {/* ── ROW 4: Mastery Thresholds ── */}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Mastery thresholds</div>
              <div style={{ fontSize:11, color:'#888', marginBottom:16 }}>Specific markers for each frequency body — so you know when you have genuinely shifted, not just improved your score.</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
                {DOMAINS.map(d => {
                  const thresholds = THRESHOLDS[d.id]
                  const avg7 = domainResonance.find(r=>r.id===d.id)?.avg7 || 0
                  const current = [...thresholds].reverse().find(t => avg7 >= t.score) || null
                  const next = thresholds.find(t => avg7 < t.score)
                  return (
                    <div key={d.id} style={{ background:d.bg, borderRadius:12, padding:'14px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                        <div style={{ fontSize:16 }}>{d.icon}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.name}</div>
                      </div>
                      {thresholds.map((t,ti) => {
                        const achieved = avg7 >= t.score
                        return (
                          <div key={ti} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:8, opacity: achieved ? 1 : 0.45 }}>
                            <div style={{ width:14, height:14, borderRadius:'50%', background: achieved ? d.color : 'rgba(0,0,0,0.12)', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {achieved && <div style={{ width:5, height:5, borderRadius:'50%', background:'#fff' }}/>}
                            </div>
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:d.text, marginBottom:1 }}>{t.level}</div>
                              <div style={{ fontSize:10, color:d.text, lineHeight:1.45, opacity:0.8 }}>{t.desc}</div>
                            </div>
                          </div>
                        )
                      })}
                      {next && (
                        <div style={{ borderTop:`0.5px solid ${d.color}20`, paddingTop:8, marginTop:4 }}>
                          <div style={{ fontSize:9, color:d.text, opacity:0.7 }}>Next: {next.level} at {next.score}% sustained</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── ROW 5: System Stats + Export ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Practice stats</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  {[["Today's practice",''+dailyPct+'%'],['Day streak',streakCount+' days'],['Days tracked',''+Object.keys(safeChecked).length],['Override rate',triggerRate+'%']].map(([l,v])=>(
                    <div key={l} style={{ background:'#F7F6F3', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:10, color:'#888', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:18, fontWeight:700, color:'#1a1a18' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                  {DAYS.map((day,i) => {
                    const d=new Date();d.setDate(new Date().getDate()-new Date().getDay()+i);const dk=d.toDateString();const isToday=dk===today;const isDone=activeDays[dk]
                    return <div key={i}
                      style={{ aspectRatio:'1', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500, cursor:'pointer', border:`0.5px solid ${isDone?'#5DCAA5':isToday?'#7F77DD':'rgba(0,0,0,0.08)'}`, background:isDone?'#E1F5EE':isToday?'#EEEDFE':'#F7F6F3', color:isDone?'#085041':isToday?'#3C3489':'#888' }}>{day}</div>
                  })}
                </div>
              </div>
              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Coherence baseline history</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.6, marginBottom:14 }}>
                  Each time you retake the baseline assessment, your previous signature is archived here. This is your coherence journey made visible.
                </div>
                {(() => {
                  const history = (() => { try { return JSON.parse(localStorage.getItem('q_onboarding_history') || '[]') } catch { return [] } })()
                  const allSnapshots = [
                    ...history,
                    onboardingProfile ? { ...onboardingProfile, isCurrent: true } : null
                  ].filter(Boolean).sort((a,b) => new Date(a.completedAt) - new Date(b.completedAt))

                  if (allSnapshots.length < 2) return (
                    <div style={{ fontSize:12, color:'#888', background:'#F7F6F3', borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
                      Retake the assessment after 30 days of practice to see your progression here.
                    </div>
                  )

                  return (
                    <div style={{ marginBottom:14 }}>
                      {allSnapshots.map((snap, si) => {
                        const state = (() => { const s = snap.overallScore || 0; return s<=20?{label:'Scattered',color:'#E24B4A'}:s<=40?{label:'Stirring',color:'#BA7517'}:s<=60?{label:'Grounding',color:'#378ADD'}:s<=80?{label:'Aligning',color:'#7F77DD'}:{label:'Whole',color:'#1D9E75'} })()
                        return (
                          <div key={si} style={{ marginBottom:10, padding:'12px 14px', background:'#F7F6F3', borderRadius:10, border:`0.5px solid ${snap.isCurrent?state.color+'40':'rgba(0,0,0,0.06)'}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                              <div>
                                <div style={{ fontSize:12, fontWeight:600, color:'#1a1a18' }}>
                                  {snap.isCurrent ? 'Current baseline' : `Snapshot ${si + 1}`}
                                  {snap.isCurrent && <span style={{ fontSize:10, marginLeft:6, padding:'1px 6px', borderRadius:99, background:state.color+'20', color:state.color }}>active</span>}
                                </div>
                                <div style={{ fontSize:11, color:'#888' }}>{new Date(snap.completedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <div style={{ fontSize:20, fontWeight:700, color:state.color }}>{snap.overallScore || 0}</div>
                                <div style={{ fontSize:10, color:state.color }}>{state.label}</div>
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                              {DOMAINS.map(d => {
                                const score = snap.scores?.[d.id] || 0
                                return (
                                  <div key={d.id} style={{ flex:1, minWidth:60 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                                      <span style={{ fontSize:9, color:d.color }}>{d.icon} {d.name}</span>
                                      <span style={{ fontSize:9, fontWeight:600, color:d.color }}>{score}/10</span>
                                    </div>
                                    <div style={{ height:3, borderRadius:99, background:'rgba(0,0,0,0.06)', overflow:'hidden' }}>
                                      <div style={{ height:3, borderRadius:99, background:d.color, width:`${score*10}%` }}/>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {si > 0 && (() => {
                              const prev = allSnapshots[si-1]
                              const delta = (snap.overallScore||0) - (prev.overallScore||0)
                              return delta !== 0 ? (
                                <div style={{ fontSize:11, color: delta>0?'#1D9E75':'#E24B4A', marginTop:8, fontWeight:500 }}>
                                  {delta>0?'↑':'↓'} {Math.abs(delta)} points from previous assessment
                                </div>
                              ) : null
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                <button onClick={() => {
                  if(window.confirm('Retake your coherence baseline? Your current scores will be archived.')) {
                    const archived = { ...(onboardingProfile||{}), archivedAt: new Date().toISOString() }
                    const history = (() => { try { return JSON.parse(localStorage.getItem('q_onboarding_history') || '[]') } catch { return [] } })()
                    history.push(archived)
                    localStorage.setItem('q_onboarding_history', JSON.stringify(history))
                    setOnboardingProfile(null)
                  }
                }} style={{ padding:'10px 20px', borderRadius:8, border:'0.5px solid #7F77DD', background:'#EEEDFE', color:'#3C3489', fontSize:13, fontWeight:500, cursor:'pointer', width:'100%' }}>
                  ✦ Retake baseline assessment
                </button>
              </div>

              <div style={card}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Export your data</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button onClick={exportNotes} style={{ padding:'10px 16px', borderRadius:8, border:bdr, background:'#fff', fontSize:13, cursor:'pointer', textAlign:'left' }}>↓ Practice notes (.txt)</button>
                  <button onClick={exportCSV}   style={{ padding:'10px 16px', borderRadius:8, border:bdr, background:'#fff', fontSize:13, cursor:'pointer', textAlign:'left' }}>↓ Coherence scores (.csv)</button>
                  <button onClick={exportBackup} style={{ padding:'10px 16px', borderRadius:8, border:'none', background:'#1a1a18', color:'#fff', fontSize:13, cursor:'pointer', fontWeight:500, textAlign:'left' }}>↓ Full system backup (.json)</button>
                </div>
                <div style={{ fontSize:11, color:'#888', marginTop:12, lineHeight:1.6 }}>Export your full coherence history before clearing browser data or switching devices.</div>
              </div>
            </div>
          </>
  )
}
