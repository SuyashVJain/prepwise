'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/authErrors'
import AuthShell, { fieldInput, fieldLabel, submitButton } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    // The same message is shown whether or not the address has an account, so it cannot be probed.
    if (error && !error.message.toLowerCase().includes('not found')) setError(friendlyAuthError(error.message).text)
    else setSent(true)
  }

  return (
    <AuthShell eyebrow="[ACCOUNT]" title="Reset your password">
      {sent ? (
        <p role="status" style={{ fontSize: '16px', color: 'var(--text)', lineHeight: 1.7, marginBottom: 'var(--space-4)' }}>
          If an account exists for {email}, a reset link is on its way. Open it on this device. It can take a few minutes to arrive, so check your spam folder too.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="email" style={fieldLabel}>EMAIL ADDRESS</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={fieldInput} />
          </div>
          {error && <p role="alert" style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>}
          <button type="submit" disabled={loading} style={submitButton}>{loading ? 'SENDING...' : 'SEND RESET LINK →'}</button>
        </form>
      )}
      <p style={{ marginTop: 'var(--space-4)', fontSize: '14px', color: 'var(--text-2)' }}>
        <Link href="/login" style={{ color: 'var(--lime)' }}>← Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
