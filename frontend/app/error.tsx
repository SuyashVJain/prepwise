'use client'
import ErrorView from '@/components/ErrorView'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorView code="ERROR" title="Something went wrong" text="This page hit a problem. Your saved sessions are safe. Try again, and if it keeps happening, come back in a few minutes."
      action={<button type="button" onClick={reset} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', background: '#d4fe42', color: '#0e0e0e', border: 'none', padding: '14px 24px', minHeight: '48px' }}>TRY AGAIN</button>} />
  )
}
