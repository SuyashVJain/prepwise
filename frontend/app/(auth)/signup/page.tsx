// prepwise/app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const testimonials = [
  { quote: '"Prepwise changed my placement prep. The simulations are hauntingly accurate."', tag: 'VIT / STUDENT' },
  { quote: '"The technical autopsy of my code during interviews was a game changer."', tag: 'VTU / ALUMNI' },
  { quote: '"Finally, a platform that doesn\'t sugarcoat the engineering interview process."', tag: 'SUAS / PLACEMENT CELL' },
]

const universities = ['SUAS', 'VTU', 'RGPV', 'SRM', 'BMSCE', 'GTU', 'AKTU']

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setTimeout(() => router.push('/onboarding'), 1500) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', ...grotesk }}>

      {/* LEFT PANEL */}
      <div style={{ width: '45%', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'block', marginBottom: '64px' }}>PREPWISE</Link>
          <h2 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '4px' }}>JOIN 10,000+</h2>
          <h2 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, color: 'var(--lime)', marginBottom: '56px' }}>STUDENTS</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--border-2)', paddingLeft: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '8px' }}>{t.quote}</p>
                <span style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--lime)' }}>{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '48px' }}>
          {universities.map(u => (
            <span key={u} style={{ ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '5px 12px', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>{u}</span>
          ))}
        </div>
        <div style={{ position: 'absolute', right: '-1px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
          <span style={{ ...mono, fontSize: '9px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', writingMode: 'vertical-rl', whiteSpace: 'nowrap', padding: '12px 0' }}>
            SYSTEM.PROTOCOL // V.4.0.1
          </span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)', marginBottom: '6px' }}>Create your account</h1>
          <p style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '40px' }}>Start your first mock interview in 2 minutes.</p>

          {success ? (
            <div style={{ padding: '24px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)', ...mono, fontSize: '12px', color: 'var(--lime)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              ACCOUNT CREATED. REDIRECTING...
            </div>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { label: 'FULL NAME', type: 'text', value: fullName, onChange: setFullName, placeholder: 'ALAN TURING' },
                { label: 'EMAIL ADDRESS', type: 'email', value: email, onChange: setEmail, placeholder: 'ALAN@ENIGMA.EDU' },
                { label: 'PASSWORD', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••' },
              ].map(field => (
                <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{field.label}</label>
                  <input type={field.type} value={field.value} onChange={e => field.onChange(e.target.value)} placeholder={field.placeholder} required
                    style={{ width: '100%', background: 'var(--bg2)', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '14px 12px', fontSize: '14px', color: 'var(--text)', outline: 'none', letterSpacing: '.04em' }}
                    onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                    onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
                </div>
              ))}
              {error && <p style={{ ...mono, fontSize: '10px', color: '#ef4444', letterSpacing: '.06em', textTransform: 'uppercase' }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
              </button>
            </form>
          )}

          <p style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', marginTop: '32px' }}>
            ALREADY HAVE AN ACCOUNT? <Link href="/login" style={{ color: 'var(--lime)' }}>SIGN IN →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
