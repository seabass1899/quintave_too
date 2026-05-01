import React, { useState } from 'react'

const NOISE_CATEGORIES = [
  { id: 'social', label: 'Social media', icon: '◎', impact: 3, desc: 'Scrolling, feeds, notifications' },
  { id: 'news', label: 'News & media', icon: '≡', impact: 3, desc: 'News cycles, headlines, opinion content' },
  { id: 'drama', label: 'Drama & conflict', icon: '∿', impact: 4, desc: 'Interpersonal conflict, gossip, charged conversations' },
  { id: 'video', label: 'Passive video', icon: '▶', impact: 2, desc: 'YouTube, streaming, autoplay content' },
  { id: 'noise', label: 'Environmental noise', icon: '〜', impact: 2, desc: 'Loud environments, constant background stimulation' },
  { id: 'toxic', label: 'Low-frequency people', icon: '◈', impact: 4, desc: 'Time with people who consistently drain or destabilize' },
  { id: 'validation', label: 'Validation seeking', icon: '☽', impact: 3, desc: 'Checking likes, reactions, external approval' },
  { id: 'multitask', label: 'Task fragmentation', icon: '✦', impact: 2, desc: 'Constant switching, interruptions, scattered attention' },
]

function useLS(key, def) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def } catch { return def } })
  const save = v => { const nv = typeof v === 'function' ? v(val) : v; setVal(nv); try { localStorage.setItem(key, JSON.stringify(nv)) } catch {} }
  return [val, save]
}

export default function NoiseAudit({ onClose }) {
  const today = new Date().toDateString()
  const [audits, setAudits] = useLS('q_noise_audits', {})
  const todayAudit = audits[today] || {}
  const [notes, setNotes] = useState(todayAudit.notes || '')
  const [saved, setSaved] = useState(false)

  const setExposure = (id, level) => {
    const updated = { ...audits, [today]: { ...todayAudit, [id]: level, notes } }
    setAudits(updated)
  }

  const save = () => {
    setAudits({ ...audits, [today]: { ...todayAudit, notes } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Compute interference score
  const totalScore = NOISE_CATEGORIES.reduce((sum, cat) => {
    const level = todayAudit[cat.id] || 0
    return sum + (level * cat.impact)
  }, 0)
  const maxScore = NOISE_CATEGORIES.reduce((s, c) => s + c.impact * 3, 0)
  const interferenceLevel = Math.round((totalScore / maxScore) * 100)
  const interferenceLabel = interferenceLevel <= 20 ? 'Minimal' : interferenceLevel <= 40 ? 'Low' : interferenceLevel <= 60 ? 'Moderate' : interferenceLevel <= 80 ? 'High' : 'Severe'
  const interferenceColor = interferenceLevel <= 20 ? '#1D9E75' : interferenceLevel <= 40 ? '#7F77DD' : interferenceLevel <= 60 ? '#378ADD' : interferenceLevel <= 80 ? '#BA7517' : '#E24B4A'

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 600, padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 540, background: '#F4F3F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: '#1a1a18', padding: '22px 26px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#fff' }}>×</button>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888780', marginBottom: 6 }}>Daily interference audit</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>Noise + Distraction</div>
          <div style={{ fontSize: 13, color: '#888780', lineHeight: 1.7, marginBottom: 16 }}>
            Most external input is noise. What you expose your system to has a direct energy cost — and a direct impact on your coherence capacity. Log your exposure today.
          </div>
          {/* Interference meter */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: interferenceColor, lineHeight: 1 }}>{interferenceLevel}</div>
              <div style={{ fontSize: 10, color: '#666' }}>/ 100</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: interferenceColor, marginBottom: 4 }}>{interferenceLabel} interference</div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: 5, borderRadius: 99, background: interferenceColor, width: `${interferenceLevel}%`, transition: 'width 0.4s' }}/>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* Categories */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>How much exposure today?</div>
            {NOISE_CATEGORIES.map(cat => {
              const level = todayAudit[cat.id] || 0
              return (
                <div key={cat.id} style={{ background: '#fff', borderRadius: 10, border: bdr, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 14, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', borderRadius: 6, flexShrink: 0, fontFamily: 'inherit' }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{cat.desc}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: level === 0 ? '#888' : level === 1 ? '#1D9E75' : level === 2 ? '#BA7517' : '#E24B4A' }}>
                      {level === 0 ? 'none' : level === 1 ? 'minimal' : level === 2 ? 'moderate' : 'high'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3].map(l => (
                      <button key={l} onClick={() => setExposure(cat.id, l)}
                        style={{ flex: 1, padding: '6px', borderRadius: 7, border: `1.5px solid ${level === l ? (l===0?'#1D9E75':l===1?'#7F77DD':l===2?'#BA7517':'#E24B4A') : 'rgba(0,0,0,0.08)'}`,
                          background: level === l ? (l===0?'#E1F5EE':l===1?'#EEEDFE':l===2?'#FAEEDA':'#FCEBEB') : '#F7F6F3',
                          fontSize: 11, cursor: 'pointer', fontWeight: level === l ? 600 : 400,
                          color: level === l ? (l===0?'#085041':l===1?'#3C3489':l===2?'#633806':'#A32D2D') : '#888' }}>
                        {l === 0 ? 'None' : l === 1 ? 'Little' : l === 2 ? 'Some' : 'A lot'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reflection */}
          <div style={{ background: '#fff', borderRadius: 10, border: bdr, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>What was the primary interference source today?</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="What pulled you most out of alignment today? What would you do differently?"
              rows={3}
              style={{ width: '100%', fontSize: 13, color: '#1a1a18', background: '#F7F6F3', border: bdr, borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}/>
          </div>

          {/* Insight */}
          {interferenceLevel > 60 && (
            <div style={{ background: '#FAEEDA', borderRadius: 10, border: '1px solid #BA751730', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#BA7517', marginBottom: 4 }}>High interference detected</div>
              <div style={{ fontSize: 12, color: '#633806', lineHeight: 1.65 }}>
                Your exposure today is creating significant static in your coherence field. Consider: what one input could you remove tomorrow to reclaim the most energy?
              </div>
            </div>
          )}
          {interferenceLevel <= 20 && Object.keys(todayAudit).length > 1 && (
            <div style={{ background: '#E1F5EE', borderRadius: 10, border: '1px solid #1D9E7530', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#1D9E75', marginBottom: 4 }}>Clean field</div>
              <div style={{ fontSize: 12, color: '#085041', lineHeight: 1.65 }}>
                Minimal interference today. This is a high-coherence environment. Notice how this feels — and what became possible in this space.
              </div>
            </div>
          )}

          <button onClick={save} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: saved ? '#1D9E75' : '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : 'Save interference log'}
          </button>
        </div>
      </div>
    </div>
  )
}
