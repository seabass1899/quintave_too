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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, stack: '' } }
  static getDerivedStateFromError(error) { return { error: error.toString(), stack: error.stack || '' } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', textAlign: 'center', marginTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quintave</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
            Something went wrong. Tap below to reset and reload.
          </div>
          <div style={{ fontSize: 10, color: '#ccc', marginBottom: 20, wordBreak: 'break-all', padding: '8px 12px', background: '#f7f6f3', borderRadius: 8, textAlign: 'left' }}>
            {this.state.error}
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload() }}
            style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#1a1a18', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Reset and reload
          </button>
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
