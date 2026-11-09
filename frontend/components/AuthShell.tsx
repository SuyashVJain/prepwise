import Link from 'next/link'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// Compact centred page for the small account forms (forgot and reset password).
export default function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link href="/" className="tap" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'inline-block', marginBottom: 'var(--space-5)' }}>PREPWISE</Link>
        <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 'var(--space-2)' }}>{eyebrow}</div>
        <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1.05, marginBottom: 'var(--space-4)' }}>{title}</h1>
        {children}
      </div>
    </main>
  )
}

export const fieldLabel: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }
export const fieldInput: React.CSSProperties = { width: '100%', background: 'var(--bg2)', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '14px 12px', fontSize: '16px', color: 'var(--text)' }
export const submitButton: React.CSSProperties = { width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', minHeight: '48px' }
