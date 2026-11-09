import Link from 'next/link'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// Shared look for the 404 and error pages. Inline styles only, so it also works when the stylesheet is the thing that broke.
export default function ErrorView({ code, title, text, action }: { code: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0e', color: '#f2f2f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', color: '#d4fe42', marginBottom: '16px' }}>[{code}]</div>
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 56px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '16px' }}>{title}</h1>
        <p style={{ fontSize: '16px', color: '#adaaaa', lineHeight: 1.7, marginBottom: '24px' }}>{text}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {action}
          <Link href="/" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', border: '1px solid #2a2a2a', color: '#f2f2f0', padding: '14px 24px', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}>GO HOME</Link>
        </div>
      </div>
    </main>
  )
}
