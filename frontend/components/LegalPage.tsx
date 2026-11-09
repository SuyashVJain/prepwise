// Shared layout for the privacy and terms pages.
import Link from 'next/link'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-4)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{title}</h2>
      <div style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>{children}</div>
    </section>
  )
}

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ padding: '0 clamp(16px, 4vw, 40px)', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</Link>
        <nav aria-label="Legal" style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Link href="/privacy" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)' }}>PRIVACY</Link>
          <Link href="/terms" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)' }}>TERMS</Link>
        </nav>
      </header>
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 40px)' }}>
        <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 'var(--space-2)' }}>[LEGAL]</div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1.05, marginBottom: 'var(--space-2)' }}>{title}</h1>
        <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginBottom: 'var(--space-5)' }}>Last updated {updated}. Written in plain language by the project owner.</p>
        {children}
      </main>
    </div>
  )
}
