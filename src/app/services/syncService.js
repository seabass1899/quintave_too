// ─── syncService.js — sync local state to Supabase ───────────────────────────

import { supabase, trackCloudEvent } from '../supabaseClient'

const APP_VERSION = '1.0.0'

// Safe JSON parser — never crashes on corrupted data
function safeParse(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

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
  }
}

export async function syncLocalStateToCloud(userId) {
  const state = collectLocalState()
  const { error } = await supabase
    .from('user_state')
    .upsert({
      user_id: userId,
      ...state,
      updated_at: new Date().toISOString(),
      app_version: APP_VERSION,
      device: navigator.userAgent,
    }, {
      onConflict: 'user_id',
    })
  if (error) throw error
  await trackCloudEvent(userId, 'sync_to_cloud')
}

export async function loadCloudState(userId) {
  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function applyCloudStateToLocal(state) {
  if (!state) return

  const confirmLoad = window.confirm(
    'This will overwrite your current local data with your cloud backup. Continue?'
  )
  if (!confirmLoad) return

  const keyMap = {
    onboarding:      'q_onboarding',
    checked:         'q_checked',
    day_status:      'q_day_status',
    metrics:         'q_metrics',
    notes:           'q_notes',
    ratings:         'q_ratings',
    triggers:        'q_triggers',
    frequency_state: 'q_frequency_state',
  }
  Object.entries(keyMap).forEach(([field, lsKey]) => {
    if (state[field] !== undefined && state[field] !== null) {
      try {
        localStorage.setItem(lsKey, JSON.stringify(state[field]))
      } catch {}
    }
  })
}
