'use client'
import { optionStyle } from '@/lib/ui'

export type GridOption = { value: string; label: string; category?: string }

type Props = {
  options: GridOption[]
  // Names the group for screen readers.
  label: string
  values: string[]
  onToggle: (value: string) => void
}

const groupLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase',
  color: 'var(--text-2)', marginBottom: '8px',
}

// The shared option look with longhand border properties only (React warns when a shorthand `border` and a longhand
// such as `borderStyle` are mixed on one element).
const pill = (on: boolean): React.CSSProperties => {
  const { border: shorthand, ...base } = optionStyle(on)
  void shorthand
  return {
    ...base, width: '100%', minHeight: '44px', padding: '8px 28px 8px 14px', display: 'flex', alignItems: 'center', textAlign: 'left',
    borderWidth: '1px', borderStyle: 'solid', borderColor: on ? 'var(--lime)' : '#3d3c3c',
  }
}

// Multi-select list for onboarding: subjects grouped by category, each group an equal-width grid (.pill-grid in globals.css).
export default function SubjectGrid({ options, label, values, onToggle }: Props) {
  // Groups in first-seen order; subjects without a category go in a final group with no label.
  const groups: { name: string; items: GridOption[] }[] = []
  options.forEach(option => {
    const name = option.category ?? ''
    let g = groups.find(x => x.name === name)
    if (!g) { g = { name, items: [] }; groups.push(g) }
    g.items.push(option)
  })
  groups.sort((a, b) => (a.name === '' ? 1 : 0) - (b.name === '' ? 1 : 0))

  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {groups.map(g => (
        <div key={g.name || 'other-subjects'}>
          {g.name && <div style={groupLabel}>{g.name}</div>}
          <div className="pill-grid">
            {g.items.map(o => (
              <button key={o.value} type="button" aria-pressed={values.includes(o.value)} onClick={() => onToggle(o.value)} style={pill(values.includes(o.value))}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
