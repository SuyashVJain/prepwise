// prepwise/app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', ...grotesk }}>
      <div style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ ...mono, fontSize: '9px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
          AUTH.SYSTEM // V4.02 // STABLE.CONNECTION
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Link href="/" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'block', marginBottom: '40px' }}>PREPWISE</Link>

          <h1 style={{ fontSize: '52px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '8px' }}>WELCOME<br />BACK</h1>
          <p style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '40px' }}>PICK UP WHERE YOU LEFT OFF.</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '14px', color: 'var(--text)', outline: 'none', letterSpacing: '.02em' }}
                onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>PASSWORD</label>
                <span style={{ ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', cursor: 'pointer' }}>FORGOT PASSWORD?</span>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
            </div>
            {error && <p style={{ ...mono, fontSize: '10px', color: '#ef4444', letterSpacing: '.06em', textTransform: 'uppercase' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? 'SIGNING IN...' : 'SIGN IN →'}
            </button>
          </form>

          <p style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', marginTop: '32px' }}>
            NEW TO PREPWISE? <Link href="/signup" style={{ color: 'var(--lime)' }}>CREATE ACCOUNT →</Link>
          </p>

          <div style={{ textAlign: 'right', marginTop: '24px', overflow: 'hidden' }}>
            <span style={{ fontSize: '80px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.04em', color: 'var(--bg4)', lineHeight: 1, userSelect: 'none' }}>LOGIN</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>©2026 PREPWISE TECHNICAL SYSTEMS.</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Privacy Policy', 'Terms of Service', 'System Status'].map(l => (
            <span key={l} style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
