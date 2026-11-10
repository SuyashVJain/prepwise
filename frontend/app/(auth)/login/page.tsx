// Sign-in page.
'use client'
import { useState } from 'react'
import Link from 'next/link'
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
          <Link href="/" className="tap" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'block', marginBottom: '40px' }}>PREPWISE</Link>

          <h1 style={{ fontSize: '52px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '8px' }}>WELCOME<br />BACK</h1>
          <p style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '40px' }}>PICK UP WHERE YOU LEFT OFF.</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '16px', color: 'var(--text)', outline: 'none', letterSpacing: '.02em' }}
                onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>PASSWORD</label>
                <Link href="/forgot-password" className="tap" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>FORGOT PASSWORD?</Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '16px', color: 'var(--text)', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
            </div>
            {error && (
              <div role="alert">
                <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.5 }}>{error}</p>
                {unconfirmed && (resent
                  ? <p style={{ fontSize: '14px', color: 'var(--lime)', marginTop: '8px' }}>Confirmation email sent again. Check your inbox.</p>
                  : <button type="button" onClick={resendConfirmation} style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 14px', marginTop: '8px', minHeight: '40px' }}>RESEND CONFIRMATION EMAIL</button>)}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>
          <GoogleButton />

          <p style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', marginTop: '32px' }}>
            NEW TO PREPWISE? <Link href="/signup" style={{ color: 'var(--lime)' }}>CREATE ACCOUNT →</Link>
          </p>

          <div style={{ textAlign: 'right', marginTop: '24px', overflow: 'hidden' }}>
            <span style={{ fontSize: '80px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.04em', color: 'var(--bg4)', lineHeight: 1, userSelect: 'none' }}>LOGIN</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>©2026 PREPWISE TECHNICAL SYSTEMS.</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([href, l]) => (
            <Link key={href} href={href} className="tap" style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{l}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
