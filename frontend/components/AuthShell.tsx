import Link from 'next/link'
import Logo from '@/components/Logo'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// Compact centred page for the small account forms (forgot and reset password).
export default function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link href="/" aria-label="Prepwise home" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: 'var(--space-5)' }}><Logo size="md" /></Link>
        <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 'var(--space-2)' }}>{eyebrow}</div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 'var(--space-4)' }}>{title}</h1>
        {children}
      </div>
    </main>
  )
}

export const fieldLabel: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }
export const fieldInput: React.CSSProperties = { width: '100%', minHeight: '44px', padding: '10px 12px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid #3d3c3c', borderRadius: 'var(--radius-card)', fontSize: '16px' }
export const submitButton: React.CSSProperties = { width: '100%', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', minHeight: '48px' }
