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
// NOTE: cloud sync now lives ENTIRELY in src/app/services/syncService.js
// (single source of truth). The duplicate collectLocalState /
// syncLocalStateToCloud / loadCloudState / applyCloudStateToLocal that used to
// live here were removed — they wrote a different key set than syncService and
// the two engines were overwriting each other's data. Import sync functions
// from './services/syncService' instead.

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
