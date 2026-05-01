import React, { useRef, useState } from 'react'
import { DOMAINS, COHERENCE_STATES, getCoherenceState } from '../../data'

function getState(score) { return getCoherenceState(score) }



// Pentagon radar for the signature card
function SignatureRadar({ scores, size = 200 }) {
  // All coordinates in a 260x260 space, displayed at size x size
  const vb = 260
  const cx = 130, cy = 130, r = 72
  const n = DOMAINS.length
  const angle = i => (i * 2 * Math.PI / n) - Math.PI / 2

  const pt = (frac, i) => {
    const a = angle(i)
    return { x: cx + r * frac * Math.cos(a), y: cy + r * frac * Math.sin(a) }
  }

  const gridPts = frac => DOMAINS.map((_, i) => {
    const p = pt(frac, i)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  const dataPts = DOMAINS.map((d, i) => {
    const pct = Math.max((scores[d.id] || 0) / 100, 0.04)
    const p = pt(pct, i)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  // Labels placed at fixed compass positions with manual tuning
  const labelData = DOMAINS.map((d, i) => {
    const a = angle(i)
    const lr = r + 26
    const lx = cx + lr * Math.cos(a)
    const ly = cy + lr * Math.sin(a)
    // Text anchor based on x position
    const anchor = lx < cx - 10 ? 'end' : lx > cx + 10 ? 'start' : 'middle'
    // Y offset: top node needs extra space above
    const dy = Math.sin(a) < -0.5 ? -3 : Math.sin(a) > 0.5 ? 10 : 5
    return { x: lx, y: ly + dy, anchor, d }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={gridPts(f)} fill="none"
          stroke="rgba(255,255,255,0.1)" strokeWidth={f === 1 ? 0.8 : 0.4}/>
      ))}
      {DOMAINS.map((_, i) => {
        const p = pt(1, i)
        return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.6}/>
      })}
      <polygon points={dataPts} fill="rgba(127,119,221,0.18)"
        stroke="#7F77DD" strokeWidth={1.5} strokeLinejoin="round"/>
      {DOMAINS.map((d, i) => {
        const pct = Math.max((scores[d.id] || 0) / 100, 0.04)
        const p = pt(pct, i)
        return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4}
          fill={d.color} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
      })}
      {labelData.map((lb, i) => (
        <text key={i} x={lb.x.toFixed(1)} y={lb.y.toFixed(1)}
          textAnchor={lb.anchor} fontSize={10} fill={lb.d.color}
          fontWeight={600}>
          {lb.d.icon} {lb.d.name}
        </text>
      ))}
    </svg>
  )
}

// The actual signature card — designed for screenshot
function SignatureCard({ userName, domainScores, coherenceScore, onboardingProfile }) {
  const state = getState(coherenceScore)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const sorted = [...DOMAINS].map(d => ({ ...d, score: domainScores[d.id] || 0 })).sort((a,b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  return (
    <div style={{
      width: 380,
      background: 'linear-gradient(145deg, #0C0B0F 0%, #13121A 60%, #1A1826 100%)',
      borderRadius: 20,
      padding: '28px 24px 24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${state.color}18 0%, transparent 70%)`, pointerEvents: 'none' }}/>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Coherence Signature</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            {userName || 'Quintave'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: state.color, lineHeight: 1 }}>{coherenceScore}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>/100</div>
        </div>
      </div>

      {/* Coherence state */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 99, background: `${state.color}22`, border: `0.5px solid ${state.color}50`, marginBottom: 20 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: state.color }}/>
        <div style={{ fontSize: 11, fontWeight: 600, color: state.color, letterSpacing: '0.06em' }}>{state.label}</div>
      </div>

      {/* Radar + bars side by side */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <SignatureRadar scores={domainScores} size={180}/>
        <div style={{ flex: 1 }}>
          {DOMAINS.map(d => {
            const score = domainScores[d.id] || 0
            return (
              <div key={d.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>{d.icon}</span>
                    <span>{d.name}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: d.color }}>{score}%</div>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: 4, borderRadius: 99, background: d.color, width: `${score}%` }}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Strongest / Primary interference */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <div style={{ background: `${strongest.color}15`, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${strongest.color}30` }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Highest resonance</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: strongest.color }}>{strongest.icon} {strongest.name}</div>
        </div>
        <div style={{ background: `${weakest.color}15`, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${weakest.color}30` }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Growth edge</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: weakest.color }}>{weakest.icon} {weakest.name}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>quintave.vercel.app</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{today}</div>
      </div>
    </div>
  )
}

// Main component with share functionality
export default function CoherenceSignature({ userName, domainScores, coherenceScore, onboardingProfile, onClose }) {
  const cardRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDownload = async () => {
    setCopying(true)
    try {
      // Dynamically load html2canvas if not present
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#0C0B0F',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `quintave-signature-${new Date().toISOString().slice(0,10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch(e) {
      alert('To save your signature: take a screenshot of the card. On Windows: Win+Shift+S. On Mac: Cmd+Shift+4.')
    }
    setCopying(false)
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#F4F3F0', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Your coherence signature</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          Your five-body resonance snapshot. Screenshot and share — or download as an image.
        </div>

        {/* The card */}
        <div ref={cardRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <SignatureCard
            userName={userName}
            domainScores={domainScores}
            coherenceScore={coherenceScore}
            onboardingProfile={onboardingProfile}/>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleDownload}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {copying ? 'Preparing...' : copied ? '✓ Saved!' : '↓ Save as image'}
          </button>
          <button onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'My Quintave Coherence Signature', text: `My coherence score is ${coherenceScore}/100 — ${new Object(COHERENCE_STATES.find(s=>coherenceScore>=s.min&&coherenceScore<=s.max)||COHERENCE_STATES[0]).label}. Check out Quintave: quintave.vercel.app`, url: 'https://quintave.vercel.app' })
            } else {
              navigator.clipboard.writeText(`My Quintave coherence score: ${coherenceScore}/100 — ${(COHERENCE_STATES.find(s=>coherenceScore>=s.min&&coherenceScore<=s.max)||COHERENCE_STATES[0]).label}. Check it out: quintave.vercel.app`)
              alert('Link copied to clipboard!')
            }
          }}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: bdr, background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            ↗ Share
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
          On mobile: screenshot the card above and share directly. On desktop: use Save as image.
        </div>
      </div>
    </div>
  )
}
