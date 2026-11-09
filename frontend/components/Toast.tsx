'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type Kind = 'success' | 'error'
type Toast = { id: number; kind: Kind; text: string }
const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

// Tiny local toast: a polite live region in the corner, each message gone after a few seconds.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-2), { id, kind, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'error' ? 6000 : 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="no-print" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 'calc(100vw - 32px)' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'var(--bg2)', border: `1px solid ${t.kind === 'error' ? '#ef4444' : 'var(--lime-border)'}`, color: 'var(--text)', padding: '12px 16px', fontSize: 14, lineHeight: 1.5, minWidth: 220 }}>
            <span style={{ color: t.kind === 'error' ? '#ef4444' : 'var(--lime)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginRight: 8 }}>{t.kind === 'error' ? 'ERROR' : 'OK'}</span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
