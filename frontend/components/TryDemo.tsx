'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ClaimDemo from '@/components/ClaimDemo'
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
  // One draft per question, so switching tabs never throws typing away.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [waking, setWaking] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const box = useRef<HTMLTextAreaElement>(null)
  const resultHead = useRef<HTMLHeadingElement>(null)
  const resultPanel = useRef<HTMLDivElement>(null)
  const question = QUESTIONS.find(q => q.id === qid)!
  const answer = drafts[qid] ?? ''
  const tooShort = answer.trim().length < MIN

  useEffect(() => () => { if (wakeTimer.current) clearTimeout(wakeTimer.current) }, [])

  // After an outcome arrives, bring it into view on small screens and move focus to its heading.
  useEffect(() => {
    if (phase === 'idle' || phase === 'loading') return
    if (window.innerWidth < 900) resultPanel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' })
    resultHead.current?.focus({ preventScroll: true })
  }, [phase])

  function choose(i: number) {
    const q = QUESTIONS[i]
    setQid(q.id); setPhase('idle'); setResult(null); setMessage('')
    tabs.current[i]?.focus()
    // Typing goes to the answer box of the new question.
    window.setTimeout(() => box.current?.focus({ preventScroll: true }), 0)
  }

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const last = QUESTIONS.length - 1
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (to < 0) return
    e.preventDefault()
    setQid(QUESTIONS[to].id); setPhase('idle'); setResult(null); setMessage('')
    tabs.current[to]?.focus()
  }

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
  const headStyle: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)', outline: 'none', fontWeight: 400 }

  return (
    <div className="try-grid">
      <div>
        <div role="radiogroup" aria-label="Sample question" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {QUESTIONS.map((q, i) => (
            <button key={q.id} ref={el => { tabs.current[i] = el }} type="button" role="radio" aria-checked={q.id === qid} tabIndex={q.id === qid ? 0 : -1}
              className="demo-tab" data-on={q.id === qid} onClick={() => choose(i)} onKeyDown={e => onTabKey(e, i)}>
              {q.short}
            </button>
          ))}
        </div>

        <div key={qid} className="fade-swap">
          <p id="demo-question" style={{ fontSize: 'clamp(20px, 2.2vw, 30px)', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.01em', marginBottom: 'var(--space-3)' }}>{question.text}</p>
          <label htmlFor="demo-answer" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', display: 'block', marginBottom: 'var(--space-1)' }}>YOUR ANSWER</label>
          <textarea id="demo-answer" ref={box} value={answer} maxLength={MAX} rows={6} aria-describedby="demo-help" onChange={e => setDrafts(d => ({ ...d, [qid]: e.target.value }))}
            placeholder="Answer in a few sentences."
            style={{ width: '100%', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '14px', fontSize: '15px', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <span id="demo-help" style={{ ...mono, fontSize: '12px', color: tooShort ? 'var(--amber, #f59e0b)' : 'var(--text-2)', lineHeight: 1.5 }}>
            {answer.length}/{MAX}{tooShort ? ` · write at least ${MIN} characters to check` : ''}
          </span>
          <button type="button" onClick={submit} disabled={tooShort || phase === 'loading'} className="btn-primary"
            style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 28px', minHeight: '48px', opacity: tooShort || phase === 'loading' ? 0.5 : 1 }}>
            {phase === 'loading' ? 'Checking...' : 'Check my answer →'}
          </button>
        </div>
        <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginTop: 'var(--space-2)', lineHeight: 1.7 }}>Nothing is saved. A few tries per visitor per day.</p>
      </div>

      <div ref={resultPanel} aria-live={phase === 'idle' ? 'off' : 'polite'} style={{ background: 'var(--bg)', border: '1px solid var(--lime-border)', padding: 'clamp(16px, 2vw, 28px)', minHeight: '570px' }}>
        {phase === 'idle' && qid === 'dijkstra' && <ClaimDemo bare />}
        {phase === 'idle' && qid !== 'dijkstra' && (
          <div>
            <h3 ref={resultHead} tabIndex={-1} style={headStyle}>YOUR CHECKED ANSWER APPEARS HERE</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-2)' }}>
              Write an answer and press check. Each claim is marked correct, incorrect or unverifiable, then scored.
            </p>
          </div>
        )}
        {phase === 'loading' && (
          <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
            {waking ? 'Waking the server, this can take up to a minute.' : 'Checking each claim...'}
          </p>
        )}
        {(phase === 'limited' || phase === 'error') && (
          <div>
            <h3 ref={resultHead} tabIndex={-1} style={headStyle}>{phase === 'limited' ? 'DEMO LIMIT REACHED' : 'COULD NOT CHECK'}</h3>
            <p style={{ fontSize: '16px', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>{message}</p>
            {phase === 'limited'
              ? <Link href="/signup" className="btn-primary" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '14px 28px', display: 'inline-flex', minHeight: '48px', alignItems: 'center' }}>Create free account →</Link>
              : <button type="button" onClick={submit} className="btn-secondary" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '12px 20px', minHeight: '48px', cursor: 'pointer' }}>Try again</button>}
          </div>
        )}
        {phase === 'done' && result && (
          <div>
            <h3 ref={resultHead} tabIndex={-1} style={headStyle}>LIVE CHECK · SCORED BY A LANGUAGE MODEL</h3>
            <div style={{ ...mono, fontSize: '56px', fontWeight: 700, lineHeight: 1, marginBottom: 'var(--space-3)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {Number(result.score).toFixed(1)}<span style={{ fontSize: '16px', color: 'var(--text-2)' }}>/10</span>
            </div>
            {typeof result.hint === 'string' && result.hint && <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>{result.hint}</p>}
            {GROUPS.map(g => {
              const items = claims.filter(c => c.verdict === g.verdict)
              if (!items.length) return null
              return (
                <div key={g.verdict} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: g.color, marginBottom: 'var(--space-1)' }}>{g.label} ({items.length})</div>
                  {items.map((c, i) => (
                    <div key={i} style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: 'var(--space-1)' }}>
                      {c.critical && <span style={{ ...mono, fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>[CRITICAL] </span>}{c.claim}
                    </div>
                  ))}
                </div>
              )
            })}
            <Link href="/signup" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--lime)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Sign up to practise your own syllabus →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
