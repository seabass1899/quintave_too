/**
 * useSubscription.js  (TEMPORARY DEBUG BUILD)
 * src/app/hooks/useSubscription.js
 *
 * Same logic as before, plus console.log instrumentation so we can see at
 * runtime: when the fetch runs, what userId it sees, and what the query returns.
 * Remove the [SUB] logs once the issue is found.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

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

  const isPremiumRef = useRef(isPremium)
  isPremiumRef.current = isPremium
  const pollingRef = useRef(false)

  const fetchSub = useCallback(async () => {
    console.log('[SUB] fetchSub called. userId =', userId, '| supabase =', !!supabase)
    if (BETA_FREE_PREMIUM) { setIsPremium(true); setTier('premium'); return true }
    if (!userId || !supabase) {
      console.log('[SUB] no userId or no supabase → setting free')
      setIsPremium(false); setTier('free'); return false
    }
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier,status')
        .eq('user_id', userId)
        .maybeSingle()
      console.log('[SUB] query result → data:', data, '| error:', error)
      if (error) {
        console.log('[SUB] query error → setting free:', error.message)
        setTier('free'); setIsPremium(false); return false
      }
      const d = deriveAccess(data)
      console.log('[SUB] derived →', d)
      setTier(d.tier); setIsPremium(d.isPremium)
      return d.isPremium
    } catch (e) {
      console.log('[SUB] exception → setting free:', e?.message)
      setTier('free'); setIsPremium(false); return false
    }
  }, [userId])

  useEffect(() => {
    if (BETA_FREE_PREMIUM) { setIsLoading(false); return }
    let cancelled = false
    console.log('[SUB] initial-load effect. userId =', userId)
    setIsLoading(true)
    fetchSub().finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [fetchSub])

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

  useEffect(() => {
    if (BETA_FREE_PREMIUM || !userId) return
    const onReturn = () => {
      if (document.visibilityState === 'visible') poll(4, 2000)
    }
    const onCheckoutStarted = () => poll(24, 2500)
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    window.addEventListener('quintave:checkout-started', onCheckoutStarted)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('quintave:checkout-started', onCheckoutStarted)
    }
  }, [userId, poll])

  // Expose for manual console testing: window.__checkSub()
  useEffect(() => {
    window.__checkSub = fetchSub
    window.__subState = () => ({ isPremium: isPremiumRef.current, userId })
  }, [fetchSub, userId])

  return { isPremium, isLoading, tier, refresh: fetchSub }
}
