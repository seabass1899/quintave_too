import { useState } from 'react'
import { trackEvent } from '../app/utils/analytics'

export default function FeedbackButton({ dailyPct, streakCount, weakest }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    try {
      trackEvent('feedback_opened', { source: 'floating_button' })
      const existing = JSON.parse(localStorage.getItem('q_feedback') || '[]')
      existing.push({
        text: text.trim(),
        date: new Date().toISOString(),
        state: {
          dailyPct,
          streak: streakCount,
          weakest: weakest?.name || weakest?.id || null,
        },
      })
      localStorage.setItem('q_feedback', JSON.stringify(existing))
      setText('')
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 1500)
    } catch (e) {
      console.error('Feedback capture failed:', e)
    }
  }

  return (
    <>
      {open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9998,
          display:'flex', alignItems:'flex-end', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, width:'100%',
            maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Quick feedback</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>
              What's working? What's confusing?
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Your feedback..."
              style={{ width:'100%', fontSize:13, padding:'10px 12px', borderRadius:8,
                border:'0.5px solid rgba(0,0,0,0.15)', fontFamily:'inherit',
                outline:'none', resize:'none', lineHeight:1.6, marginBottom:12,
                boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setOpen(false)}
                style={{ flex:1, padding:'10px', borderRadius:8,
                  border:'0.5px solid rgba(0,0,0,0.1)', background:'#fff',
                  fontSize:13, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={submit}
                style={{ flex:2, padding:'10px', borderRadius:8, border:'none',
                  background: saved ? '#1D9E75' : '#1a1a18',
                  color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {saved ? '✓ Saved' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        style={{ position:'fixed', bottom:16, right:16, zIndex:9999,
          padding:'10px 14px', borderRadius:10,
          border:'0.5px solid rgba(0,0,0,0.15)',
          background:'#1a1a18', color:'#fff', fontSize:12,
          fontWeight:700, cursor:'pointer',
          boxShadow:'0 8px 24px rgba(0,0,0,0.18)' }}>
        Feedback
      </button>
    </>
  )
}
