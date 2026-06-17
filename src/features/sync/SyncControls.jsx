/**
 * SyncControls.jsx — hardened
 *
 * Fixes:
 *  - useState(fn) misuse replaced with a proper useEffect for the ready timer.
 *  - handleSync always resets out of 'syncing' (success OR error), so the
 *    "Saving…" label can never get stuck.
 *  - A hard watchdog forces the button back to idle if a sync somehow hangs.
 */

import { useState, useEffect, useRef } from 'react'
import { signOut, supabase } from '../../app/supabaseClient'
import {
  syncLocalStateToCloud,
  loadCloudState,
  applyCloudStateToLocal,
  getLastSyncLabel,
} from '../../app/services/syncService'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

export default function SyncControls({ session, authReady, onShowAuth }) {
  const [open, setOpen]             = useState(false)
  const [status, setStatus]         = useState('idle') // idle | syncing | success | error | confirming
  const [message, setMessage]       = useState('')
  const [cloudState, setCloudState] = useState(null)
  const [syncLabel, setSyncLabel]   = useState(getLastSyncLabel())
  const [localReady, setLocalReady] = useState(false)

  const user = session?.user
  const watchdogRef = useRef(null)
  const resetTimerRef = useRef(null)
  const inFlightRef = useRef(false)   // re-entry guard so repeat clicks can't wedge state

  // Unblock the "Cloud…" disabled state after 5s even if authReady never arrives.
  // (This was incorrectly written as useState(fn) before — must be useEffect.)
  useEffect(() => {
    const t = setTimeout(() => setLocalReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  const isReady = authReady || localReady

  // Auto-sync on mount when signed in — silent background push.
  useEffect(() => {
    const id = user?.id
    if (!id) return
    const doSilentSync = async () => {
      try {
        await syncLocalStateToCloud(id)   // FIX: was `uid` (undefined here)
        setSyncLabel(getLastSyncLabel())
      } catch {
        // Silent — auto-sync failures don't surface to UI
      }
    }
    const timer = setTimeout(doSilentSync, 3000)
    return () => clearTimeout(timer)
  }, [user?.id])

  useEffect(() => {
    const timer = setInterval(() => setSyncLabel(getLastSyncLabel()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Clear any pending timers on unmount.
  useEffect(() => () => {
    clearTimeout(watchdogRef.current)
    clearTimeout(resetTimerRef.current)
  }, [])

  function resetSoon() {
    clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => { setStatus('idle'); setMessage('') }, 3000)
  }

  async function handleSync() {
    // Re-entry guard: if a sync is already running, ignore the click instead of
    // stacking timers / wedging state. (Don't rely on the disabled attribute —
    // a stuck status used to make the button unclickable.)
    if (inFlightRef.current) return
    inFlightRef.current = true

    // Resolve the user id from the prop first; if the session prop hasn't
    // propagated yet (a known race — the auth token can be present in storage
    // while React state is briefly null), fall back to the live session so a
    // click never silently no-ops.
    let uid = user?.id
    if (!uid && supabase) {
      try {
        const { data } = await supabase.auth.getSession()
        uid = data?.session?.user?.id || null
      } catch { /* ignore — handled below */ }
    }
    if (!uid) { inFlightRef.current = false; onShowAuth?.(); return }

    setStatus('syncing')
    setMessage('')

    // Watchdog: if the sync hasn't settled in 15s, stop showing "Saving…".
    clearTimeout(watchdogRef.current)
    watchdogRef.current = setTimeout(() => {
      inFlightRef.current = false
      setStatus('error')
      setMessage('Sync is taking too long — please try again.')
      resetSoon()
    }, 15000)

    try {
      await syncLocalStateToCloud(uid)
      clearTimeout(watchdogRef.current)
      setSyncLabel(getLastSyncLabel())
      setStatus('success')
      setMessage('Progress saved to cloud ✓')
      resetSoon()
    } catch (e) {
      clearTimeout(watchdogRef.current)
      setStatus('error')
      setMessage(e?.message || 'Sync failed — check connection')
      resetSoon()
    } finally {
      // ALWAYS release the guard, no matter how we exit, so the next click works.
      inFlightRef.current = false
    }
  }

  async function handleLoadRequest() {
    if (!user?.id) { onShowAuth?.(); return }
    setStatus('syncing')
    setMessage('')
    try {
      const state = await loadCloudState(user.id)
      if (!state) {
        setStatus('idle')
        setMessage('No cloud backup found')
        return
      }
      setCloudState(state)
      setStatus('confirming')
      const syncedAt = state.updated_at
        ? new Date(state.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'unknown date'
      setMessage(`Cloud backup from ${syncedAt}. This will overwrite your current local data.`)
    } catch (e) {
      setStatus('error')
      setMessage(e?.message || 'Load failed — check connection')
      resetSoon()
    }
  }

  function handleConfirmLoad() {
    if (!cloudState) return
    const result = applyCloudStateToLocal(cloudState, true)
    if (result.applied) {
      setStatus('success')
      setMessage(`Restored ${result.fieldsRestored} data fields ✓`)
      setCloudState(null)
      setTimeout(() => window.location.reload(), 800)
    } else {
      setStatus('error')
      setMessage('Restore failed — no data applied')
      resetSoon()
    }
  }

  function handleCancelLoad() {
    setCloudState(null)
    setStatus('idle')
    setMessage('')
  }

  async function handleSignOut() {
    setStatus('syncing')
    try {
      if (user?.id) {
        try { await syncLocalStateToCloud(user.id) } catch {}
      }
      await signOut()
      setMessage('Signed out')
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      setStatus('error')
      setMessage(e?.message || 'Sign out failed')
      resetSoon()
    }
  }

  // ── Render: not ready ──
  if (!isReady) {
    return <button disabled style={ghostBtn}>Cloud…</button>
  }

  // ── Render: not signed in ──
  if (!user) {
    return (
      <button onClick={onShowAuth} style={cloudBtn}>
        ☁ Sync
      </button>
    )
  }

  // ── Render: signed in ──
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={cloudBtn}>
        ☁ {status === 'syncing' ? '…' : status === 'success' ? '✓' : 'Synced'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 54, right: 16, zIndex: 9999,
          width: 280, background: '#fff', border: bdr,
          borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
          padding: 14,
        }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 800, marginBottom: 4 }}>
            Cloud sync - Build B2
          </div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4, wordBreak: 'break-word' }}>
            <strong>{user.email}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
            {syncLabel}
          </div>

          {status === 'confirming' ? (
            <div style={{ background: '#FAEEDA', border: '1px solid #BA751730', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#633806', lineHeight: 1.5, marginBottom: 10 }}>
                ⚠ {message}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCancelLoad} style={cancelBtn}>Cancel</button>
                <button onClick={handleConfirmLoad} style={confirmBtn}>Restore backup</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={handleSync} disabled={status === 'syncing'} style={primaryBtn}>
                {status === 'syncing' ? 'Saving…' : '↑ Save to cloud'}
              </button>
              <button onClick={handleLoadRequest} disabled={status === 'syncing'} style={secondaryBtn}>
                ↓ Load cloud backup
              </button>
              <button onClick={handleSignOut} disabled={status === 'syncing'} style={dangerBtn}>
                Sign out
              </button>
            </>
          )}

          {message && status !== 'confirming' && (
            <div style={{
              marginTop: 8, fontSize: 12, lineHeight: 1.45,
              color: status === 'error' ? '#A32D2D' : '#1D9E75',
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Button styles ──────────────────────────────────────────────────────────────

const ghostBtn = {
  padding: '5px 10px', borderRadius: 7, border: bdr,
  background: '#fff', color: '#888', fontSize: 11,
  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'not-allowed',
}
const cloudBtn = {
  padding: '5px 10px', borderRadius: 7, border: bdr,
  background: '#EEEDFE', color: '#3C3489', fontSize: 11,
  cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
}
const primaryBtn = {
  width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none',
  background: '#1a1a18', color: '#fff', fontSize: 12, fontWeight: 800,
  cursor: 'pointer', marginBottom: 8, textAlign: 'center',
}
const secondaryBtn = {
  width: '100%', padding: '9px 10px', borderRadius: 8, border: bdr,
  background: '#fff', color: '#1a1a18', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', marginBottom: 8, textAlign: 'center',
}
const dangerBtn = {
  width: '100%', padding: '9px 10px', borderRadius: 8, border: bdr,
  background: '#fff', color: '#A32D2D', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', marginBottom: 0, textAlign: 'center',
}
const cancelBtn = {
  flex: 1, padding: '8px', borderRadius: 8, border: bdr,
  background: '#fff', color: '#555', fontSize: 12,
  fontWeight: 700, cursor: 'pointer',
}
const confirmBtn = {
  flex: 2, padding: '8px', borderRadius: 8, border: 'none',
  background: '#1a1a18', color: '#fff', fontSize: 12,
  fontWeight: 800, cursor: 'pointer',
}
