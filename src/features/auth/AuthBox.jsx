import { useState } from 'react'
import { signInWithMagicLink } from '../../app/supabaseClient'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

export default function AuthBox({ onSkip }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function signIn() {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await signInWithMagicLink(email.trim())

    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  const shell = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    minHeight: '100vh',
    background: '#F4F3F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflowY: 'auto'
  }

  if (sent) {
    return (
      <div style={shell}>
        <div style={{ maxWidth:440, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:20 }}>✦</div>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:12 }}>Check your email</div>
          <div style={{ fontSize:14, color:'#5F5E5A', lineHeight:1.7, marginBottom:24 }}>
            We sent a magic link to <strong>{email}</strong>.<br/>
            Click the link to sign in and sync your data across devices.
          </div>
          <div style={{ background:'#EEEDFE', borderRadius:12, padding:'14px 18px', marginBottom:24, fontSize:13, color:'#3C3489', lineHeight:1.6 }}>
            No password needed. After signing in, return to Quintave and use Cloud Sync from the top bar.
          </div>
          {onSkip && (
            <button onClick={onSkip}
              style={{ fontSize:13, color:'#888', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
              Continue without signing in
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth:440, width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✦</div>
          <div style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.03em', marginBottom:6 }}>Quintave</div>
          <div style={{ fontSize:14, color:'#888' }}>Five frequency bodies. One daily alignment.</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:bdr, padding:'28px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>Sync your data</div>
          <div style={{ fontSize:13, color:'#5F5E5A', lineHeight:1.6, marginBottom:20 }}>
            Enter your email to back up your progress and access your alignment data across devices.
          </div>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && signIn()}
            placeholder="your@email.com"
            style={{ width:'100%', fontSize:14, padding:'12px 14px', borderRadius:10, border: error ? '1.5px solid #E24B4A' : bdr, background:'#F7F6F3', fontFamily:'inherit', outline:'none', marginBottom:10, boxSizing:'border-box' }}
          />

          {error && <div style={{ fontSize:12, color:'#E24B4A', marginBottom:10 }}>{error}</div>}

          <button
            onClick={signIn}
            disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading ? '#888' : '#1a1a18', color:'#fff', fontSize:14, fontWeight:600, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:bdr, padding:'20px 24px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'#888', marginBottom:14 }}>Why sign in?</div>
          {[
            ['◈', 'Sync across devices', 'Your alignment history is available on every device.'],
            ['✦', 'Protect your progress', 'Your local state can be backed up to your Supabase project.'],
            ['∿', 'Restore when needed', 'Load a cloud backup if local browser data is cleared.'],
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
              Your data stays local. You can sign in later from Cloud Sync.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
