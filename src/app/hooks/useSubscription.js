/**
 * useSubscription.js
 * src/app/hooks/useSubscription.js
 *
 * Reads subscription status from the server-only `subscriptions` table.
 *
 * SECURITY: entitlements are NEVER writable from the client. The `subscriptions`
 * table has RLS that allows the owner to SELECT their row only — there is no
 * write policy for the authenticated/anon roles. Only the Stripe webhook
 * (service-role key) writes it. Do not re-add a client-side grant helper.
 *
 * LIVE UNLOCK: after checkout the webhook grants premium asynchronously (a beat
 * later). To avoid making the user reload, this hook re-checks:
 *   • when PremiumGate dispatches `quintave:checkout-started` (polls ~60s), and
 *   • when the user returns to the tab (short burst).
 * It also exposes refresh() for manual re-checks.
 *
 * BETA_FREE_PREMIUM is a BUILD-TIME global override (not user-controllable).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

// ── Build-time override. Keep false in production. ───────────────────────────
const BETA_FREE_PREMIUM = false

function deriveAccess(row) {
  const tier = row?.tier || 'free'
  const status = row?.status || 'active'
  const isPremium = (tier === 'premium' || tier === 'trial') && status !== 'canceled'
  return { tier, isPremium }
}

export function useSubscription(session) {
  const [isPremium, setIsPremium] = useState(BETA_FREE_PREMIUM)
  const [isLoading, setIsLoading] = useState(false)
  const [tier, setTier]           = useState(BETA_FREE_PREMIUM ? 'premium' : 'free')

  const userId = session?.user?.id

  // Refs so the polling loop can read latest state without re-subscribing.
  const isPremiumRef = useRef(isPremium)
  isPremiumRef.current = isPremium
  const pollingRef = useRef(false)

  // Single source of truth for reading entitlement. Returns the premium boolean.
  const fetchSub = useCallback(async () => {
    if (BETA_FREE_PREMIUM) { setIsPremium(true); setTier('premium'); return true }
    if (!userId || !supabase) { setIsPremium(false); setTier('free'); return false }
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier,status')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        // On any error, default to free — never accidentally grant premium.
        setTier('free'); setIsPremium(false); return false
      }
      const d = deriveAccess(data)
      setTier(d.tier); setIsPremium(d.isPremium)
      return d.isPremium
    } catch {
      setTier('free'); setIsPremium(false); return false
    }
  }, [userId])

  // Initial load.
  useEffect(() => {
    if (BETA_FREE_PREMIUM) { setIsLoading(false); return }
    let cancelled = false
    setIsLoading(true)
    fetchSub().finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [fetchSub])

  // Poll until premium or timeout. Guarded so only one loop runs at a time.
  const poll = useCallback(async (attempts, intervalMs) => {
    if (pollingRef.current || isPremiumRef.current) return
    pollingRef.current = true
    try {
      for (let i = 0; i < attempts; i++) {
        const premium = await fetchSub()
        if (premium) break
        await new Promise(r => setTimeout(r, intervalMs))
      }
    } finally {
      pollingRef.current = false
    }
  }, [fetchSub])

  // Re-check on checkout start and when the user comes back to the tab.
  useEffect(() => {
    if (BETA_FREE_PREMIUM || !userId) return

    const onReturn = () => {
      if (document.visibilityState === 'visible') poll(4, 2000)   // short burst
    }
    const onCheckoutStarted = () => poll(24, 2500)                // ~60s, webhook is async

    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    window.addEventListener('quintave:checkout-started', onCheckoutStarted)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('quintave:checkout-started', onCheckoutStarted)
    }
  }, [userId, poll])

  return { isPremium, isLoading, tier, refresh: fetchSub }
}

// NOTE: no client-side grant helper exists by design. Entitlements are granted
// only by the Stripe webhook (service-role) writing to the `subscriptions` table.
