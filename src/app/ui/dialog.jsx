import React, { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// In-app dialog system — replaces native alert()/confirm() with styled UI.
//
// Usage (from anywhere, no context/provider threading needed):
//   import { toast, confirmDialog } from '<path>/app/ui/dialog'
//   toast('Saved.', { type: 'success' })
//   if (await confirmDialog({ title: 'Clear today?', destructive: true })) { ... }
//
// Mount <DialogHost /> exactly once near the app root.
// ─────────────────────────────────────────────────────────────────────────────

let listeners = []
let state = { toasts: [], confirm: null }

function emit() { listeners.forEach(l => l(state)) }
function setState(next) { state = next; emit() }

// ── Toasts ──────────────────────────────────────────────────────────────────
let toastSeq = 0
export function toast(message, opts = {}) {
  const id = ++toastSeq
  const type = opts.type || 'info'
  const duration = opts.duration ?? (type === 'error' ? 5200 : 3400)
  setState({ ...state, toasts: [...state.toasts, { id, message, type }] })
  if (duration > 0) setTimeout(() => dismissToast(id), duration)
  return id
}

function dismissToast(id) {
  setState({ ...state, toasts: state.toasts.filter(t => t.id !== id) })
}

// ── Confirm ────────────────────────────────────────────────────────────────
export function confirmDialog(opts = {}) {
  return new Promise(resolve => {
    setState({
      ...state,
      confirm: {
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        destructive: !!opts.destructive,
        resolve,
      },
    })
  })
}

function resolveConfirm(value) {
  const c = state.confirm
  setState({ ...state, confirm: null })
  if (c && c.resolve) c.resolve(value)
}

// ── Host ─────────────────────────────────────────────────────────────────────
export function DialogHost() {
  const [s, setS] = useState(state)

  useEffect(() => {
    const l = (next) => setS({ ...next })
    listeners.push(l)
    return () => { listeners = listeners.filter(x => x !== l) }
  }, [])

  useEffect(() => {
    if (!s.confirm) return
    const onKey = (e) => {
      if (e.key === 'Escape') resolveConfirm(false)
      else if (e.key === 'Enter') resolveConfirm(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.confirm])

  const toastBg = (type) =>
    type === 'error' ? '#3a1c1c' : type === 'success' ? '#11271e' : '#1f1f1d'
  const toastBorder = (type) =>
    type === 'error' ? 'rgba(224,128,128,0.4)'
    : type === 'success' ? 'rgba(120,210,170,0.35)'
    : 'rgba(255,255,255,0.13)'

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8,
        alignItems: 'center', pointerEvents: 'none', width: 'min(92vw, 420px)',
      }}>
        {s.toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer', width: '100%',
              background: toastBg(t.type), color: '#fff',
              border: `0.5px solid ${toastBorder(t.type)}`, borderRadius: 12,
              padding: '12px 16px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.5,
              boxShadow: '0 10px 34px rgba(0,0,0,0.28)', whiteSpace: 'pre-line',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {s.confirm && (
        <div
          onClick={() => resolveConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            background: 'rgba(10,10,9,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              background: '#fbfaf7', borderRadius: 16, padding: '24px 24px 20px',
              width: 'min(94vw, 400px)', boxShadow: '0 24px 70px rgba(0,0,0,0.38)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a18', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {s.confirm.title}
            </div>
            {s.confirm.message && (
              <div style={{ fontSize: 14, color: '#55524c', lineHeight: 1.55, marginBottom: 20, whiteSpace: 'pre-line' }}>
                {s.confirm.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => resolveConfirm(false)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.12)', background: '#fff', color: '#2c2c2a', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {s.confirm.cancelLabel}
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: s.confirm.destructive ? '#b5462f' : '#7a6ff0', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {s.confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
