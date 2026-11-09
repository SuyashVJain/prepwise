'use client'
import { useEffect, useState } from 'react'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

type Verdict = 'correct' | 'incorrect' | 'unverifiable'
const LOOK: Record<Verdict, { label: string; color: string }> = {
  correct: { label: 'CORRECT', color: '#d4fe42' },
  incorrect: { label: 'INCORRECT', color: '#ef4444' },
  unverifiable: { label: 'UNVERIFIABLE', color: '#f59e0b' },
}

// Fixed sample data. Nothing here comes from a real session.
const CLAIMS: { text: string; verdict: Verdict; critical?: boolean }[] = [
  { text: 'Dijkstra repeatedly picks the unvisited vertex with the smallest distance.', verdict: 'correct' },
  { text: 'With a binary heap it runs in O((V + E) log V).', verdict: 'correct' },
  { text: 'It works on graphs with negative edge weights.', verdict: 'incorrect', critical: true },
  { text: 'It is usually fast in practice.', verdict: 'unverifiable' },
]
const FINAL_SCORE = 3.5
const STEP_MS = 1100

export default function ClaimDemo({ compact = false }: { compact?: boolean }) {
  // The server renders the finished state, so the page reads correctly without script.
  const [shown, setShown] = useState(CLAIMS.length)
  const [score, setScore] = useState(FINAL_SCORE)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let dead = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(() => { if (!dead) fn() }, ms)) }

    const run = () => {
      setShown(0); setScore(0)
      CLAIMS.forEach((_, i) => later(() => setShown(i + 1), STEP_MS * (i + 1)))
      const countStart = STEP_MS * (CLAIMS.length + 1)
      for (let s = 1; s <= 7; s++) later(() => setScore(FINAL_SCORE * s / 7), countStart + s * 90)
      later(run, countStart + 7 * 90 + 4500)
    }
    run()
    return () => { dead = true; timers.forEach(clearTimeout) }
  }, [])

  const done = shown >= CLAIMS.length
  const tally = (v: Verdict) => CLAIMS.slice(0, shown).filter(c => c.verdict === v).length

  return (
    <div role="group" aria-label="Sample of a checked answer" className={compact ? 'claim-demo-compact' : undefined} style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: 'clamp(16px, 2vw, 32px)' }}>
      <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>SAMPLE, NOT A REAL SESSION</div>
      <p style={{ fontSize: '16px', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>Explain how Dijkstra&apos;s algorithm works and what it needs from the graph.</p>

      <ol style={{ listStyle: 'none', marginBottom: 'var(--space-3)' }}>
        {CLAIMS.map((c, i) => {
          const look = LOOK[c.verdict]
          const on = i < shown
          return (
            <li key={c.text} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', padding: '10px 0 10px 12px', borderLeft: `2px solid ${on ? look.color : 'var(--border-2)'}`, marginBottom: 'var(--space-1)', transition: 'border-color .3s' }}>
              <span style={{ fontSize: '15px', lineHeight: 1.5 }}>{c.text}</span>
              <span style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: look.color, minHeight: '16px', opacity: on ? 1 : 0, transition: 'opacity .3s' }}>
                {look.label}{c.critical ? ' · CRITICAL' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div aria-live="off" style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', borderTop: '1px solid var(--border-2)', paddingTop: 'var(--space-3)' }}>
        <span style={{ ...mono, fontSize: compact ? '44px' : '64px', fontWeight: 700, lineHeight: 1, color: done ? '#ef4444' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
          {score.toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-2)' }}>/10</span>
        </span>
        <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          {tally('correct')} correct / {tally('incorrect')} incorrect / {tally('unverifiable')} unverifiable
          {done && <><br />Capped by one critical error.</>}
        </span>
      </div>
    </div>
  )
}
