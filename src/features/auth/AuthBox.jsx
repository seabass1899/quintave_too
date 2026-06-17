import { useState } from 'react'
import { sendSignInCode, verifySignInCode } from '../../app/supabaseClient'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

export default function AuthBox({ onSkip, onSignedIn }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')   // 'email' | 'code'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resent, setResent] = useState(false)

  async function sendCode() {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await sendSignInCode(email.trim())
    setLoading(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  async function resendCode() {
    setError(null)
    const { error } = await sendSignInCode(email.trim())
    if (error) setError(error.message)
    else { setResent(true); setTimeout(() => setResent(false), 4000) }
  }

  async function verify() {
    const clean = code.replace(/\s/g, '')
    if (clean.length < 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await verifySignInCode(email.trim(), clean)
    setLoading(false)
    if (error) {
      setError(error.message || 'That code is invalid or expired. Try again.')
      return
    }
    // Session is now established in THIS browser.
    if (onSignedIn) onSignedIn(data?.session ?? null)
  }

  // ── Step 2: enter the code ──────────────────────────────────────────────────
  if (step === 'code') {
    return (
      <div style={{ minHeight:'100vh', background:'#F4F3F0', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ maxWidth:440, width:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✦</div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:8 }}>Enter your code</div>
            <div style={{ fontSize:14, color:'#5F5E5A', lineHeight:1.7 }}>
              We sent a 6-digit code to <strong>{email}</strong>.<br/>
              Enter it below to sign in.
            </div>
          </div>

          <div style={{ background:'#fff', borderRadius:16, border:bdr, padding:'28px', marginBottom:16 }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="123456"
              autoFocus
              style={{ width:'100%', fontSize:24, letterSpacing:'0.4em', textAlign:'center', padding:'14px', borderRadius:10, border: error ? '1.5px solid #E24B4A' : bdr, background:'#F7F6F3', fontFamily:'inherit', outline:'none', marginBottom:12, boxSizing:'border-box' }}
            />

            {error && <div style={{ fontSize:12, color:'#E24B4A', marginBottom:10 }}>{error}</div>}

            <button
              onClick={verify}
              disabled={loading}
              style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading ? '#888' : '#1a1a18', color:'#fff', fontSize:14, fontWeight:600, cursor: loading ? 'default' : 'pointer', marginBottom:14 }}>
              {loading ? 'Verifying...' : 'Verify & sign in'}
            </button>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
              <button onClick={() => { setStep('email'); setCode(''); setError(null) }}
                style={{ color:'#888', background:'none', border:'none', cursor:'pointer' }}>
                ← Use a different email
              </button>
              <button onClick={resendCode}
                style={{ color:'#3C3489', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>
                {resent ? 'Code sent ✓' : 'Resend code'}
              </button>
            </div>
          </div>

          <div style={{ background:'#EEEDFE', borderRadius:12, padding:'12px 16px', fontSize:12, color:'#3C3489', lineHeight:1.6, textAlign:'center' }}>
            Tip: the code works in this browser even if you opened the email somewhere else.
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1: enter email ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#F4F3F0', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:440, width:'100%' }}>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✦</div>
          <div style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.03em', marginBottom:6 }}>Quintave</div>
          <div style={{ fontSize:14, color:'#888' }}>Five frequency bodies. One daily tuning practice.</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:bdr, padding:'28px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>Sync your data</div>
          <div style={{ fontSize:13, color:'#5F5E5A', lineHeight:1.6, marginBottom:20 }}>
            Enter your email to access your coherence data across all your devices. We'll send you a 6-digit sign-in code — no password needed.
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendCode()}
            placeholder="your@email.com"
            style={{ width:'100%', fontSize:14, padding:'12px 14px', borderRadius:10, border: error ? '1.5px solid #E24B4A' : bdr, background:'#F7F6F3', fontFamily:'inherit', outline:'none', marginBottom:10, boxSizing:'border-box' }}
          />

          {error && <div style={{ fontSize:12, color:'#E24B4A', marginBottom:10 }}>{error}</div>}

          <button
            onClick={sendCode}
            disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading ? '#888' : '#1a1a18', color:'#fff', fontSize:14, fontWeight:600, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Sending...' : 'Send sign-in code'}
          </button>
          <div style={{ fontSize:11, color:'#aaa', textAlign:'center', marginTop:10, lineHeight:1.5 }}>
            By continuing you agree to our{' '}
            <a href="/terms" style={{ color:'#888' }}>Terms</a> and{' '}
            <a href="/privacy" style={{ color:'#888' }}>Privacy Policy</a>.
          </div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:bdr, padding:'20px 24px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'#888', marginBottom:14 }}>Why sign in?</div>
          {[
            ['◈', 'Sync across devices', 'Your practices available on every device'],
            ['✦', 'Never lose your data', 'Your coherence history is safely backed up'],
            ['∿', 'Pick up where you left off', 'Switch from phone to laptop seamlessly'],
          ].map(([icon, title, desc], i) => (
            <div key={i} style={{ display:'flex', gap:12, marginBottom: i < 2 ? 14 : 0 }}>
              <div style={{ fontSize:18, flexShrink:0, width:28, textAlign:'center' }}>{icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{title}</div>
                <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {onSkip && (
          <div style={{ textAlign:'center' }}>
            <button onClick={onSkip}
              style={{ fontSize:13, color:'#888', background:'none', border:'none', cursor:'pointer' }}>
              Continue without signing in →
            </button>
            <div style={{ fontSize:11, color:'#aaa', marginTop:6 }}>
              Your data stays local only. You can sign in later from Settings.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
