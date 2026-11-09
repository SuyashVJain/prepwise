'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Hidden until the Google provider is enabled in Supabase and this flag is set at build time.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'

export default function GoogleButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!ENABLED) return null

  async function signIn() {
    setLoading(true)
    setError('')
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    // On success the browser leaves for Google, so only a failure needs handling here.
    if (error) { setError(error.message); setLoading(false) }
  }

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  return (
    <div style={{ marginTop: '20px' }}>
      <button type="button" onClick={signIn} disabled={loading}
        style={{ width: '100%', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'REDIRECTING...' : 'CONTINUE WITH GOOGLE'}
      </button>
      {error && <p style={{ ...mono, fontSize: '11px', color: '#ef4444', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: '12px' }}>{error}</p>}
    </div>
  )
}
