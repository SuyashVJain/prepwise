import type { CSSProperties } from 'react'

// Shared look for selectable options and form fields on every signed-in page.
export const optionStyle = (on: boolean): CSSProperties => ({
  minHeight: '44px', padding: '10px 16px', textAlign: 'left', display: 'inline-flex', alignItems: 'center',
  border: `1px solid ${on ? 'var(--lime)' : 'var(--border-2)'}`,
  background: on ? 'var(--lime-dim)' : 'var(--bg3)',
  color: on ? 'var(--lime)' : 'var(--text-2)',
  borderRadius: 'var(--radius-card)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
})

export const fieldStyle: CSSProperties = {
  minHeight: '44px', padding: '10px 12px', background: 'var(--bg3)', color: 'var(--text)',
  border: '1px solid var(--border-2)', borderRadius: 'var(--radius-card)', fontSize: '15px',
}
