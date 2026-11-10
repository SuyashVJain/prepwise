'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { optionStyle, fieldStyle } from '@/lib/ui'

export type SubjectOption = { value: string; label: string; category?: string }

type OtherChoice = {
  selected: boolean
  onSelect: () => void
  text: string
  onText: (text: string) => void
  max: number
}

type Props = {
  // Every subject (the shared list), for the More panel.
  options: SubjectOption[]
  // The user's own subjects, in order. They fill the row as far as it fits.
  mine: SubjectOption[]
  // Names the row for screen readers.
  label: string
  // A first pill for a choice that is not a subject (for example "All my syllabus topics").
  leading?: SubjectOption
  value: string
  onChange: (value: string) => void
  // Called when a subject is chosen from the More panel, so it can be remembered as one of the user's own.
  onPickMore?: (value: string) => void
  other?: OtherChoice
}

const MAX_VISIBLE = 6
const PILL_MAX = 180
const GAP = 8
const OTHER_VALUE = '\u0000other'

// The shared option look with longhand border properties only (React warns when a shorthand `border` and a longhand
// such as `borderStyle` are mixed on one element).
const pill = (on: boolean): React.CSSProperties => {
  const { border: shorthand, ...base } = optionStyle(on)
  void shorthand
  return {
    ...base, display: 'flex', alignItems: 'center', minHeight: '44px', maxWidth: `${PILL_MAX}px`, minWidth: 0, flex: '0 1 auto',
    padding: '8px 28px 8px 14px', whiteSpace: 'nowrap', textAlign: 'left',
    borderWidth: '1px', borderStyle: 'solid', borderColor: on ? 'var(--lime)' : '#3d3c3c',
  }
}

const ellipsis: React.CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// A single line of the user's own subjects, as many as fit (at most six), then a More pill for everything else.
export default function SubjectPicker({ options, mine, label, leading, value, onChange, onPickMore, other }: Props) {
  const uid = useId()
  const listId = `${uid}-more`
  const wrap = useRef<HTMLDivElement>(null)
  const measurer = useRef<HTMLDivElement>(null)
  const pills = useRef<(HTMLButtonElement | null)[]>([])
  const moreBtn = useRef<HTMLButtonElement>(null)
  const [fit, setFit] = useState(MAX_VISIBLE)
  const [open, setOpen] = useState(false)

  const candidates: SubjectOption[] = [...(leading ? [leading] : []), ...mine.filter(m => m.value !== leading?.value)]
  const everything: SubjectOption[] = [...(leading ? [leading] : []), ...options]
  const selectedOption = other?.selected ? { value: OTHER_VALUE, label: 'Other' } : everything.find(o => o.value === value)

  // The selection is always visible: when it is not among the pills that fit, it replaces the last one.
  const shown = Math.max(1, Math.min(fit, MAX_VISIBLE, candidates.length || 1))
  let visible = candidates.slice(0, shown)
  if (selectedOption && !visible.some(o => o.value === selectedOption.value)) visible = [...visible.slice(0, Math.max(0, shown - 1)), selectedOption]

  // Measure the natural width of every candidate (and More) in a hidden copy, then keep as many as fit the row.
  const keys = candidates.map(c => c.value).join('|') + '|' + (selectedOption?.value ?? '')
  useLayoutEffect(() => {
    const measure = () => {
      const host = wrap.current
      const m = measurer.current
      if (!host || !m) return
      const widths = [...m.querySelectorAll<HTMLElement>('[data-m="pill"]')].map(e => e.offsetWidth)
      const moreW = m.querySelector<HTMLElement>('[data-m="more"]')?.offsetWidth ?? 90
      let used = moreW
      let n = 0
      for (const w of widths) {
        if (used + GAP + w > host.clientWidth) break
        used += GAP + w
        n++
      }
      setFit(Math.max(1, n))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrap.current) ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [keys])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function choose(o: SubjectOption) {
    if (o.value === OTHER_VALUE) other?.onSelect()
    else onChange(o.value)
  }

  // Radio group: arrows move the selection along the row.
  function onRowKey(e: React.KeyboardEvent) {
    const from = pills.current.findIndex(el => el === document.activeElement)
    if (from < 0) return
    const n = visible.length
    let to = from
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (from + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (from - 1 + n) % n
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    else return
    e.preventDefault()
    pills.current[to]?.focus()
    choose(visible[to])
  }

  const selectedIndex = Math.max(0, visible.findIndex(o => o.value === selectedOption?.value))
  const rest = options.filter(o => !visible.some(v => v.value === o.value))

  return (
    <div>
      <div ref={wrap} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: `${GAP}px`, overflow: 'hidden' }}>
          <div role="radiogroup" aria-label={label} onKeyDown={onRowKey} style={{ display: 'flex', flexWrap: 'nowrap', gap: `${GAP}px`, minWidth: 0, flex: '0 1 auto' }}>
            {visible.map((o, i) => {
              const on = o.value === selectedOption?.value
              return (
                <button key={o.value} ref={el => { pills.current[i] = el }} type="button" role="radio" aria-checked={on} title={o.label}
                  tabIndex={i === selectedIndex ? 0 : -1} onClick={() => choose(o)} style={pill(on)}>
                  <span style={ellipsis}>{o.label}</span>
                </button>
              )
            })}
          </div>
          <button ref={moreBtn} type="button" aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" onClick={() => setOpen(v => !v)}
            style={{ ...pill(false), padding: '8px 14px', gap: '6px', flex: '0 0 auto' }}>
            More…
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* Hidden copy used only to measure how wide each pill is. */}
        <div ref={measurer} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none', height: 0, overflow: 'hidden', display: 'flex', gap: `${GAP}px` }}>
          {candidates.map(o => (
            <span key={o.value} data-m="pill" style={{ ...pill(false), display: 'inline-flex' }}><span style={ellipsis}>{o.label}</span></span>
          ))}
          <span data-m="more" style={{ ...pill(false), padding: '8px 14px', gap: '6px', display: 'inline-flex' }}>More…<svg width="14" height="14" /></span>
        </div>

        {open && (
          <div id={listId} role="listbox" aria-label="More subjects"
            style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 30, maxHeight: '320px', overflowY: 'auto', padding: '4px', background: 'var(--bg2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-card)' }}>
            {rest.map(o => (
              <div key={o.value} role="option" aria-selected={o.value === value} onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(o.value); onPickMore?.(o.value); setOpen(false) }}
                style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '15px' }}>
                {o.label}
              </div>
            ))}
            {other && (
              <div role="option" aria-selected={other.selected} onMouseDown={e => e.preventDefault()} onClick={() => { other.onSelect(); setOpen(false) }}
                style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '15px' }}>
                + Other
              </div>
            )}
          </div>
        )}
      </div>
      {other?.selected && (
        <input value={other.text} onChange={e => other.onText(e.target.value.slice(0, other.max))} maxLength={other.max}
          placeholder="Type a subject, e.g. Digital Logic" aria-label="Subject"
          style={{ ...fieldStyle, width: '100%', marginTop: '8px' }} />
      )}
    </div>
  )
}
