import React from 'react'
import { DOMAINS, PRACTICES } from '../../data'

export default function HistoryTab({ checked, directive, evening, earnedMilestones }) {
  const safeChecked = checked || {}
  const safeDirective = directive || {}
  const safeEvening = evening || {}
  const safeMilestones = earnedMilestones || []
  const today = new Date().toDateString()
  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const card = { background:'#fff', borderRadius:14, border:bdr, padding:'16px 18px', marginBottom:14 }

  return (
    <>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>History</div>
          <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>Every day you showed up to tune — recorded here.</div>

          {/* 90-day heatmap */}
          {(() => {
            const now = new Date()
            const days = []
            for(let i=89;i>=0;i--){ const d=new Date(now);d.setDate(now.getDate()-i); days.push(d) }
            const getCoherenceColor = (dateStr) => {
              const dc = checked[dateStr] || {}
              const done = DOMAINS.reduce((a,dom)=>a+PRACTICES[dom.id].filter((_,j)=>dc[`${dom.id}_${j}`]).length,0)
              const pct = (done / Object.values(PRACTICES).flat().length) * 100
              if(pct===0) return '#EEEDE9'
              if(pct<25) return '#CECBF6'
              if(pct<50) return '#AFA9EC'
              if(pct<75) return '#7F77DD'
              return '#534AB7'
            }
            const weeks = []
            for(let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7))
            return (
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>90-day coherence map</div>
                <div style={{ fontSize:11, color:'#888', marginBottom:14 }}>Each cell = one day. Darker = higher practice completion.</div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {days.map((d,i) => {
                    const dk = d.toDateString()
                    const isToday = dk === today
                    return (
                      <div key={i} title={`${dk} — ${Object.keys(checked[dk]||{}).filter(k=>checked[dk][k]).length} practices`}
                        style={{ width:10, height:10, borderRadius:2, background:getCoherenceColor(dk), border:isToday?'1.5px solid #1a1a18':'none', cursor:'default' }}/>
                    )
                  })}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:12 }}>
                  <div style={{ fontSize:10, color:'#888' }}>Less</div>
                  {['#EEEDE9','#CECBF6','#AFA9EC','7F77DD','#534AB7'].map((c,i)=>(
                    <div key={i} style={{ width:10, height:10, borderRadius:2, background:c==='#EEEDE9'?'#EEEDE9':c==='#CECBF6'?'#CECBF6':c==='#AFA9EC'?'#AFA9EC':c==='7F77DD'?'#7F77DD':'#534AB7' }}/>
                  ))}
                  <div style={{ fontSize:10, color:'#888' }}>More</div>
                </div>
              </div>
            )
          })()}

          {/* Milestone history */}
          {safeMilestones.length > 0 && (
            <div style={{ ...card, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Milestones</div>
              <div style={{ fontSize:11, color:'#888', marginBottom:14 }}>Every significant marker on your coherence journey.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[...safeMilestones].reverse().map((m,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#F7F6F3', borderRadius:10 }}>
                    <div style={{ fontSize:20, flexShrink:0 }}>{m.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a1a18' }}>{m.label}</div>
                      <div style={{ fontSize:11, color:'#888' }}>{new Date(m.date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
                    </div>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#7F77DD', flexShrink:0 }}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(safeChecked).length === 0 && <div style={{ ...card, textAlign:'center', color:'#888', fontSize:13 }}>No history yet. Complete your first practice to begin your record.</div>}
          {Object.keys(safeChecked).sort((a,b)=>new Date(b)-new Date(a)).map(date => {
            const dc=safeChecked[date]||{}; const dn=DOMAINS.reduce((acc,d)=>acc+PRACTICES[d.id].filter((_,i)=>dc[`${d.id}_${i}`]).length,0); const histTotal=Object.values(PRACTICES).flat().length; const pct=Math.round((dn/histTotal)*100); const ev=safeEvening[date]||''; const dir=directive[date]||''
            return <div key={date} style={{ background:'#fff', borderRadius:12, border:bdr, padding:'14px 16px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{date}</div>
                <div style={{ fontSize:13, fontWeight:700, color:pct>=70?'#1D9E75':pct>=40?'#BA7517':'#E24B4A' }}>{pct}% coherence · {dn}/{histTotal} practices</div>
              </div>
              {dir && <div style={{ fontSize:12, color:'#5F5E5A', marginBottom:6 }}><strong>Intention:</strong> {dir}</div>}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:ev?8:0 }}>
                {DOMAINS.map(d => { const tot=PRACTICES[d.id].length; const done=PRACTICES[d.id].filter((_,i)=>dc[`${d.id}_${i}`]).length; return <span key={d.id} style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:d.bg, color:d.text }}>{d.name.split(' ')[0]}: {done}/{tot}</span> })}
              </div>
              {ev && <div style={{ fontSize:12, color:'#5F5E5A', borderTop:bdr, paddingTop:8, marginTop:4 }}><strong>Field integration:</strong> {ev}</div>}
            </div>
          })}
    </>
  )
}
