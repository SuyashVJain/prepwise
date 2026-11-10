import type { CSSProperties } from 'react'
import { optionStyle, cardBase } from '@/lib/ui'

// Shared inline-style pieces for the tutor screens, matching the rest of the app.
export const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

export const eyebrow: CSSProperties = {
  ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)',
}

export const label: CSSProperties = {
  ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)',
}

export const primaryButton: CSSProperties = {
  background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px',
  fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
}

export const ghostButton: CSSProperties = {
  ...mono, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '10px 18px',
  fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
}

export const panel: CSSProperties = cardBase

export function tile(active: boolean): CSSProperties {
  return optionStyle(active)
}

export function disabled(style: CSSProperties, isDisabled: boolean): CSSProperties {
  return isDisabled ? { ...style, opacity: 0.45, cursor: 'not-allowed' } : style
}
