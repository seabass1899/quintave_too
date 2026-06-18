// ─── useCloudSync ─────────────────────────────────────────────────────────────
// Owns authentication state and cloud sync/restore. Extracted from App.jsx to
// isolate the logic that has historically been a regression source (magic-link
// restore, premium-reset on load races, the auth-token wedge).
//
// Behavior is intentionally identical to the prior inline implementation:
//   • Resolves the session on mount (with a 6s watchdog that unblocks the UI
//     without clearing a merely-slow session).
//   • Subscribes to auth state changes; only clears session on explicit SIGNED_OUT.
//   • On a fresh tab with a session but no local onboarding, restores from cloud.
//   • On SIGNED_IN with local data, syncs local → cloud.
//   • Exposes a debounced scheduleSync() for the app to call after local writes.
//
// The hook takes the App's state setters so cloud data flows straight into the
// existing React state (no page reload needed).

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase, getSession } from '../supabaseClient'
import { silentSync, loadCloudState, applyCloudStateToLocal, syncLocalStateToCloud } from '../services/syncService'

function hasLocalOnboarding() {
  try {
    const o = JSON.parse(localStorage.getItem('q_onboarding') || 'null')
    return !!(o?.completedAt && o?.scores && Object.keys(o.scores).length > 0)
  } catch { return false }
}

export function useCloudSync({ setChecked, setDayStatus, setOnboardingProfile, setShowAuth }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [cloudRestoring, setCloudRestoring] = useState(false)

  // ── Cloud restore — fresh-device auto-restore path (no local data to overwrite).
  // Directly updates React state so the UI re-renders without a page reload.
  const restoreFromCloud = useCallback(async (userId) => {
    if (!userId || !supabase) return
    try {
      setCloudRestoring(true)
      const cloudData = await loadCloudState(userId)
      if (cloudData) {
        applyCloudStateToLocal(cloudData, true)
        if (cloudData.onboarding?.completedAt) setOnboardingProfile(cloudData.onboarding)
        if (cloudData.checked && Object.keys(cloudData.checked).length > 0) setChecked(cloudData.checked)
        if (cloudData.day_status && Object.keys(cloudData.day_status).length > 0) setDayStatus(cloudData.day_status)
      }
    } catch (e) {
      console.warn('Cloud restore failed:', e)
    } finally {
      setCloudRestoring(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced sync — coalesces rapid local writes into one cloud write,
  // avoiding row-lock queuing and the "taking too long" watchdog.
  const syncDebounceTimer = useRef(null)
  const scheduleSync = useCallback(() => {
    if (!session?.user?.id) return
    clearTimeout(syncDebounceTimer.current)
    syncDebounceTimer.current = setTimeout(() => {
      silentSync(session.user.id)
    }, 1500)
  }, [session?.user?.id])
  useEffect(() => () => clearTimeout(syncDebounceTimer.current), [])

  // ── Auth resolution + subscription ──────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    // Watchdog: if session resolution hangs for 6s, unblock the UI. Do NOT clear
    // the session here — a slow load is not a sign-out.
    const authTimeout = setTimeout(() => {
      if (mounted && !authReady) setAuthReady(true)
    }, 6000)

    getSession()
      .then(async (currentSession) => {
        clearTimeout(authTimeout)
        if (!mounted) return
        setSession(currentSession)
        if (currentSession?.user?.id && !hasLocalOnboarding()) {
          await restoreFromCloud(currentSession.user.id)
        }
        if (mounted) setAuthReady(true)
      })
      .catch(() => {
        clearTimeout(authTimeout)
        if (!mounted) return
        setSession(null)
        setAuthReady(true)
      })

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return

      // Only clear on an explicit sign-out. Other events (INITIAL_SESSION,
      // TOKEN_REFRESHED, etc.) can arrive with a null session during load races;
      // blindly clearing here wiped valid sessions and reset premium to free.
      if (_event === 'SIGNED_OUT') {
        setSession(null)
        return
      }

      if (nextSession) {
        setSession(nextSession)
        setShowAuth?.(false)
      }

      // Magic link / OTP on a fresh tab fires SIGNED_IN — restore cloud data.
      if (_event === 'SIGNED_IN' && nextSession?.user?.id && !hasLocalOnboarding()) {
        await restoreFromCloud(nextSession.user.id)
      }

      // SIGNED_IN with existing local data — push local → cloud.
      if (_event === 'SIGNED_IN' && nextSession?.user?.id && hasLocalOnboarding()) {
        try { await syncLocalStateToCloud(nextSession.user.id) } catch {}
      }

      if (mounted && !authReady) setAuthReady(true)
    })

    return () => {
      mounted = false
      data?.subscription?.unsubscribe?.()
    }
  }, [restoreFromCloud]) // eslint-disable-line react-hooks/exhaustive-deps

  return { session, authReady, cloudRestoring, scheduleSync, restoreFromCloud }
}
