'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

export type DropdownOption = { value: string; label: string }

// A styled dropdown with the listbox pattern. Focus stays on the trigger and aria-activedescendant points at the
// highlighted option. Arrow keys, Home, End, Enter, Space, Escape and type-ahead all work; it opens below the field
// and flips above when there is no room.
export default function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: DropdownOption[]; onChange: (v: string) => void }) {
  const uid = useId()
  const listId = `${uid}-list`
  const labelId = `${uid}-label`
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(selectedIndex)
  const [up, setUp] = useState(false)

  const optId = (i: number) => `${uid}-opt-${i}`

  function openList() { setActive(selectedIndex); setOpen(true) }
  function close() { setOpen(false); trigger.current?.focus() }
  function choose(i: number) { onChange(options[i].value); close() }

  // Flip above when the list would run off the bottom of the window and there is more room above.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return
    const r = trigger.current.getBoundingClientRect()
    const h = list.current.offsetHeight
    setUp(window.innerHeight - r.bottom < h + 12 && r.top > window.innerHeight - r.bottom)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' })
    // optId depends only on uid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open])

  function onKey(e: React.KeyboardEvent) {
    const last = options.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'Tab') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(last, i + 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); return }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); return }
    if (e.key === 'End') { e.preventDefault(); setActive(last); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); return }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase(), at: now }
      const hit = options.findIndex(o => o.label.toLowerCase().startsWith(typed.current.text))
      if (hit >= 0) setActive(hit)
    }
  }

  return (
    <div className="dd" ref={root}>
      <span id={labelId} className="dd-label">{label}</span>
      <button ref={trigger} type="button" className="dd-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={listId} aria-labelledby={labelId} aria-activedescendant={open ? optId(active) : undefined}
        onClick={() => (open ? close() : openList())} onKeyDown={onKey}>
        <span className="dd-value">{options[selectedIndex]?.label}</span>
        <svg className="dd-chevron" data-open={open} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul ref={list} id={listId} role="listbox" aria-labelledby={labelId} className="dd-list" data-up={up}>
          {options.map((o, i) => (
            <li key={o.value} id={optId(i)} role="option" aria-selected={o.value === value} className="dd-opt" data-active={i === active}
              onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(i)}>
              <span>{o.label}</span>
              {o.value === value && <span className="dd-check" aria-hidden="true">{'✓'}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
