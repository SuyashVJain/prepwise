'use client'
import { useRef } from 'react'
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
  options: SubjectOption[]
  // Names the group for screen readers.
  label: string
  // A full-width row above the groups, for a choice that is not a subject (for example "All my syllabus topics").
  leading?: SubjectOption
  // One choice (a radio group): `value` is the selected option, and Other is an optional last row.
  value?: string
  onChange?: (value: string) => void
  other?: OtherChoice
  // Several choices (toggle buttons), as in onboarding: `values` are the selected options.
  multi?: boolean
  values?: string[]
  onToggle?: (value: string) => void
}

const groupLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase',
  color: 'var(--text-2)', marginBottom: '8px',
}

// The shared option look, with longhand border properties only. React warns when a shorthand `border` and a
// longhand such as `borderStyle` are mixed on one element and updated between renders.
const pill = (on: boolean, dashed = false): React.CSSProperties => {
  const { border: shorthand, ...base } = optionStyle(on)
  void shorthand
  return {
    ...base, width: '100%', minHeight: '44px', padding: '8px 28px 8px 14px', display: 'flex', alignItems: 'center', textAlign: 'left',
    borderWidth: '1px', borderStyle: dashed ? 'dashed' : 'solid', borderColor: on ? 'var(--lime)' : '#3d3c3c',
  }
}

// Subjects grouped by category, each group an equal-width grid (see .pill-grid in globals.css). A single-choice picker is
// a radio group: arrow keys move through every pill in reading order and select, and Space selects. A multi-choice
// picker is a set of toggle buttons.
export default function SubjectPicker({ options, label, leading, value, onChange, other, multi, values, onToggle }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // Reading order: the leading row, every subject by group, then Other.
  const offset = leading ? 1 : 0

  // Groups in first-seen order; subjects without a category go in a final group with no label.
  const groups: { name: string; items: { option: SubjectOption; index: number }[] }[] = []
  options.forEach(option => {
    const name = option.category ?? ''
    let g = groups.find(x => x.name === name)
    if (!g) { g = { name, items: [] }; groups.push(g) }
    g.items.push({ option, index: 0 })
  })
  groups.sort((a, b) => (a.name === '' ? 1 : 0) - (b.name === '' ? 1 : 0))
  let n = offset
  groups.forEach(g => g.items.forEach(it => { it.index = n++ }))

  const flat: SubjectOption[] = [...(leading ? [leading] : []), ...groups.flatMap(g => g.items.map(it => it.option))]
  const otherIndex = flat.length
  const count = flat.length + (other ? 1 : 0)
  const selectedIndex = other?.selected ? otherIndex : Math.max(0, flat.findIndex(o => o.value === value))

  function choose(i: number) {
    if (i < flat.length) onChange?.(flat[i].value)
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

  function button(option: SubjectOption, i: number) {
    const on = multi ? !!values?.includes(option.value) : !other?.selected && value === option.value
    return (
      <button key={option.value} ref={el => { refs.current[i] = el }} type="button"
        role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : on} aria-pressed={multi ? on : undefined}
        tabIndex={multi || i === selectedIndex ? 0 : -1}
        onClick={() => (multi ? onToggle?.(option.value) : choose(i))} style={pill(on)}>
        {option.label}
      </button>
    )
  }

  return (
    <div>
      <div role={multi ? 'group' : 'radiogroup'} aria-label={label} onKeyDown={onKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {leading && button(leading, 0)}
        {groups.map(g => (
          <div key={g.name || 'other-subjects'}>
            {g.name && <div style={groupLabel}>{g.name}</div>}
            <div className="pill-grid">{g.items.map(it => button(it.option, it.index))}</div>
          </div>
        ))}
        {other && (
          <button ref={el => { refs.current[otherIndex] = el }} type="button" role="radio" aria-checked={other.selected}
            tabIndex={otherIndex === selectedIndex ? 0 : -1}
            onClick={other.onSelect} style={pill(other.selected, true)}>
            + Other
          </button>
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
