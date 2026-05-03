const ANALYTICS_KEY = 'q_events'
const SESSION_KEY = 'q_session_id'
const LAST_OPEN_KEY = 'q_last_open_date'

export function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'session-unavailable'
  }
}

export function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]')
  } catch {
    return []
  }
}

export function writeEvents(events) {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-1000)))
  } catch {}
}

export function trackEvent(name, payload = {}) {
  if (typeof window === 'undefined') return
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    payload,
    path: window.location?.pathname || '/',
    sessionId: getSessionId(),
    ts: new Date().toISOString(),
    date: new Date().toDateString(),
  }
  const next = [...readEvents(), event]
  writeEvents(next)
  return event
}

export function trackAppOpen() {
  const today = new Date().toDateString()
  let previous = null
  try { previous = localStorage.getItem(LAST_OPEN_KEY) } catch {}
  trackEvent('app_open', { previousOpenDate: previous })

  if (previous && previous !== today) {
    const prevDate = new Date(previous)
    const now = new Date(today)
    const diffDays = Math.round((now - prevDate) / 86400000)
    if (diffDays === 1) trackEvent('return_next_day', { previousOpenDate: previous })
    else if (diffDays > 1) trackEvent('return_after_gap', { previousOpenDate: previous, gapDays: diffDays })
  }

  try { localStorage.setItem(LAST_OPEN_KEY, today) } catch {}
}

export function getAnalyticsSummary(events = readEvents()) {
  const counts = events.reduce((acc, ev) => {
    acc[ev.name] = (acc[ev.name] || 0) + 1
    return acc
  }, {})
  const uniqueSessions = new Set(events.map(e => e.sessionId)).size
  const daysSeen = new Set(events.map(e => e.date)).size
  const lastEvent = events[events.length - 1] || null
  return { counts, uniqueSessions, daysSeen, totalEvents: events.length, lastEvent }
}

export function clearAnalytics() {
  writeEvents([])
}
