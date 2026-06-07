/**
 * useSubscription.js
 * src/app/hooks/useSubscription.js
 *
 * Reads subscription status from the server-only `subscriptions` table.
 *
 * SECURITY: entitlements are NEVER writable from the client. The `subscriptions`
 * table has RLS that allows the owner to SELECT their row only — there is no
 * write policy for the authenticated/anon roles. Only the Stripe webhook
 * (service-role key) writes it. The old client-side `grantPremium` helper has
 * been removed for this reason; do not re-add it.
 *
 * BETA_FREE_PREMIUM is a BUILD-TIME global override (not user-controllable).
 * Leave it false in production.
 */

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    let cancelled = false

    // Build-time beta override — everyone is premium.
    if (BETA_FREE_PREMIUM) {
      setIsPremium(true)
      setTier('premium')
      setIsLoading(false)
      return
    }

    if (!session?.user?.id || !supabase) {
      setIsPremium(false)
      setTier('free')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    supabase
      .from('subscriptions')
      .select('tier,status')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // On any error, default to free — never accidentally grant premium.
          setTier('free')
          setIsPremium(false)
          return
        }
        const { tier, isPremium } = deriveAccess(data)
        setTier(tier)
        setIsPremium(isPremium)
      })
      .catch(() => {
        if (cancelled) return
        setTier('free')
        setIsPremium(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [session?.user?.id])

  return { isPremium, isLoading, tier }
}

// NOTE: `grantPremium` was intentionally removed. Entitlements are granted only
// by the Stripe webhook (service-role) writing to the `subscriptions` table.
