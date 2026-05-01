import React from 'react'
import { DOMAINS, PRACTICES } from '../../data'

const SCHEDULE = [
  { time: 'Morning', items: [
    { name: 'Affirmation Installation', dur: '5 min', domains: ['d1','d4','d5'] },
    { name: 'Stillness Exposure', dur: '15–20 min', domains: ['d1','d3','d4','d5'] },
    { name: 'Breathwork', dur: '5–10 min', domains: ['d1','d2','d3'] },
    { name: 'Morning Directive', dur: '5 min', domains: ['d4','d5'] },
    { name: 'Visualization Practice', dur: '10 min', domains: ['d1','d3','d4','d5'] },
  ]},
  { time: 'Midday', items: [
    { name: 'Training / Mobility', dur: '30–45 min', domains: ['d2','d3'] },
    { name: 'Protein Target', dur: 'Every meal', domains: ['d2'] },
    { name: 'Deep Work Block', dur: '60–90 min', domains: ['d4'] },
    { name: '5 Recall Triggers', dur: 'Real-time', domains: ['d1','d5'] },
    { name: 'Thought Audit', dur: '5 min', domains: ['d4','d5'] },
  ]},
  { time: 'Evening', items: [
    { name: 'Emotional Log', dur: '5 min', domains: ['d3','d4'] },
    { name: 'Gratitude + Reframe', dur: '5 min', domains: ['d3','d4'] },
    { name: 'Trigger Mapping', dur: '15–30 min', domains: ['d3','d4','d5'] },
    { name: 'Pre-Sleep Programming', dur: '5 min', domains: ['d4','d5'] },
    { name: 'Sleep 7h+', dur: '7–9 hours', domains: ['d2','d3','d4','d5'] },
  ]},
  { time: 'Weekly', items: [
    { name: 'Theta / Shadow Work', dur: '3–4x/week', domains: ['d1','d5'] },
    { name: 'Non-Local Body Scan', dur: '2–3x/week', domains: ['d1','d2','d3'] },
    { name: 'Belief Audit', dur: 'Weekly', domains: ['d4','d5'] },
    { name: 'Identity Decompression', dur: '3 prompts', domains: ['d1','d4','d5'] },
    { name: 'Controlled Stress Exposure', dur: '2–5 min', domains: ['d2','d3','d5'] },
  ]},
]

export default function ScheduleTab({ checked }) {
  const safeChecked = checked || {}
  const today = new Date().toDateString()
  const todayChecks = safeChecked[today] || {}
  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const card = { background:'#fff', borderRadius:14, border:bdr, padding:'16px 18px', marginBottom:14 }

          // Primary interference domain (weakest 7-day)
          const primaryId = (() => {
            const today2 = new Date()
            return DOMAINS.reduce((worst, d) => {
              let total = 0
              for(let i=6;i>=0;i--){ const dt=new Date(today2);dt.setDate(today2.getDate()-i); const dc=safeChecked[dt.toDateString()]||{}; const dn=PRACTICES[d.id].filter((_,j)=>dc[`${d.id}_${j}`]).length; total+=Math.round((dn/PRACTICES[d.id].length)*100) }
              const avg = Math.round(total/7)
              const worstAvg = (() => { let t2=0; for(let i=6;i>=0;i--){ const dt=new Date(today2);dt.setDate(today2.getDate()-i); const dc=safeChecked[dt.toDateString()]||{}; const dn=PRACTICES[worst].filter((_,j)=>dc[`${worst}_${j}`]).length; t2+=Math.round((dn/PRACTICES[worst].length)*100) } return Math.round(t2/7) })()
              return avg < worstAvg ? d.id : worst
            }, 'd1')
          })()
          const primaryDomain = DOMAINS.find(d => d.id === primaryId)

          return <>
            <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Your tuning schedule</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:16 }}>Personalized based on your current resonance signature.</div>

            {/* Primary interference banner */}
            <div style={{ background: primaryDomain.bg, borderRadius:12, border:`1px solid ${primaryDomain.color}30`, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${primaryDomain.color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{primaryDomain.icon}</div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:primaryDomain.color, marginBottom:3 }}>Primary interference this week</div>
                <div style={{ fontSize:14, fontWeight:600, color:primaryDomain.text }}>{primaryDomain.name} — prioritize these practices today</div>
              </div>
            </div>

            {/* Priority practices for weakest domain */}
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>
                <span style={{ color: primaryDomain.color }}>{primaryDomain.icon} {primaryDomain.name}</span> — today's priority practices
              </div>
              {PRACTICES[primaryId].map((p, i) => {
                const pk = `${primaryId}_${i}`
                const isDone = todayChecks[pk]
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < PRACTICES[primaryId].length-1 ? bdr : 'none', opacity: isDone ? 0.5 : 1 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: isDone ? '#1D9E75' : primaryDomain.color, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'#1a1a18', textDecoration: isDone ? 'line-through' : 'none' }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'#888' }}>{p.target}</div>
                    </div>
                    {isDone && <div style={{ fontSize:11, color:'#1D9E75', fontWeight:500 }}>✓ done</div>}
                  </div>
                )
              })}
            </div>

            {/* Full schedule */}
            <div style={{ fontSize:13, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Full daily schedule</div>
            {SCHEDULE.map(block => (
              <div key={block.time} style={{ ...card, marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>{block.time}</div>
                {block.items.map((item,i) => {
                  const isPrimary = item.domains.includes(primaryId)
                  return (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', borderBottom:i<block.items.length-1?bdr:'none', background: isPrimary ? `${primaryDomain.color}08` : 'transparent', borderRadius: isPrimary ? 6 : 0, margin: isPrimary ? '2px -4px' : 0, padding: isPrimary ? '7px 4px' : '7px 0' }}>
                      <div style={{ display:'flex', gap:3, paddingTop:3 }}>
                        {item.domains.slice(0,3).map(d => { const dom=DOMAINS.find(x=>x.id===d); return <div key={d} style={{ width:7, height:7, borderRadius:'50%', background:dom.color }}/> })}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:'#1a1a18', fontWeight: isPrimary ? 500 : 400 }}>{item.name}</div>
                        <div style={{ fontSize:11, color:'#888' }}>{item.dur}</div>
                      </div>
                      {isPrimary && <div style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:primaryDomain.bg, color:primaryDomain.text, fontWeight:600, whiteSpace:'nowrap', flexShrink:0 }}>priority</div>}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
}
