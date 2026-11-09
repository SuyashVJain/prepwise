'use client'
import { useEffect, useRef, useState } from 'react'

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
const STEP_MS = 900

// bare: no border or padding of its own, for use inside a panel that already has them.
export default function ClaimDemo({ bare = false }: { bare?: boolean }) {
  // The server renders the finished state, so the page reads correctly without script.
  const [shown, setShown] = useState(CLAIMS.length)
  const [score, setScore] = useState(FINAL_SCORE)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    let timers: ReturnType<typeof setTimeout>[] = []
    const stop = () => { timers.forEach(clearTimeout); timers = [] }
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)) }

    // The first verdict shows at once, so the card is never empty.
    const run = () => {
      setShown(1); setScore(0)
      for (let i = 1; i < CLAIMS.length; i++) later(() => setShown(i + 1), STEP_MS * i)
      const countStart = STEP_MS * (CLAIMS.length - 1) + 150
      for (let s = 1; s <= 7; s++) later(() => setScore(FINAL_SCORE * s / 7), countStart + s * 90)
      later(run, countStart + 7 * 90 + 4500)
    }
    // Off screen (or tab hidden) the card rests on its finished state.
    const io = new IntersectionObserver(([e]) => {
      stop()
      if (e.isIntersecting) run()
      else { setShown(CLAIMS.length); setScore(FINAL_SCORE) }
    }, { threshold: 0.1 })
    io.observe(el)
    return () => { stop(); io.disconnect() }
  }, [])

  const done = shown >= CLAIMS.length
  const tally = (v: Verdict) => CLAIMS.slice(0, shown).filter(c => c.verdict === v).length

  return (
    <div ref={root} role="group" aria-label="Sample of a checked answer" style={bare ? undefined : { background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: 'clamp(16px, 2vw, 32px)' }}>
      <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>SAMPLE, NOT A REAL SESSION</div>
      {!bare && <p style={{ fontSize: '16px', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>Explain how Dijkstra&apos;s algorithm works and what it needs from the graph.</p>}

      <ol style={{ listStyle: 'none', marginBottom: 'var(--space-3)' }}>
        {CLAIMS.map((c, i) => {
          const look = LOOK[c.verdict]
          const on = i < shown
          return (
            <li key={c.text} className="sc-li" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', padding: '10px 0 10px 12px', borderLeft: `2px solid ${on ? look.color : 'var(--border-2)'}`, marginBottom: 'var(--space-1)', transition: 'border-color .3s' }}>
              <span style={{ fontSize: '15px', lineHeight: 1.5 }}>{c.text}</span>
              <span style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: look.color, minHeight: '16px', opacity: on ? 1 : 0, transition: 'opacity .3s' }}>
                {look.label}{c.critical ? ' · CRITICAL' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <div aria-live="off" style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', borderTop: '1px solid var(--border-2)', paddingTop: 'var(--space-3)' }}>
        {done ? (
          <span className="sc-score" style={{ ...mono, fontSize: '56px', fontWeight: 700, lineHeight: 1, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
            {score.toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-2)' }}>/10</span>
          </span>
        ) : (
          <span style={{ ...mono, fontSize: '13px', letterSpacing: '.1em', color: 'var(--text-2)', minHeight: '56px', display: 'inline-flex', alignItems: 'center' }}>CHECKING CLAIMS...</span>
        )}
        <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          {tally('correct')} correct / {tally('incorrect')} incorrect / {tally('unverifiable')} unverifiable
          {done && <><br />Capped by one critical error.</>}
        </span>
      </div>
    </div>
  )
}
