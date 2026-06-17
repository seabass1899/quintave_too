/**
 * AccountSettings.jsx — src/features/account/AccountSettings.jsx
 *
 * A modal with two account actions that require server-side functions:
 *   • Manage subscription → opens the Stripe Customer Portal (cancel, update card)
 *   • Delete account       → permanently deletes the user + their data
 *
 * Both call Supabase Edge Functions (delete-account, customer-portal) because
 * they need server-only keys (service role / Stripe secret).
 */

import { useState } from 'react'
import { supabase } from '../../app/supabaseClient'

const bdr = '0.5px solid rgba(0,0,0,0.1)'

export default function AccountSettings({ session, isPremium, onClose }) {
  const email = session?.user?.email || ''
  const [busy, setBusy] = useState('')        // '' | 'portal' | 'delete'
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  async function openPortal() {
    setError(''); setBusy('portal')
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { return_url: window.location.origin },
      })
      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error(data?.error || 'Could not open billing portal')
    } catch (e) {
      setError(e?.message || 'Could not open billing portal. Please try again.')
    } finally {
      setBusy('')
    }
  }

  async function deleteAccount() {
    setError(''); setBusy('delete')
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { body: {} })
      if (error) throw error
      if (data?.ok) {
        // Clear local data and sign out fully, then reload to a clean state.
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i)
            if (k && (k.startsWith('q_') || k.startsWith('sb-'))) localStorage.removeItem(k)
          }
        } catch (_) {}
        try { await supabase.auth.signOut() } catch (_) {}
        window.location.href = '/'
        return
      }
      throw new Error(data?.error || 'Deletion failed')
    } catch (e) {
      setError(e?.message || 'Account deletion failed. Please try again or contact support.')
      setBusy('')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Account</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 22, wordBreak: 'break-word' }}>{email}</div>

        {error && (
          <div style={{ fontSize: 12, color: '#A32D2D', background: '#FBEDED', border: '1px solid #E9C9C9', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Manage subscription */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Subscription</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 1.5 }}>
            {isPremium
              ? 'Manage your plan, update your payment method, or cancel anytime. Cancelling keeps access until the end of your billing period.'
              : 'You are on the free plan. If you have subscribed before, you can review past billing here.'}
          </div>
          <button
            onClick={openPortal}
            disabled={busy === 'portal'}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: bdr, background: '#fff', color: '#1a1a18', fontSize: 14, fontWeight: 500, cursor: busy === 'portal' ? 'default' : 'pointer' }}>
            {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '20px 0' }} />

        {/* Delete account */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#A32D2D' }}>Delete account</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 1.5 }}>
            Permanently deletes your account and all associated data. This cannot be undone.
            {isPremium ? ' If you have an active subscription, please cancel it first via “Manage subscription” to avoid further charges.' : ''}
          </div>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #E0B4B4', background: '#fff', color: '#A32D2D', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Delete my account
            </button>
          ) : (
            <div style={{ background: '#FBF3F3', border: '1px solid #E9C9C9', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#7a2222', marginBottom: 10, lineHeight: 1.5 }}>
                Type <strong>DELETE</strong> to confirm. This permanently removes your account and data.
              </div>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: bdr, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowDelete(false); setConfirmText(''); setError('') }}
                  disabled={busy === 'delete'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: bdr, background: '#fff', color: '#555', fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={confirmText !== 'DELETE' || busy === 'delete'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: confirmText === 'DELETE' && busy !== 'delete' ? '#A32D2D' : '#D8A0A0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: confirmText === 'DELETE' && busy !== 'delete' ? 'pointer' : 'default' }}>
                  {busy === 'delete' ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
