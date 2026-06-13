// ─── supabaseClient.js — Supabase client instance ────────────────────────────
// Import from here in any file that needs Supabase access.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // OTP-code sign-in does not rely on a URL token, so URL detection is
          // off — leaving it on (with implicit flow) was causing the client to
          // queue queries behind an internal auth/session step and hang.
          detectSessionInUrl: false,
        },
        // We don't use Supabase Realtime. Disabling it removes a websocket the
        // client otherwise keeps alive, which can interfere with request flow.
        realtime: { params: { eventsPerSecond: 0 } },
        global: { headers: { 'x-client-info': 'quintave-web' } },
      })
    : null

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Send a 6-digit sign-in code (and/or magic link) to the user's email.
 * The user types the code back into the app in the SAME browser/tab, which
 * sidesteps the cross-browser problem magic links have.
 */
export async function sendSignInCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  })
  return { error }
}

/**
 * Verify the 6-digit code the user typed. On success this establishes the
 * session in THIS browser immediately — no redirect, no cross-browser issue.
 */
export async function verifySignInCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: token.trim(),
    type: 'email',
  })
  return { data, error }
}

// Back-compat alias so existing imports of signInWithMagicLink keep working.
export const signInWithMagicLink = sendSignInCode

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── State sync helpers ────────────────────────────────────────────────────────

export function collectLocalState() {
  const keys = {
    onboarding:       'q_onboarding',
    checked:          'q_checked',
    notes:            'q_notes',
    ratings:          'q_ratings',
    metrics:          'q_metrics',
    triggers:         'q_triggers',
    day_status:       'q_day_status',
    frequency_state:  'q_frequency_state',
    practice_ratings: 'q_practice_ratings',
    pattern_profile:  'q_pattern_profile',
  }
  const state = {}
  Object.entries(keys).forEach(([field, lsKey]) => {
    try {
      const val = localStorage.getItem(lsKey)
      if (val) state[field] = JSON.parse(val)
    } catch {}
  })
  return state
}

export async function syncLocalStateToCloud(userId) {
  const state = collectLocalState()
  const { error } = await supabase
    .from('user_state')
    .upsert({
      user_id: userId,
      ...state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function loadCloudState(userId) {
  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export function applyCloudStateToLocal(state) {
  if (!state) return
  const keyMap = {
    onboarding:       'q_onboarding',
    checked:          'q_checked',
    notes:            'q_notes',
    ratings:          'q_ratings',
    metrics:          'q_metrics',
    triggers:         'q_triggers',
    day_status:       'q_day_status',
    frequency_state:  'q_frequency_state',
    practice_ratings: 'q_practice_ratings',
    pattern_profile:  'q_pattern_profile',
  }
  Object.entries(keyMap).forEach(([field, lsKey]) => {
    if (state[field] !== undefined) {
      try { localStorage.setItem(lsKey, JSON.stringify(state[field])) } catch {}
    }
  })
}

export async function saveFeedback(userId, message, context = {}) {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId, message, context,
  })
  if (error) throw error
}

export async function trackCloudEvent(userId, eventName, payload = {}) {
  if (!userId) return
  try {
    await supabase.from('user_events').insert({
      user_id: userId, event_name: eventName, payload,
    })
  } catch {}
}
