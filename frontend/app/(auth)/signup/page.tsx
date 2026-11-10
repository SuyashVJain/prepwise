// Sign-up page.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/GoogleButton'
import { friendlyAuthError } from '@/lib/authErrors'
import { useRouter } from 'next/navigation'

const points = [
  ['Questions from your syllabus', 'Upload a syllabus or choose topics, and every question is built from them.'],
  ['Every answer fact-checked', 'Each claim is marked correct, incorrect or unverifiable before you get a score.'],
  ['Replay and progress', 'Open any past session and watch your scores and weak topics over time.'],
]

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password.length < 8) { setError('Choose a longer password, at least 8 characters.'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(friendlyAuthError(error.message).text); setLoading(false) }
    else if (!data.session) { setNeedsConfirm(true); setSuccess(true); setLoading(false) }
    else { setSuccess(true); setTimeout(() => router.push('/onboarding'), 1500) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', ...grotesk }}>

      {/* LEFT PANEL */}
      <div className="auth-side" style={{ width: '45%', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" className="tap" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'block', marginBottom: '64px' }}>PREPWISE</Link>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '4px' }}>START YOUR</h2>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--lime)', marginBottom: '56px' }}>FIRST SESSION</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {points.map(([title, text]) => (
              <li key={title} style={{ borderLeft: '2px solid var(--lime-border)', paddingLeft: '16px' }}>
                <strong style={{ fontSize: '16px', color: 'var(--text)' }}>{title}</strong>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginTop: '4px' }}>{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ position: 'absolute', right: '-1px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
          <span style={{ ...mono, fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', writingMode: 'vertical-rl', whiteSpace: 'nowrap', padding: '12px 0' }}>
            SYSTEM.PROTOCOL // V.4.0.1
          </span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Link href="/" className="tap show-mobile" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', marginBottom: '24px' }}>PREPWISE</Link>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)', marginBottom: '6px' }}>Create your account</h1>
          <p style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '40px' }}>Start your first mock interview in 2 minutes.</p>

          {success ? (
            <div style={{ padding: '24px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)', ...mono, fontSize: '12px', color: 'var(--lime)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {needsConfirm ? 'ACCOUNT CREATED. CHECK YOUR EMAIL AND OPEN THE CONFIRMATION LINK TO SIGN IN.' : 'ACCOUNT CREATED. REDIRECTING...'}
            </div>
          ) : (
            <>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { label: 'FULL NAME', type: 'text', value: fullName, onChange: setFullName, placeholder: 'Your full name' },
                { label: 'EMAIL ADDRESS', type: 'email', value: email, onChange: setEmail, placeholder: 'you@college.edu' },
                { label: 'PASSWORD', type: 'password', value: password, onChange: setPassword, placeholder: 'At least 8 characters' },
              ].map(field => (
                <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{field.label}</label>
                  <input className="auth-input" type={field.type} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder} required
                    style={{ width: '100%', background: 'var(--bg2)', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '14px 12px', fontSize: '16px', color: 'var(--text)', outline: 'none', letterSpacing: '.04em' }}
                    onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                    onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
                </div>
              ))}
              {error && <p role="alert" style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.5 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
              </button>
            </form>
            <GoogleButton />
            </>
          )}

          <p style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', marginTop: '32px' }}>
            ALREADY HAVE AN ACCOUNT? <Link href="/login" style={{ color: 'var(--lime)' }}>SIGN IN →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
