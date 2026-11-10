// Session notes and flashcards generated from the tutor conversation.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { eyebrow, ghostButton, label, mono, panel, primaryButton } from './ui'

export type Flashcard = { front: string; back: string }
export type SessionNotes = { summary: string; flashcards: Flashcard[] }

const STORAGE_KEY = 'prepwise_tutor_notes'

// Keep the latest notes for this browser tab, so a refresh does not lose them.
export function rememberNotes(notes: SessionNotes, title: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ title, notes }))
  } catch {
    // Storage can be blocked or full; the notes are still on screen.
  }
}

export function notesAsText(notes: SessionNotes, title: string): string {
  const cards = notes.flashcards.map((card, i) => `${i + 1}. Q: ${card.front}\n   A: ${card.back}`).join('\n')
  return `${title}\n\nSUMMARY\n${notes.summary}\n\nFLASHCARDS\n${cards}\n`
}

type Props = {
  title: string
  status: 'loading' | 'ready' | 'error' | 'empty'
  notes: SessionNotes | null
  error: string
  saved: boolean
  onRetry: () => void
  onDone: () => void
  interviewTopic: string
}

export default function NotesPanel({ title, status, notes, error, saved, onRetry, onDone, interviewTopic }: Props) {
  const [copied, setCopied] = useState(false)
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})

  async function copyAll() {
    if (!notes) return
    try {
      await navigator.clipboard.writeText(notesAsText(notes, title))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={{ flex: 1, padding: 'var(--space-5)', maxWidth: '900px', overflowY: 'auto', height: '100vh' }}>
      <div style={{ ...eyebrow, marginBottom: '12px' }}>[SESSION NOTES]</div>
      <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: 'var(--space-4)' }}>{title}</h1>

      {status === 'loading' && <p style={{ fontSize: '13px', color: 'var(--text-2)', letterSpacing: '.08em' }}>Aria is writing your notes...</p>}
      {status === 'empty' && <p style={{ fontSize: '13px', color: 'var(--text-2)', letterSpacing: '.06em' }}>The session was too short to make notes from.</p>}
      {status === 'error' && (
        <div role="alert" style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{ ...mono, fontSize: '12px', color: '#ef4444', letterSpacing: '.06em', marginBottom: '12px' }}>{error}</p>
          <button type="button" onClick={onRetry} style={ghostButton}>TRY AGAIN</button>
        </div>
      )}

      {status === 'ready' && notes && (
        <>
          <div style={{ ...label, marginBottom: 'var(--space-2)' }}>SUMMARY</div>
          <div style={{ ...panel, padding: 'var(--space-3) 20px', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>{notes.summary}</div>

          <div style={{ ...label, marginBottom: 'var(--space-2)' }}>FLASHCARDS · {notes.flashcards.length} · CLICK A CARD TO FLIP IT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)', marginBottom: '28px' }}>
            {notes.flashcards.map((card, i) => (
              <button key={i} type="button" onClick={() => setFlipped(prev => ({ ...prev, [i]: !prev[i] }))} aria-pressed={Boolean(flipped[i])}
                style={{ ...panel, padding: 'var(--space-3)', textAlign: 'left', cursor: 'pointer', minHeight: '110px', color: 'var(--text)', borderColor: flipped[i] ? 'var(--lime-border)' : 'var(--border)' }}>
                <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: flipped[i] ? 'var(--lime)' : 'var(--text-3)', marginBottom: 'var(--space-2)' }}>
                  {flipped[i] ? 'ANSWER' : `Q.${String(i + 1).padStart(2, '0')}`}
                </div>
                <div style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: flipped[i] ? 500 : 600 }}>{flipped[i] ? card.back : card.front}</div>
              </button>
            ))}
          </div>
          <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.04em', marginBottom: '20px' }}>
            {saved ? 'SAVED TO YOUR ACCOUNT.' : 'These notes are kept in this browser tab only. Copy them if you want to keep them.'}
          </p>
        </>
      )}

      {/* Learn, then test: the same topic as a mock interview. */}
      {interviewTopic && (
        <div style={{ ...panel, padding: 'var(--space-3) 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ ...label, marginBottom: 'var(--space-1)' }}>READY TO BE TESTED?</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Take a mock interview on {interviewTopic}.</div>
          </div>
          <Link href={`/interview?topic=${encodeURIComponent(interviewTopic)}`}
            style={{ ...ghostButton, borderColor: 'var(--lime)', color: 'var(--lime)', padding: '12px 18px', textDecoration: 'none', flexShrink: 0 }}>
            MOCK INTERVIEW →
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        {status === 'ready' && notes && (
          <button type="button" onClick={copyAll} style={primaryButton}>{copied ? 'COPIED ✓' : 'COPY NOTES'}</button>
        )}
        <button type="button" onClick={onDone} style={{ ...ghostButton, padding: '14px var(--space-4)' }}>NEW SESSION</button>
      </div>
    </div>
  )
}
