// Python code-along panel: write code, run a syntax check and get a short review.
'use client'
import { useRef, useState } from 'react'
import { apiFetch, RATE_LIMIT_MESSAGE } from '@/lib/api'
import { disabled, ghostButton, label, mono, primaryButton } from './ui'
import exercises from '@/data/python-exercises.json'

type Exercise = { title: string; prompt: string; starter: string }
type Review = { verdict: 'correct' | 'needs_work' | 'syntax_error'; feedback: string; hints: string[]; line?: number }

const exerciseByTopic = exercises as Record<string, Exercise>
const LINE_HEIGHT = 20

export function exerciseFor(topic: string): Exercise {
  const wanted = topic.trim().toLowerCase()
  const key = Object.keys(exerciseByTopic).find(k => k.toLowerCase() === wanted)
  return exerciseByTopic[key ?? 'default']
}

const VERDICT_COPY: Record<Review['verdict'], { text: string; color: string }> = {
  correct: { text: 'LOOKS CORRECT', color: 'var(--lime)' },
  needs_work: { text: 'NOT QUITE YET', color: '#f59e0b' },
  syntax_error: { text: 'SYNTAX ERROR', color: '#ef4444' },
}

// A plain textarea with a line-number gutter. The code is reviewed by the tutor; it is never run.
export default function CodePanel({ topic }: { topic: string }) {
  const exercise = exerciseFor(topic)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [review, setReview] = useState<{ forPrompt: string; result: Review } | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const gutter = useRef<HTMLDivElement>(null)

  const code = edits[exercise.prompt] ?? exercise.starter
  const lineCount = Math.max(code.split('\n').length, 8)
  const shown = review && review.forPrompt === exercise.prompt ? review.result : null

  function setCode(value: string) {
    setEdits(prev => ({ ...prev, [exercise.prompt]: value }))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Tab indents instead of leaving the editor. Escape then Tab still moves focus on.
    if (e.key !== 'Tab' || e.shiftKey) return
    e.preventDefault()
    const target = e.currentTarget
    const { selectionStart, selectionEnd } = target
    setCode(code.slice(0, selectionStart) + '    ' + code.slice(selectionEnd))
    requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = selectionStart + 4 })
  }

  async function check() {
    setChecking(true)
    setError('')
    try {
      const res = await apiFetch('/tutor/code-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: exercise.prompt, code }),
      })
      if (!res.ok) throw new Error('Could not check the code. Try again.')
      setReview({ forPrompt: exercise.prompt, result: await res.json() as Review })
    } catch (err) {
      setError(err instanceof Error && err.message === RATE_LIMIT_MESSAGE ? RATE_LIMIT_MESSAGE : 'Could not check the code. Try again.')
    }
    setChecking(false)
  }

  return (
    <div>
      <div style={label}>EXERCISE · {exercise.title.toUpperCase()}</div>
      <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text)', margin: 'var(--space-2) 0 12px' }}>{exercise.prompt}</p>

      <div style={{ display: 'flex', border: '1px solid var(--border-2)', background: 'var(--bg3)', height: `${Math.min(lineCount, 16) * LINE_HEIGHT + 16}px` }}>
        <div ref={gutter} aria-hidden="true" style={{ ...mono, fontSize: '12px', lineHeight: `${LINE_HEIGHT}px`, color: 'var(--text-2)', textAlign: 'right', padding: 'var(--space-2) var(--space-2) var(--space-2) 6px', background: 'var(--bg4)', overflow: 'hidden', userSelect: 'none', minWidth: '34px' }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ color: shown?.line === i + 1 ? '#ef4444' : undefined }}>{i + 1}</div>
          ))}
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} onKeyDown={onKeyDown}
          onScroll={e => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop }}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={4000}
          aria-label="Python code editor"
          style={{ ...mono, flex: 1, fontSize: '12px', lineHeight: `${LINE_HEIGHT}px`, padding: 'var(--space-2)', background: 'transparent', color: 'var(--text)', border: 'none', outline: 'none', resize: 'none', whiteSpace: 'pre', overflow: 'auto', tabSize: 4 }} />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', margin: '12px 0' }}>
        <button type="button" onClick={check} disabled={checking} style={disabled({ ...primaryButton, padding: '10px 18px', fontSize: '12px' }, checking)}>
          {checking ? 'CHECKING...' : 'CHECK MY CODE'}
        </button>
        <button type="button" onClick={() => { setCode(exercise.starter); setReview(null); setError('') }} style={ghostButton}>RESET</button>
      </div>

      {error && <p role="alert" style={{ ...mono, fontSize: '12px', color: '#ef4444', letterSpacing: '.06em' }}>{error}</p>}
      {shown && (
        <div aria-live="polite" style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: '12px 14px' }}>
          <div style={{ ...mono, fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', color: VERDICT_COPY[shown.verdict].color, marginBottom: '6px' }}>
            {VERDICT_COPY[shown.verdict].text}
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text)' }}>{shown.feedback}</p>
          {shown.hints.length > 0 && (
            <ul style={{ listStyle: 'none', marginTop: 'var(--space-2)' }}>
              {shown.hints.map((hint, i) => (
                <li key={i} style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-2)', display: 'flex', gap: 'var(--space-2)' }}>
                  <span style={{ ...mono, color: 'var(--lime)' }}>·</span>{hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '10px' }}>
        Your code is read and reviewed. It is not run.
      </p>
    </div>
  )
}
