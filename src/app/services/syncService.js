// ─── syncService.js — SINGLE source of truth for cloud sync ──────────────────
//
// C1 fix: this is now the ONLY sync implementation. The duplicate functions in
// supabaseClient.js have been removed; App.jsx imports everything from here.
//
// C2 fix: every durable localStorage key is synced. Keys that have their own
// column in `user_state` are written there (backward-compatible); everything
// else is bundled into the `extras` jsonb column so no future schema change is
// needed when a new key is added.
//
// Strategy: local wins on push (the user's device is authoritative); cloud wins
// on pull (explicit restore). Empty state is never pushed (guards against wipes).

import { supabase, trackCloudEvent } from '../supabaseClient'
import { pruneByRecentDays } from '../../features/today/todayEngine'

const APP_VERSION = '1.1.0'
const LAST_SYNC_KEY = 'q_last_sync'

// Keys that map to dedicated columns on user_state (must exist in the table).
// field name (column) -> localStorage key
const COLUMN_KEYS = {
  onboarding:      'q_onboarding',
  checked:         'q_checked',
  day_status:      'q_day_status',
  metrics:         'q_metrics',
  notes:           'q_notes',
  ratings:         'q_ratings',
  triggers:        'q_triggers',
  frequency_state: 'q_frequency_state',
  pattern_profile: 'q_pattern_profile',
  directive:       'q_directive',
  evening:         'q_evening',
}

// All OTHER durable keys — bundled into the `extras` jsonb column.
// (Previously these were synced by NEITHER engine → lost on device switch.)
const EXTRA_KEYS = [
  'q_practice_ratings',
  'q_exec',
  'q_weekadj',
  'q_week',
  'q_milestones',
  'q_weekly_review',
  'q_active_program',
  'q_program_history',
  'q_noise_audits',
  'q_today_plan',
  'q_onboarding_history',
  'q_midday_directive',
  'q_midday_thought',
  'q_notifs',
  'q_day',
]

// Device-local / ephemeral keys that should NOT sync (intentionally excluded):
//   q_tester_mode, q_session_id, q_version, q_last_sync, q_sync_prompt_dismissed,
//   q_ftue_complete, q_selector_seed, q_tester_diagnostics, q_last_open_date,
//   q_first_alignment_tracked_*, q_events, q_beta_feedback, q_feedback

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
 * Collect all durable local state. Column-backed keys become top-level fields;
 * everything else is gathered under `extras`.
 */
export function collectLocalState() {
  const state = {}

  // Column-backed fields
  for (const [field, lsKey] of Object.entries(COLUMN_KEYS)) {
    const raw = localStorage.getItem(lsKey)
    if (raw != null) {
      try { state[field] = JSON.parse(raw) } catch {}
    }
  }

  // Everything else → extras bundle
  const extras = {}
  for (const lsKey of EXTRA_KEYS) {
    const raw = localStorage.getItem(lsKey)
    if (raw != null) {
      try { extras[lsKey] = JSON.parse(raw) } catch {}
    }
  }
  state.extras = extras

  return state
}

// ─── Push: local → cloud ──────────────────────────────────────────────────────

export async function syncLocalStateToCloud(userId) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!userId)   throw new Error('No user session')

  const state = collectLocalState()

  // Don't push empty state — guard against wiping cloud data.
  const hasData = state.onboarding != null ||
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

  safeSet(LAST_SYNC_KEY, new Date().toISOString())
  // Fire-and-forget telemetry — must never block or hang the user's save.
  // (The Supabase client can leave this promise pending even when the HTTP write
  //  succeeds; awaiting it made a successful save appear to "time out".)
  Promise.resolve(trackCloudEvent(userId, 'sync_to_cloud', { version: APP_VERSION })).catch(() => {})
}

// ─── Pull: cloud → local ──────────────────────────────────────────────────────

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
 * Apply cloud state to localStorage. Cloud wins on pull.
 * Requires confirmed=true (caller owns the confirmation UI).
 * Restores both column-backed fields AND the extras bundle.
 */
export function applyCloudStateToLocal(state, confirmed = false) {
  if (!state) return { applied: false, reason: 'no_data' }
  if (!confirmed) return { applied: false, reason: 'not_confirmed' }

  let applied = 0

  // Column-backed fields
  for (const [field, lsKey] of Object.entries(COLUMN_KEYS)) {
    if (state[field] !== undefined && state[field] !== null) {
      try { localStorage.setItem(lsKey, JSON.stringify(state[field])); applied++ } catch {}
    }
  }

  // Extras bundle
  const extras = state.extras && typeof state.extras === 'object' ? state.extras : {}
  for (const lsKey of EXTRA_KEYS) {
    if (extras[lsKey] !== undefined && extras[lsKey] !== null) {
      try { localStorage.setItem(lsKey, JSON.stringify(extras[lsKey])); applied++ } catch {}
    }
  }

  safeSet(LAST_SYNC_KEY, state.updated_at || new Date().toISOString())
  return { applied: true, fieldsRestored: applied }
}

// ─── Auto-sync helper ─────────────────────────────────────────────────────────

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
