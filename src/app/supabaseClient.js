// ─── supabaseClient.js — Supabase client instance ────────────────────────────
// Import from here in any file that needs Supabase access.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    }
  })
  return { error }
}

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
    onboarding:      'q_onboarding',
    checked:         'q_checked',
    notes:           'q_notes',
    ratings:         'q_ratings',
    metrics:         'q_metrics',
    triggers:        'q_triggers',
    day_status:      'q_day_status',
    frequency_state: 'q_frequency_state',
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
    onboarding:      'q_onboarding',
    checked:         'q_checked',
    notes:           'q_notes',
    ratings:         'q_ratings',
    metrics:         'q_metrics',
    triggers:        'q_triggers',
    day_status:      'q_day_status',
    frequency_state: 'q_frequency_state',
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
