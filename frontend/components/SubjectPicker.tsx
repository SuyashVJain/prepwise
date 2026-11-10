'use client'
import { useRef } from 'react'
import { optionStyle, fieldStyle } from '@/lib/ui'

export type SubjectOption = { value: string; label: string }

type OtherChoice = {
  selected: boolean
  onSelect: () => void
  text: string
  onText: (text: string) => void
  max: number
}

type Props = {
  options: SubjectOption[]
  // Names the group for screen readers.
  label: string
  // One choice (a radio group): `value` is the selected option, and Other is an optional last pill.
  value?: string
  onChange?: (value: string) => void
  other?: OtherChoice
  // Several choices (toggle buttons), as in onboarding: `values` are the selected options.
  multi?: boolean
  values?: string[]
  onToggle?: (value: string) => void
}

const pill = (on: boolean, dashed = false): React.CSSProperties => ({
  ...optionStyle(on), minHeight: '44px', maxWidth: '100%', padding: '8px 28px 8px 14px', ...(dashed ? { borderStyle: 'dashed' } : {}),
})

// Every subject at once as compact pills in a wrapping flow. A single-choice picker is a radio group
// (arrow keys move and select, Space selects); a multi-choice picker is a set of toggle buttons.
export default function SubjectPicker({ options, label, value, onChange, other, multi, values, onToggle }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const count = options.length + (other ? 1 : 0)
  const selectedIndex = other?.selected ? options.length : Math.max(0, options.findIndex(o => o.value === value))

  function choose(i: number) {
    if (i < options.length) onChange?.(options[i].value)
    else other?.onSelect()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (multi) return
    const from = refs.current.findIndex(el => el === document.activeElement)
    if (from < 0) return
    let to = from
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (from + 1) % count
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (from - 1 + count) % count
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = count - 1
    else return
    e.preventDefault()
    refs.current[to]?.focus()
    choose(to)
  }

  return (
    <div>
      <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className="pills" onKeyDown={onKeyDown} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((o, i) => {
          const on = multi ? !!values?.includes(o.value) : !other?.selected && value === o.value
          return (
            <button key={o.value} ref={el => { refs.current[i] = el }} type="button"
              role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : on} aria-pressed={multi ? on : undefined}
              tabIndex={multi || i === selectedIndex ? 0 : -1}
              onClick={() => (multi ? onToggle?.(o.value) : choose(i))} style={pill(on)}>
              {o.label}
            </button>
          )
        })}
        {other && (
          <button ref={el => { refs.current[options.length] = el }} type="button" role="radio" aria-checked={other.selected}
            tabIndex={options.length === selectedIndex ? 0 : -1}
            onClick={other.onSelect} style={pill(other.selected, true)}>
            + Other
          </button>
        )}
      </div>
      {other?.selected && (
        <input value={other.text} onChange={e => other.onText(e.target.value.slice(0, other.max))} maxLength={other.max}
          placeholder="Type a subject, e.g. Digital Logic" aria-label="Subject"
          style={{ ...fieldStyle, width: '100%', marginTop: '12px' }} />
      )}
    </div>
  )
}
