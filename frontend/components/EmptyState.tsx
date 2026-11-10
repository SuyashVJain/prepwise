import Link from 'next/link'
import { cardBase } from '@/lib/ui'

// The one empty state: a message, one line of help and one lime button.
export default function EmptyState({ title, help, actionLabel, href }: { title: string; help: string; actionLabel: string; href: string }) {
  return (
    <section style={{ ...cardBase, padding: '24px' }}>
      <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{title}</p>
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-2)', marginBottom: '20px', maxWidth: '60ch' }}>{help}</p>
      <Link href={href} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', background: 'var(--lime)', color: '#0e0e0e', padding: '0 24px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{actionLabel}</Link>
    </section>
  )
}
