'use client'
import Image from 'next/image'
import { useRef, useState } from 'react'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// A product screenshot that opens full size in a native dialog: Enter or click opens,
// Escape or a click outside closes, and focus goes back to the button that opened it.
export default function ShotFigure({ src, alt, caption, width, height }: { src: string; alt: string; caption: string; width: number; height: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  function show() { setOpen(true); dialog.current?.showModal() }
  function onClose() { setOpen(false); trigger.current?.focus() }

  return (
    <figure>
      <button ref={trigger} type="button" onClick={show} aria-haspopup="dialog" aria-label={`Open larger: ${alt}`}
        style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--border-2)', background: 'var(--bg2)', cursor: 'zoom-in' }}>
        <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 1900px) 1824px, 96vw" loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </button>
      <figcaption style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginTop: 'var(--space-2)' }}>{caption} · demo data · click to enlarge</figcaption>

      <dialog ref={dialog} className="lightbox" onClose={onClose} aria-label={caption}
        onClick={e => { if (e.target === dialog.current) dialog.current?.close() }}
        style={{ margin: 'auto', padding: 0, border: '1px solid var(--border-2)', background: 'var(--bg)', maxWidth: '96vw', maxHeight: '96vh', overflow: 'hidden' }}>
        {open && (
          <div style={{ position: 'relative' }}>
            <Image src={src} alt={alt} width={width} height={height} sizes="96vw" style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '96vw', maxHeight: '90vh', objectFit: 'contain' }} />
            <button type="button" onClick={() => dialog.current?.close()} autoFocus
              style={{ ...mono, position: 'absolute', top: 8, right: 8, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '10px 16px', minHeight: '40px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </figure>
  )
}
