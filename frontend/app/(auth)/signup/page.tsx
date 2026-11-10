// Sign-up page.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
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
          <Link href="/" aria-label="Prepwise home" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '48px' }}><Logo size="md" /></Link>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.05, color: 'var(--text)', marginBottom: '4px' }}>Start your</h2>
          <h2 style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.05, color: 'var(--lime)', marginBottom: '56px' }}>first session</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {points.map(([title, text]) => (
              <li key={title} style={{ borderLeft: '2px solid var(--lime-border)', paddingLeft: '16px' }}>
                <strong style={{ fontSize: '16px', color: 'var(--text)' }}>{title}</strong>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginTop: '4px' }}>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Link href="/" aria-label="Prepwise home" className="show-mobile" style={{ alignItems: 'center', minHeight: '44px', marginBottom: '16px' }}><Logo size="md" /></Link>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)', marginBottom: '6px' }}>Create your account</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '40px' }}>Start your first mock interview in 2 minutes.</p>

          {success ? (
            <div style={{ padding: '24px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)', ...mono, fontSize: '12px', color: 'var(--lime)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {needsConfirm ? 'ACCOUNT CREATED. CHECK YOUR EMAIL AND OPEN THE CONFIRMATION LINK TO SIGN IN.' : 'ACCOUNT CREATED. REDIRECTING...'}
            </div>
          ) : (
            <>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { label: 'Full name', type: 'text', value: fullName, onChange: setFullName, placeholder: 'Your full name' },
                { label: 'Email address', type: 'email', value: email, onChange: setEmail, placeholder: 'you@college.edu' },
                { label: 'Password', type: 'password', value: password, onChange: setPassword, placeholder: 'At least 8 characters' },
              ].map(field => (
                <div key={field.label}>
                  <label htmlFor={`su-${field.label}`} className="auth-label">{field.label}</label>
                  <input id={`su-${field.label}`} className="auth-field" type={field.type} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder} required />
                </div>
              ))}
              {error && <p role="alert" style={{ fontSize: '14px', color: '#ef4444', lineHeight: 1.5 }}>{error}</p>}
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
              </button>
            </form>
            <GoogleButton />
            </>
          )}

          <p className="auth-small" style={{ textAlign: 'center', marginTop: '32px' }}>
            Already have an account? <Link href="/login">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
