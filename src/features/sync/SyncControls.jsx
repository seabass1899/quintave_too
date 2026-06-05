/**
 * SyncControls.jsx — Sprint 6 hardened version
 *
 * Changes from Sprint 4:
 * - window.confirm replaced with inline confirmation UI
 * - Last-synced timestamp displayed
 * - Auto-sync on mount when session is active
 * - Clearer status states (idle / syncing / success / error / confirming)
 * - applyCloudStateToLocal now receives confirmed=true flag
 */

import { useState, useEffect } from 'react'
import { signOut } from '../../app/supabaseClient'
import {
  syncLocalStateToCloud,
  loadCloudState,
  applyCloudStateToLocal,
  getLastSyncLabel,
} from '../../app/services/syncService'

const bdr = '0.5px solid rgba(0,0,0,0.08)'

export default function SyncControls({ session, authReady, onShowAuth }) {
  const [open, setOpen]         = useState(false)
  const [status, setStatus]     = useState('idle') // idle | syncing | success | error | confirming
  const [message, setMessage]   = useState('')
  const [cloudState, setCloudState] = useState(null) // holds loaded state pending confirmation
  const [syncLabel, setSyncLabel]   = useState(getLastSyncLabel())
  // Local ready state — unblocks after 5s even if authReady prop never arrives
  const [localReady, setLocalReady] = useState(false)

  const user = session?.user

  // Unblock after 5s regardless of authReady prop — prevents permanent stuck state
  useState(() => {
    const t = setTimeout(() => setLocalReady(true), 5000)
    return () => clearTimeout(t)
  })

  const isReady = authReady || localReady

  // Auto-sync on mount when signed in — silent background push
  useEffect(() => {
    if (!user?.id) return
    const doSilentSync = async () => {
      try {
        await syncLocalStateToCloud(user.id)
        setSyncLabel(getLastSyncLabel())
      } catch {
        // Silent — auto-sync failures don't surface to UI
      }
    }
    // Delay 3s so app finishes loading first
    const timer = setTimeout(doSilentSync, 3000)
    return () => clearTimeout(timer)
  }, [user?.id])

  // Update sync label every minute
  useEffect(() => {
    const timer = setInterval(() => setSyncLabel(getLastSyncLabel()), 60_000)
    return () => clearInterval(timer)
  }, [])

  async function handleSync() {
    if (!user?.id) { onShowAuth?.(); return }
    setStatus('syncing')
    setMessage('')
    try {
      await syncLocalStateToCloud(user.id)
      setSyncLabel(getLastSyncLabel())
      setStatus('success')
      setMessage('Progress saved to cloud ✓')
      setTimeout(() => { setStatus('idle'); setMessage('') }, 3000)
    } catch (e) {
      setStatus('error')
      setMessage(e?.message || 'Sync failed — check connection')
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
      // Instead of window.confirm — show inline confirmation UI
      setCloudState(state)
      setStatus('confirming')
      const syncedAt = state.updated_at
        ? new Date(state.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'unknown date'
      setMessage(`Cloud backup from ${syncedAt}. This will overwrite your current local data.`)
    } catch (e) {
      setStatus('error')
      setMessage(e?.message || 'Load failed — check connection')
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
      // Push one final sync before signing out
      if (user?.id) {
        try { await syncLocalStateToCloud(user.id) } catch {}
      }
      await signOut()
      setMessage('Signed out')
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      setStatus('error')
      setMessage(e?.message || 'Sign out failed')
    }
  }

  // ── Render: not ready ──
  if (!isReady) {
    return (
      <button disabled style={ghostBtn}>Cloud…</button>
    )
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
      <button
        onClick={() => setOpen(v => !v)}
        style={cloudBtn}
      >
        ☁ {status === 'syncing' ? '…' : status === 'success' ? '✓' : 'Synced'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 54, right: 16, zIndex: 9999,
          width: 280, background: '#fff', border: bdr,
          borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
          padding: 14,
        }}>
          {/* Header */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 800, marginBottom: 4 }}>
            Cloud sync
          </div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4, wordBreak: 'break-word' }}>
            <strong>{user.email}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
            {syncLabel}
          </div>

          {/* Confirmation UI — replaces window.confirm */}
          {status === 'confirming' ? (
            <div style={{ background: '#FAEEDA', border: '1px solid #BA751730', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#633806', lineHeight: 1.5, marginBottom: 10 }}>
                ⚠ {message}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCancelLoad} style={cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleConfirmLoad} style={confirmBtn}>
                  Restore backup
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleSync}
                disabled={status === 'syncing'}
                style={primaryBtn}
              >
                {status === 'syncing' ? 'Saving…' : '↑ Save to cloud'}
              </button>

              <button
                onClick={handleLoadRequest}
                disabled={status === 'syncing'}
                style={secondaryBtn}
              >
                ↓ Load cloud backup
              </button>

              <button
                onClick={handleSignOut}
                disabled={status === 'syncing'}
                style={dangerBtn}
              >
                Sign out
              </button>
            </>
          )}

          {/* Status message */}
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
