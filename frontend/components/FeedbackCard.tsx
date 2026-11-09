const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// A static feedback card built from the same tokens as the real result card. Demo data, nothing from a session.
const GROUPS = [
  { label: 'CORRECT', color: '#d4fe42', items: [
    { claim: 'A deadlock needs mutual exclusion, hold and wait, no preemption and circular wait.', why: 'These are the four Coffman conditions.' },
    { claim: 'Breaking any one of the four conditions prevents deadlock.', why: 'True for prevention strategies.' },
  ] },
  { label: 'INCORRECT', color: '#ef4444', items: [
    { claim: 'Round-robin scheduling avoids deadlock.', why: 'Scheduling order does not remove circular wait.' },
  ] },
  { label: 'UNVERIFIABLE', color: '#f59e0b', items: [
    { claim: 'Modern kernels usually detect it with a timer.', why: 'Too vague to confirm.' },
  ] },
]

export default function FeedbackCard() {
  return (
    <div role="group" aria-label="Example of a scored answer, demo data" className="fcard" style={{ background: 'var(--bg)', border: '1px solid var(--lime-border)', padding: 'clamp(16px, 2.4svh, 28px) clamp(16px, 2vw, 28px)' }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'clamp(6px, 1svh, 10px)' }}>DEMO DATA</div>
      <p className="fcard-q" style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 'clamp(8px, 1.4svh, 14px)' }}>Explain what a deadlock is, the conditions that must all hold…</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'clamp(6px, 1.2svh, 12px)' }}>
        <span style={{ ...mono, fontSize: 'clamp(36px, 6svh, 52px)', fontWeight: 700, lineHeight: 1, color: '#f59e0b' }}>6.5<span style={{ fontSize: '16px', color: 'var(--text-2)' }}>/10</span></span>
        <span style={{ ...mono, fontSize: '13px', color: 'var(--text-2)' }}>2 correct / 1 incorrect / 1 unverifiable</span>
      </div>
      <p className="fcard-summary" style={{ fontSize: '15px', lineHeight: 1.55, marginBottom: 'clamp(8px, 1.6svh, 16px)' }}>Good coverage of the four conditions and a sound prevention idea. One scheduling claim was wrong, and detection was left vague.</p>
      {GROUPS.map(g => (
        <div key={g.label} style={{ borderTop: '1px solid var(--border)', paddingTop: 'clamp(4px, .8svh, 8px)', marginTop: 'clamp(4px, .8svh, 8px)' }}>
          <div style={{ ...mono, fontSize: '13px', letterSpacing: '.1em', color: g.color, marginBottom: '2px' }}>{g.label} ({g.items.length})</div>
          {g.items.map(i => (
            <div key={i.claim} style={{ marginBottom: 'clamp(2px, .6svh, 6px)' }}>
              <div style={{ fontSize: '15px', lineHeight: 1.45 }}>{i.claim}</div>
              <div style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{i.why}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
