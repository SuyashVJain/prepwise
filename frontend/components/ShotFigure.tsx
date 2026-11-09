'use client'
import Image from 'next/image'
import { useRef, useState } from 'react'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// A product screenshot in a browser-style frame. Enter or a click opens it full size in a native
// dialog: Escape or a click outside closes it, and focus returns to the button that opened it.
export default function ShotFigure({ src, alt, caption, width, height }: { src: string; alt: string; caption: string; width: number; height: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  function show() { setOpen(true); dialog.current?.showModal() }
  function onClose() { setOpen(false); trigger.current?.focus() }

  return (
    <figure className="shot">
      <button ref={trigger} type="button" onClick={show} aria-haspopup="dialog" aria-label={`Enlarge: ${caption}`} className="shot-frame"
        style={{ position: 'relative', display: 'block', width: 'fit-content', maxWidth: '100%', padding: 0, border: '1px solid var(--border-2)', background: 'var(--bg)', cursor: 'zoom-in', textAlign: 'left' }}>
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 0 0 12px', borderBottom: '1px solid var(--border-2)', background: 'var(--bg2)' }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-2)', display: 'block' }} />)}
          <span style={{ ...mono, marginLeft: 'auto', alignSelf: 'stretch', display: 'inline-flex', alignItems: 'center', fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '0 12px' }}>Enlarge ↗</span>
        </span>
        <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 900px) 62vw, 96vw" loading="lazy" style={{ width: 'auto', maxWidth: '100%', height: 'auto', maxHeight: 'calc(100svh - var(--hdr) - 150px)', display: 'block', margin: '0 auto' }} />
      </button>

      <dialog ref={dialog} className="lightbox" onClose={onClose} aria-label={caption}
        onClick={e => { if (e.target === dialog.current) dialog.current?.close() }}
        style={{ margin: 'auto', padding: 0, border: '1px solid var(--border-2)', background: 'var(--bg)', maxWidth: '96vw', maxHeight: '96vh', overflow: 'hidden' }}>
        {open && (
          <div style={{ position: 'relative' }}>
            <Image src={src} alt={alt} width={width} height={height} sizes="96vw" style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '96vw', maxHeight: '92vh', objectFit: 'contain' }} />
            <button type="button" onClick={() => dialog.current?.close()} autoFocus
              style={{ ...mono, position: 'absolute', top: 8, right: 8, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '10px 16px', minHeight: '44px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </figure>
  )
}
