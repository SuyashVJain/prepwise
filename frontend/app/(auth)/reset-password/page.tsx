'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/authErrors'
import AuthShell, { fieldInput, fieldLabel, submitButton } from '@/components/AuthShell'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  // The reset link signs the student in for this one step. Without that session the link is stale.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setHasSession(!!data.user))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== confirm) { setError('The two passwords do not match.'); return }
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(friendlyAuthError(error.message).text); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  return (
    <AuthShell eyebrow="[ACCOUNT]" title="Choose a new password">
      {hasSession === null ? (
        <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Checking your link...</p>
      ) : !hasSession ? (
        <p role="alert" style={{ fontSize: '16px', color: 'var(--text)', lineHeight: 1.7 }}>
          This reset link is not valid any more. <Link href="/forgot-password" style={{ color: 'var(--lime)' }}>Request a new one</Link>.
        </p>
      ) : done ? (
        <p role="status" style={{ fontSize: '16px', color: 'var(--lime)' }}>Password updated. Taking you to your dashboard...</p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label htmlFor="password" style={fieldLabel}>NEW PASSWORD</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={fieldInput} />
          </div>
          <div>
            <label htmlFor="confirm" style={fieldLabel}>CONFIRM PASSWORD</label>
            <input id="confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} style={fieldInput} />
          </div>
          {error && <p role="alert" style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>}
          <button type="submit" disabled={loading} style={submitButton}>{loading ? 'SAVING...' : 'SAVE PASSWORD →'}</button>
        </form>
      )}
    </AuthShell>
  )
}
