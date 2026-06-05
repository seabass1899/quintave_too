/**
 * useSubscription.js
 * src/app/hooks/useSubscription.js
 *
 * Reads subscription status from Supabase user_state.
 * Returns isPremium flag and upgrade helper.
 *
 * During beta: all users get premium access (isPremium = true).
 * Flip BETA_FREE_PREMIUM to false when ready to enforce the gate.
 */

import { useState, useEffect } from 'react'
import { supabase, loadCloudState } from '../supabaseClient'

// ── Set to false when ready to enforce premium gate ──────────────────────────
const BETA_FREE_PREMIUM = true

export function useSubscription(session) {
  const [isPremium,  setIsPremium]  = useState(BETA_FREE_PREMIUM)
  const [isLoading,  setIsLoading]  = useState(false)
  const [tier,       setTier]       = useState(BETA_FREE_PREMIUM ? 'premium' : 'free')

  useEffect(() => {
    // During beta — everyone is premium
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
    loadCloudState(session.user.id)
      .then(data => {
        const sub = data?.subscription || 'free'
        setTier(sub)
        setIsPremium(sub === 'premium' || sub === 'trial')
      })
      .catch(() => {
        // On error default to free — never accidentally grant premium
        setTier('free')
        setIsPremium(false)
      })
      .finally(() => setIsLoading(false))
  }, [session?.user?.id])

  return { isPremium, isLoading, tier }
}

/**
 * Grant premium access to a user — called after successful payment.
 * In production this should be handled server-side via Stripe webhook.
 */
export async function grantPremium(userId) {
  if (!supabase || !userId) return { error: 'No connection' }
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, subscription: 'premium' }, { onConflict: 'user_id' })
  return { error }
}
