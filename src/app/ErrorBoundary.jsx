import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Quintave runtime error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F7F6F3', color: '#1a1a18', fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 520, background: '#fff', borderRadius: 20, padding: 28, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Quintave recovered from an error</h1>
          <p style={{ color: '#5F5E5A', lineHeight: 1.6 }}>Something in the local app state or data shape caused a render failure. Reload the app or clear local data if the issue persists.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#F7F6F3', padding: 12, borderRadius: 10, fontSize: 12, color: '#8A2D2D' }}>{String(this.state.error?.message || this.state.error)}</pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', borderRadius: 10, border: 0, background: '#1a1a18', color: '#fff', cursor: 'pointer' }}>Reload</button>
            <button onClick={() => { window.localStorage.clear(); window.location.reload() }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', cursor: 'pointer' }}>Clear local data</button>
          </div>
        </div>
      </div>
    )
  }
}
