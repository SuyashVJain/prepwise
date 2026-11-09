'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Claim } from '@/components/ClaimsList'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const MAX = 600
const MIN = 20

// Ids match the fixed sample questions on the server.
const QUESTIONS = [
  { id: 'dijkstra', short: 'Dijkstra', text: "Explain how Dijkstra's algorithm works and what it needs from the graph." },
  { id: 'tcp_udp', short: 'TCP vs UDP', text: 'What is the difference between TCP and UDP, and when would you choose each?' },
  { id: 'normalisation', short: 'Normalisation', text: 'What is database normalisation and why is it used?' },
]
const GROUPS: { verdict: Claim['verdict']; label: string; color: string }[] = [
  { verdict: 'correct', label: 'CORRECT', color: '#d4fe42' },
  { verdict: 'incorrect', label: 'INCORRECT', color: '#ef4444' },
  { verdict: 'unverifiable', label: 'UNVERIFIABLE', color: '#f59e0b' },
]

type Result = { score: number; hint?: string; claims?: Claim[] }
type Phase = 'idle' | 'loading' | 'done' | 'limited' | 'error'

export default function TryDemo() {
  const [qid, setQid] = useState(QUESTIONS[0].id)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [waking, setWaking] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const question = QUESTIONS.find(q => q.id === qid)!
  const tooShort = answer.trim().length < MIN

  useEffect(() => () => { if (wakeTimer.current) clearTimeout(wakeTimer.current) }, [])

  async function submit() {
    if (tooShort || phase === 'loading') return
    setPhase('loading'); setWaking(false); setMessage('')
    // A free host that was asleep needs up to a minute to answer the first request.
    wakeTimer.current = setTimeout(() => setWaking(true), 6000)
    const ctl = new AbortController()
    const abort = setTimeout(() => ctl.abort(), 90000)
    try {
      const res = await fetch(`${API}/demo/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: qid, answer: answer.trim() }), signal: ctl.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) { setMessage(data.message || 'The demo is busy, sign up to continue.'); setPhase('limited'); return }
      if (!res.ok) { setMessage(data.message || 'The demo could not score that. Try again.'); setPhase('error'); return }
      setResult(data as Result); setPhase('done')
    } catch {
      setMessage('The server did not answer. It may still be waking up.'); setPhase('error')
    } finally {
      clearTimeout(abort)
      if (wakeTimer.current) clearTimeout(wakeTimer.current)
      setWaking(false)
    }
  }

  const claims = (result?.claims ?? []).filter(c => c && c.claim)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(24px, 4vw, 64px)' }}>
      <div>
        <div role="radiogroup" aria-label="Sample question" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {QUESTIONS.map(q => (
            <button key={q.id} type="button" role="radio" aria-checked={q.id === qid} onClick={() => { setQid(q.id); setPhase('idle'); setResult(null) }}
              style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '10px 14px', minHeight: '40px', cursor: 'pointer', background: q.id === qid ? 'var(--lime)' : 'transparent', color: q.id === qid ? '#0e0e0e' : 'var(--text)', border: `1px solid ${q.id === qid ? 'var(--lime)' : 'var(--border-2)'}` }}>
              {q.short}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 'clamp(18px, 1.8vw, 24px)', fontWeight: 600, lineHeight: 1.35, marginBottom: 'var(--space-3)' }}>{question.text}</p>
        <label htmlFor="demo-answer" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', display: 'block', marginBottom: 'var(--space-1)' }}>YOUR ANSWER</label>
        <textarea id="demo-answer" value={answer} maxLength={MAX} rows={6} onChange={e => setAnswer(e.target.value)}
          placeholder="Answer in a few sentences."
          style={{ width: '100%', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '14px', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>{answer.length}/{MAX}{tooShort && answer.length > 0 ? ` · at least ${MIN}` : ''}</span>
          <button type="button" onClick={submit} disabled={tooShort || phase === 'loading'} className="btn-primary"
            style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 28px', minHeight: '48px', opacity: tooShort || phase === 'loading' ? 0.5 : 1 }}>
            {phase === 'loading' ? 'Checking...' : 'Check my answer →'}
          </button>
        </div>
        <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginTop: 'var(--space-3)', lineHeight: 1.7 }}>Nothing is saved. A few tries per visitor per day.</p>
      </div>

      <div aria-live="polite" style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: 'clamp(20px, 2.5vw, 40px)', minHeight: '260px' }}>
        {phase === 'idle' && <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>Your checked answer appears here: each claim marked correct, incorrect or unverifiable, then a score.</p>}
        {phase === 'loading' && (
          <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
            {waking ? 'Waking the server, this can take up to a minute.' : 'Checking each claim...'}
          </p>
        )}
        {(phase === 'limited' || phase === 'error') && (
          <div>
            <p style={{ fontSize: '16px', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>{message}</p>
            {phase === 'limited'
              ? <Link href="/signup" className="btn-primary" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '14px 28px', display: 'inline-flex', minHeight: '48px', alignItems: 'center' }}>Create free account →</Link>
              : <button type="button" onClick={submit} style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '12px 20px', minHeight: '44px', cursor: 'pointer' }}>Try again</button>}
          </div>
        )}
        {phase === 'done' && result && (
          <div>
            <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>LIVE CHECK · SCORED BY A LANGUAGE MODEL</div>
            <div style={{ ...mono, fontSize: '64px', fontWeight: 700, lineHeight: 1, marginBottom: 'var(--space-3)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {Number(result.score).toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-2)' }}>/10</span>
            </div>
            {typeof result.hint === "string" && result.hint && <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "var(--space-3)" }}>{result.hint}</p>}
            {GROUPS.map(g => {
              const items = claims.filter(c => c.verdict === g.verdict)
              if (!items.length) return null
              return (
                <div key={g.verdict} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: g.color, marginBottom: 'var(--space-1)' }}>{g.label} ({items.length})</div>
                  {items.map((c, i) => (
                    <div key={i} style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: 'var(--space-1)' }}>
                      {c.critical && <span style={{ ...mono, fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>[CRITICAL] </span>}{c.claim}
                    </div>
                  ))}
                </div>
              )
            })}
            <Link href="/signup" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--lime)' }}>Sign up to practise your own syllabus →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
