// Sign-in page.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/GoogleButton'
import { friendlyAuthError } from '@/lib/authErrors'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const f = friendlyAuthError(error.message)
      setError(f.text)
      setUnconfirmed(!!f.unconfirmed)
      setLoading(false)
    }
    else router.push('/dashboard')
  }

  async function resendConfirmation() {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setError(friendlyAuthError(error.message).text)
    else setResent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', ...grotesk }}>

      <div className="auth-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Link href="/" aria-label="Prepwise home" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '32px' }}><Logo size="md" /></Link>

          <h1 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.1, color: 'var(--text)', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-2)', marginBottom: '32px' }}>Pick up where you left off.</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <label htmlFor="login-email" className="auth-label">Email address</label>
              <input id="login-email" className="auth-field" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="login-password" className="auth-label">Password</label>
              <input id="login-password" className="auth-field" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <Link href="/forgot-password" className="tap" style={{ fontSize: '14px', color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Forgot password?</Link>
              </div>
            </div>
            {error && (
              <div role="alert">
                <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.5 }}>{error}</p>
                {unconfirmed && (resent
                  ? <p style={{ fontSize: '14px', color: 'var(--lime)', marginTop: '8px' }}>Confirmation email sent again. Check your inbox.</p>
                  : <button type="button" onClick={resendConfirmation} style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 14px', marginTop: '8px', minHeight: '40px' }}>RESEND CONFIRMATION EMAIL</button>)}
              </div>
            )}
            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>
          <GoogleButton />

          <p className="auth-small" style={{ textAlign: 'center', marginTop: '32px' }}>
            New to Prepwise? <Link href="/signup">Create an account →</Link>
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>© 2026 Prepwise</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([href, l]) => (
            <Link key={href} href={href} className="tap" style={{ fontSize: '13px', color: 'var(--text-2)' }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
