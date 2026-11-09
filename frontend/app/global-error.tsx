'use client'

// Last resort when the root layout itself fails, so it brings its own html and body.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0e0e0e', color: '#f2f2f0', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ maxWidth: '520px' }}>
            <h1 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ color: '#adaaaa', lineHeight: 1.7, marginBottom: '24px' }}>The app could not load. Try again in a moment.</p>
            <button type="button" onClick={reset} style={{ background: '#d4fe42', color: '#0e0e0e', border: 'none', padding: '14px 24px', fontWeight: 700, minHeight: '48px' }}>TRY AGAIN</button>
          </div>
        </main>
      </body>
    </html>
  )
}
