/**
 * PremiumGate.jsx
 * src/features/monetization/PremiumGate.jsx
 *
 * Wraps premium-only content with an upgrade gate.
 * Free users see a feature preview + upgrade CTA.
 * Premium users see the full content.
 */

import React, { useState } from 'react'
import { toast } from '../../app/ui/dialog'
import ReactDOM from 'react-dom'

// ── Stripe checkout URLs (Payment Links) ─────────────────────────────────────
// Set per environment via Vite env vars so test/live is a config change, not a
// code edit. Local: .env.local · Production: Vercel → Settings → Environment
// Variables. Payment Link URLs are not secret, so VITE_ exposure is fine.
//   VITE_STRIPE_MONTHLY_URL=https://buy.stripe.com/test_...   (monthly $9.99)
//   VITE_STRIPE_ANNUAL_URL=https://buy.stripe.com/test_...    (annual $79)
const STRIPE_MONTHLY_URL = import.meta.env.VITE_STRIPE_MONTHLY_URL || ''
const STRIPE_ANNUAL_URL  = import.meta.env.VITE_STRIPE_ANNUAL_URL || ''

// ── Feature definitions for each gated section ───────────────────────────────
const GATE_CONTENT = {
  insights: {
    icon: '◈',
    title: 'Weekly Intelligence',
    headline: 'See what your behavioral data is telling you',
    features: [
      'Weekly coherence report with pattern detection',
      'Predictive intelligence — what happens next',
      'Behavioral risk alerts before they compound',
      'Tomorrow forecast with evidence-based trajectory',
    ],
    preview: 'Your system detected 3 behavioral patterns this week. Morning is your strongest window at 90% completion...',
  },
  analytics: {
    icon: '◈',
    title: 'Analytics Intelligence',
    headline: 'Four questions answered from your behavioral data',
    features: [
      'What helps you most — intervention ROI ranked by impact',
      'What hurts you most — failure pattern detection',
      'What creates momentum — success chain analysis',
      'What happens next — causal trajectory prediction',
    ],
    preview: 'Breathwork shows strong same-day correlation. Morning completion predicts full-day alignment 94% of the time...',
  },
  signature: {
    icon: '✦',
    title: 'Coherence Signature',
    headline: 'Your behavioral identity generated from real data',
    features: [
      'Alignment type — who you are behaviorally, not who you think you are',
      'Behavioral laws — automatically detected patterns with strength scores',
      'Optimal correction order — the sequence that works best for your system',
      'Adaptive style — how your system responds to pressure and momentum',
    ],
    preview: 'Alignment type: Morning-anchored stabilizer. Behavioral law detected: When Morning completes fully, full-day alignment follows 94% of the time...',
  },
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

function UpgradeModal({ onClose, session }) {
  const [billing, setBilling] = useState('annual')

  const handleUpgrade = () => {
    const base = billing === 'annual' ? STRIPE_ANNUAL_URL : STRIPE_MONTHLY_URL
    const uid = session?.user?.id
    const email = session?.user?.email

    if (!base) {
      console.error('Stripe checkout URL is not configured (VITE_STRIPE_*_URL).')
      toast('Checkout is temporarily unavailable. Please try again later.', { type: 'error' })
      return
    }

    // The webhook maps the payment back to a user via client_reference_id.
    // Without it, checkout.session.completed cannot be attributed and premium
    // is never granted — so never open an unattributable checkout.
    if (!uid) {
      toast('Please sign in before upgrading.', { type: 'error' })
      onClose?.()
      return
    }

    const params = new URLSearchParams({ client_reference_id: uid })
    if (email) params.set('prefilled_email', email)
    window.open(`${base}?${params.toString()}`, '_blank')

    // Tell useSubscription to start polling — the webhook grants premium a beat
    // later, so this lets the gate unlock without a manual page reload.
    window.dispatchEvent(new Event('quintave:checkout-started'))
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a18 0%, #2a2822 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 24px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#7F77DD', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                ✦ Quintave Intelligence
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 6 }}>
                Unlock the full system
              </div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                The AI adapts to your behavioral patterns — Intelligence shows you what it's learning.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', padding: '0 0 0 12px', flexShrink: 0 }}
            >✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {/* Billing toggle */}
          <div style={{
            display: 'flex',
            background: '#F4F3F0',
            borderRadius: 10,
            padding: 3,
            marginBottom: 20,
            gap: 3,
          }}>
            {[
              { key: 'monthly', label: 'Monthly', price: '$9.99/mo' },
              { key: 'annual',  label: 'Annual',  price: '$79/yr', badge: 'Save 34%' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setBilling(opt.key)}
                style={{
                  flex: 1,
                  padding: '9px 8px',
                  borderRadius: 8,
                  border: 'none',
                  background: billing === opt.key ? '#fff' : 'transparent',
                  boxShadow: billing === opt.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1a1a18' }}>{opt.label}</span>
                <span style={{ fontSize: 11, color: '#555' }}>{opt.price}</span>
                {opt.badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: '#1D9E75',
                    background: '#E1F5EE', borderRadius: 99, padding: '1px 6px',
                  }}>{opt.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Features */}
          <div style={{ marginBottom: 20 }}>
            {[
              { icon: '◈', label: 'Weekly Intelligence Report', desc: 'Pattern detection, predictions, risk alerts' },
              { icon: '◈', label: 'Analytics Intelligence', desc: 'What helps, hurts, and creates momentum' },
              { icon: '✦', label: 'Coherence Signature', desc: 'Your behavioral identity and correction order' },
              { icon: '◈', label: 'Causal Narrative Coach', desc: 'Why the plan looks the way it does' },
              { icon: '↑', label: 'Adaptive Engine', desc: 'Plan restructures based on your behavior' },
              { icon: '☁', label: 'Multi-device sync', desc: 'Your data on every device' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                marginBottom: 12,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#F3F1FF', color: '#7F77DD',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, flexShrink: 0,
                }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #3C3489, #7F77DD)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            {billing === 'annual'
              ? 'Start Intelligence — $79/year'
              : 'Start Intelligence — $9.99/month'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
            Cancel anytime · Secure payment via Stripe<br/>
            Free tier remains fully accessible after cancellation
          </div>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

// ── Premium Gate wrapper ───────────────────────────────────────────────────────

export default function PremiumGate({ feature, isPremium, session, onShowAuth, children }) {
  const [showUpgrade, setShowUpgrade] = useState(false)

  // Premium user — show content
  if (isPremium) return children

  const gate = GATE_CONTENT[feature] || GATE_CONTENT.insights

  return (
    <>
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
      }}>
        {/* Preview header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a18 0%, #2a2822 100%)',
          padding: '20px 20px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18, color: '#7F77DD' }}>{gate.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{gate.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#7F77DD',
              background: '#7F77DD20', border: '0.5px solid #7F77DD40',
              borderRadius: 99, padding: '2px 7px', textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>Premium</span>
          </div>
          <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>
            {gate.headline}
          </div>
        </div>

        {/* Blurred preview */}
        <div style={{
          padding: '14px 16px',
          background: '#F8F7F4',
          borderBottom: '0.5px solid rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 12, color: '#555', lineHeight: 1.6,
            filter: 'blur(3px)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            {gate.preview}
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 0%, #F8F7F4 70%)',
          }} />
        </div>

        {/* Feature list */}
        <div style={{ padding: '16px 16px 8px' }}>
          {gate.features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8,
            }}>
              <span style={{ color: '#7F77DD', fontSize: 14, flexShrink: 0, marginTop: 1 }}>◦</span>
              <span style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '8px 16px 20px' }}>
          {!session ? (
            <>
              <button
                onClick={onShowAuth}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3C3489, #7F77DD)',
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', marginBottom: 8,
                }}
              >
                Sign in to unlock Intelligence
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa' }}>
                Free tier · No credit card required to start
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowUpgrade(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3C3489, #7F77DD)',
                  color: '#fff', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', marginBottom: 8,
                }}
              >
                Unlock Intelligence — from $6.58/mo
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa' }}>
                7-day free trial · Cancel anytime
              </div>
            </>
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal session={session} onClose={() => setShowUpgrade(false)} />}
    </>
  )
}
