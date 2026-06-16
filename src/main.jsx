import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'

const CURRENT_VERSION = '2.0'
const storedVersion = localStorage.getItem('q_version')
if (storedVersion !== CURRENT_VERSION) {
  const keysToCheck = ['q_checked','q_onboarding','q_notes','q_ratings','q_metrics','q_directive','q_exec','q_evening','q_week','q_weekadj','q_triggers','q_milestones','q_notifs','q_weekly_review','q_active_program','q_program_history','q_noise_audits','q_onboarding_history']
  keysToCheck.forEach(key => {
    try { const val = localStorage.getItem(key); if (val) JSON.parse(val) } catch(e) { localStorage.removeItem(key) }
  })
  localStorage.setItem('q_version', CURRENT_VERSION)
}

/**
 * C3: Non-destructive "clear data".
 *
 * The old handler did localStorage.clear() — wiping EVERYTHING on the origin,
 * including the Supabase auth session token, with no recovery. Combined with a
 * partial cloud backup that previously dropped many keys, a user who tapped it
 * could permanently lose data AND get logged out.
 *
 * This version:
 *  1. Attempts a final cloud sync first (best-effort) so nothing is lost.
 *  2. Clears only Quintave's own `q_` keys — NOT the whole origin — so the
 *     Supabase session (sb-*) survives and the user stays signed in.
 *  3. After reload, the app can re-restore from cloud for a signed-in user.
 */
async function clearLocalDataSafely() {
  // 1) Best-effort final sync so we don't discard unsynced progress.
  try {
    const { getSession } = await import('./app/supabaseClient')
    const { syncLocalStateToCloud } = await import('./app/services/syncService')
    const session = await getSession()
    if (session?.user?.id) {
      await syncLocalStateToCloud(session.user.id)
    }
  } catch (e) {
    // If sync fails (offline, signed out), we still proceed with the clear —
    // but only after the user confirmed, and we only clear q_ keys.
    console.warn('Final sync before clear failed (continuing):', e)
  }

  // 2) Clear ONLY Quintave keys; leave sb-* auth + anything else intact.
  try {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('q_')) toRemove.push(k)
    }
    toRemove.forEach(k => { try { localStorage.removeItem(k) } catch {} })
  } catch (e) {
    console.warn('Clear failed:', e)
  }

  // 3) Reload — signed-in users will re-restore from cloud.
  window.location.reload()
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, stack: '', clearing: false } }
  static getDerivedStateFromError(error) { return { error: error.toString(), stack: error.stack || '' } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }

  handleClear = () => {
    const ok = window.confirm(
      "This will clear Quintave's data on THIS device and reload.\n\n" +
      "If you're signed in, your progress will be synced to the cloud first and " +
      "restored after reload. If you're NOT signed in, any unsynced data on this " +
      "device will be lost.\n\nContinue?"
    )
    if (!ok) return
    this.setState({ clearing: true })
    clearLocalDataSafely()
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quintave</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
            Something went wrong. Try reloading first — your data stays intact.
          </div>
          <div style={{ fontSize: 10, color: '#ccc', marginBottom: 20, wordBreak: 'break-all', padding: '8px 12px', background: '#f7f6f3', borderRadius: 8, textAlign: 'left' }}>
            {this.state.error}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()}
              style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
              Reload
            </button>
            <button onClick={this.handleClear} disabled={this.state.clearing}
              style={{ padding: '12px 28px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1a1a18', fontSize: 14, cursor: this.state.clearing ? 'default' : 'pointer' }}>
              {this.state.clearing ? 'Clearing…' : 'Clear local data'}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
