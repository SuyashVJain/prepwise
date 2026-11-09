'use client'
import { useState } from 'react'

export type Claim = {
  claim: string
  verdict: 'correct' | 'incorrect' | 'unverifiable'
  critical?: boolean
  reason?: string
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const GROUPS: { verdict: Claim['verdict']; label: string; color: string }[] = [
  { verdict: 'correct', label: 'CORRECT', color: '#d4fe42' },
  { verdict: 'incorrect', label: 'INCORRECT', color: '#ef4444' },
  { verdict: 'unverifiable', label: 'UNVERIFIABLE', color: '#f59e0b' },
]

// Claims are missing on old rows and on fallback scoring, so render nothing rather than an empty box.
export default function ClaimsList({ claims }: { claims?: Claim[] | null }) {
  const [open, setOpen] = useState(false)
  const list = Array.isArray(claims) ? claims.filter(c => c && c.claim) : []
  if (list.length === 0) return null

  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid var(--lime-border)', paddingTop: '10px' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} CLAIMS CHECKED ({list.length})
      </button>
      {open && GROUPS.map(g => {
        const items = list.filter(c => c.verdict === g.verdict)
        if (items.length === 0) return null
        return (
          <div key={g.verdict} style={{ marginTop: '10px' }}>
            <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: g.color, marginBottom: '4px' }}>{g.label} ({items.length})</div>
            {items.map((c, i) => (
              <div key={i} style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '8px' }}>
                {c.critical && <span style={{ ...mono, fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>[CRITICAL] </span>}
                {c.claim}
                {c.reason && <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{c.reason}</div>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
