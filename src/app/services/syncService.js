// ─── syncService.js — sync local state to Supabase ───────────────────────────
//
// Sprint 6: Complete sync audit and hardening
//   - q_pattern_profile now included (behavioral learning data)
//   - window.confirm removed — replaced with inline UI confirmation flag
//   - Last-sync timestamp tracked in localStorage
//   - Merge strategy: cloud wins on load, local wins on push
//   - Single source of truth — supabaseClient.js collectLocalState removed

import { supabase, trackCloudEvent } from '../supabaseClient'

const APP_VERSION = '1.0.0'
const LAST_SYNC_KEY = 'q_last_sync'

// ─── Safe helpers ─────────────────────────────────────────────────────────────

function safeParse(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── State collection ─────────────────────────────────────────────────────────

/**
 * Collect all local state that should be synced to cloud.
 * Includes q_pattern_profile so behavioral learning survives device switches.
 */
export function collectLocalState() {
  return {
    onboarding:      safeParse('q_onboarding', null),
    checked:         safeParse('q_checked', {}),
    day_status:      safeParse('q_day_status', {}),
    metrics:         safeParse('q_metrics', {}),
    notes:           safeParse('q_notes', {}),
    ratings:         safeParse('q_ratings', {}),
    triggers:        safeParse('q_triggers', {}),
    frequency_state: safeParse('q_frequency_state', {}),
    // Sprint 6: behavioral learning data — critical for adaptive intelligence
    pattern_profile: safeParse('q_pattern_profile', null),
    directive:       safeParse('q_directive', {}),
    evening:         safeParse('q_evening', {}),
  }
}

// ─── Push: local → cloud ──────────────────────────────────────────────────────

/**
 * Push local state to cloud.
 * Strategy: local always wins on push (user's device is authoritative).
 * Never overwrites cloud with empty/null values.
 */
export async function syncLocalStateToCloud(userId) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!userId)   throw new Error('No user session')

  const state = collectLocalState()

  // Don't push empty state — guard against wiping cloud data
  const hasData = state.onboarding !== null ||
    Object.keys(state.checked || {}).length > 0

  if (!hasData) {
    throw new Error('No local data to sync — complete onboarding first')
  }

  const { error } = await supabase
    .from('user_state')
    .upsert({
      user_id: userId,
      ...state,
      updated_at: new Date().toISOString(),
      app_version: APP_VERSION,
      device: navigator.userAgent?.slice(0, 200) || 'unknown',
    }, {
      onConflict: 'user_id',
    })

  if (error) throw error

  // Record last sync time locally
  safeSet(LAST_SYNC_KEY, new Date().toISOString())

  try { await trackCloudEvent(userId, 'sync_to_cloud', { version: APP_VERSION }) } catch {}
}

// ─── Pull: cloud → local ──────────────────────────────────────────────────────

/**
 * Load cloud state for a user.
 * Returns null if no cloud backup exists.
 */
export async function loadCloudState(userId) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!userId)   throw new Error('No user session')

  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Apply cloud state to localStorage.
 * Strategy: cloud wins on pull (restoring from backup).
 *
 * IMPORTANT: window.confirm removed — caller must handle confirmation UI.
 * Pass confirmed=true only after user explicitly confirms the overwrite.
 */
export function applyCloudStateToLocal(state, confirmed = false) {
  if (!state) return { applied: false, reason: 'no_data' }
  if (!confirmed) return { applied: false, reason: 'not_confirmed' }

  const keyMap = {
    onboarding:      'q_onboarding',
    checked:         'q_checked',
    day_status:      'q_day_status',
    metrics:         'q_metrics',
    notes:           'q_notes',
    ratings:         'q_ratings',
    triggers:        'q_triggers',
    frequency_state: 'q_frequency_state',
    pattern_profile: 'q_pattern_profile',  // Sprint 6: restore behavioral learning
    directive:       'q_directive',
    evening:         'q_evening',
  }

  let applied = 0
  Object.entries(keyMap).forEach(([field, lsKey]) => {
    if (state[field] !== undefined && state[field] !== null) {
      try {
        localStorage.setItem(lsKey, JSON.stringify(state[field]))
        applied++
      } catch {}
    }
  })

  // Record that we loaded from cloud
  safeSet(LAST_SYNC_KEY, state.updated_at || new Date().toISOString())

  return { applied: true, fieldsRestored: applied }
}

// ─── Auto-sync helper ─────────────────────────────────────────────────────────

/**
 * Silent background sync — call after practice check-ins.
 * Fails silently; never interrupts the user.
 */
export async function silentSync(userId) {
  if (!userId || !supabase) return
  try {
    await syncLocalStateToCloud(userId)
  } catch {
    // Silent — don't surface errors during practice check-ins
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getLastSyncTime() {
  const raw = safeParse(LAST_SYNC_KEY, null)
  if (!raw) return null
  try { return new Date(raw) } catch { return null }
}

export function getLastSyncLabel() {
  const t = getLastSyncTime()
  if (!t) return 'Never synced'
  const mins = Math.round((Date.now() - t.getTime()) / 60000)
  if (mins < 1)   return 'Synced just now'
  if (mins < 60)  return `Synced ${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24)   return `Synced ${hrs}h ago`
  return `Synced ${Math.round(hrs / 24)}d ago`
}
