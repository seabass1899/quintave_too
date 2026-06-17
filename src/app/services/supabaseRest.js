// ─── supabaseRest.js — wedge-proof Supabase access helpers ───────────────────
//
// The Supabase JS client can intermittently "wedge": it queues a query behind an
// internal auth-token refresh and never dispatches the HTTP request, so the
// promise hangs forever with zero network activity. This affects reads AND
// writes (saves hung; premium reads can hang too).
//
// These helpers make any critical query robust:
//   - withTimeout(): race the client call against a timeout
//   - readAccessTokenFromStorage(): get the JWT synchronously from localStorage
//     (cannot be wedged, unlike supabase.auth.getSession())
//   - restSelect() / restUpsert(): direct REST fetch fallback that bypasses the
//     stuck client entirely
//
// Usage pattern: try the client with withTimeout; on timeout/error, fall back to
// the REST helper. See syncService.js and useSubscription.js.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabaseClient'

// Race a promise against a timeout. Rejects with `label` if it doesn't settle.
export function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label || 'timeout')), ms)
    promise.then(
      v => { clearTimeout(t); resolve(v) },
      e => { clearTimeout(t); reject(e) },
    )
  })
}

// Read the access token straight from localStorage where supabase-js persists
// it. Synchronous and unwedgeable (unlike supabase.auth.getSession(), which
// routes through the same stuck layer). Returns null if not present.
export function readAccessTokenFromStorage() {
  try {
    const ref = (SUPABASE_URL || '').match(/https?:\/\/([^.]+)\./)?.[1]
    if (!ref) return null
    const raw = localStorage.getItem(`sb-${ref}-auth-token`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.access_token || parsed?.currentSession?.access_token || null
  } catch {
    return null
  }
}

function authHeaders() {
  const token = readAccessTokenFromStorage() || SUPABASE_ANON_KEY
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  }
}

// Direct REST SELECT. `query` is the PostgREST query string (without leading ?).
// Returns an array of rows.
export async function restSelect(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`REST select ${table} failed (${res.status}) ${text}`.trim())
  }
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

// Direct REST UPSERT (merge-duplicates on the given conflict column).
export async function restUpsert(table, row, onConflict) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`REST upsert ${table} failed (${res.status}) ${text}`.trim())
  }
}
