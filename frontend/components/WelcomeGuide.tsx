'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const KEY = 'pw_welcome_seen'
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

const STEPS = [
  ['01', 'Start a session', 'Pick an interview type, a company style and how many questions you want.'],
  ['02', 'Answer', 'Type or speak. A timer shows your pace; there is no cutoff. You can end early and keep what you answered.'],
  ['03', 'Read the check', 'Each claim in your answer is marked correct, incorrect or unverifiable, then scored. Weak answers can get one follow-up.'],
  ['04', 'Review', 'History keeps every session. Progress shows your scores and weak topics over time.'],
]

function read() {
  try { return localStorage.getItem(KEY) === '1' } catch { return true }
}

// Shown once to a new user. The dismissal is remembered in this browser.
export default function WelcomeGuide() {
  // Hidden on the server and on first paint so there is no flash for returning users.
  const seen = useSyncExternalStore(() => () => {}, read, () => true)
  const [closed, setClosed] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const open = !seen && !closed

  useEffect(() => { if (open) button.current?.focus() }, [open])

  function close() {
    try { localStorage.setItem(KEY, '1') } catch { /* storage blocked: it will show again next time */ }
    setClosed(true)
  }

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" onKeyDown={e => { if (e.key === 'Escape') close() }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-4)' }}>
        <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 'var(--space-2)' }}>[WELCOME]</div>
        <h2 id="welcome-title" style={{ fontSize: '28px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: 1.1, marginBottom: 'var(--space-3)' }}>How Prepwise works</h2>
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {STEPS.map(([n, title, text]) => (
            <li key={n} style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <span style={{ ...mono, fontSize: '18px', fontWeight: 700, color: 'var(--lime)' }}>{n}</span>
              <span><strong style={{ fontSize: '16px' }}>{title}</strong><br /><span style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</span></span>
            </li>
          ))}
        </ol>
        <button ref={button} type="button" onClick={close}
          style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', minHeight: '44px' }}>
          GOT IT
        </button>
      </div>
    </div>
  )
}
