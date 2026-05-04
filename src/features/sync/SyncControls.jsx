import { useState } from 'react'
import { signOut } from '../../app/supabaseClient'
import {
  syncLocalStateToCloud,
  loadCloudState,
  applyCloudStateToLocal,
} from '../../app/services/syncService'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

export default function SyncControls({ session, authReady, onShowAuth }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const user = session?.user

  async function handleSync() {
    if (!user?.id) {
      onShowAuth?.()
      return
    }

    setLoading(true)
    setMessage('')
    try {
      await syncLocalStateToCloud(user.id)
      setMessage('Synced ✓')
    } catch (e) {
      setMessage(e?.message || 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoad() {
    if (!user?.id) {
      onShowAuth?.()
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const state = await loadCloudState(user.id)
      if (!state) {
        setMessage('No cloud backup found')
        return
      }
      applyCloudStateToLocal(state)
      setMessage('Cloud backup loaded')
      window.setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setMessage(e?.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    try {
      await signOut()
      setMessage('Signed out')
      window.setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      setMessage(e?.message || 'Sign out failed')
      setLoading(false)
    }
  }

  if (!authReady) {
    return (
      <button disabled style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#fff', color:'#888', fontSize:11, whiteSpace:'nowrap', flexShrink:0 }}>
        Cloud…
      </button>
    )
  }

  if (!user) {
    return (
      <button
        onClick={onShowAuth}
        style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#EEEDFE', color:'#3C3489', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>
        Cloud Sync
      </button>
    )
  }

  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ padding:'5px 10px', borderRadius:7, border:bdr, background:'#EEEDFE', color:'#3C3489', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>
        Cloud ✓
      </button>

      {open && (
        <div style={{ position:'absolute', top:34, right:0, zIndex:9999, width:260, background:'#fff', border:bdr, borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.14)', padding:12 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'#888', fontWeight:800, marginBottom:6 }}>Cloud sync</div>
          <div style={{ fontSize:12, color:'#555', lineHeight:1.45, marginBottom:10, wordBreak:'break-word' }}>
            Signed in as <strong>{user.email}</strong>
          </div>

          <button onClick={handleSync} disabled={loading} style={btnStyle('#1a1a18', '#fff')}>
            {loading ? 'Working…' : 'Sync Progress'}
          </button>

          <button onClick={handleLoad} disabled={loading} style={btnStyle('#fff', '#1a1a18')}>
            Load Cloud Backup
          </button>

          <button onClick={handleSignOut} disabled={loading} style={btnStyle('#fff', '#A32D2D')}>
            Sign Out
          </button>

          {message && <div style={{ marginTop:8, fontSize:12, color: message.includes('failed') ? '#A32D2D' : '#1D9E75', lineHeight:1.4 }}>{message}</div>}
        </div>
      )}
    </div>
  )
}

function btnStyle(background, color) {
  return {
    width:'100%',
    padding:'9px 10px',
    borderRadius:8,
    border:bdr,
    background,
    color,
    fontSize:12,
    fontWeight:800,
    cursor:'pointer',
    marginBottom:8,
    textAlign:'center',
  }
}
