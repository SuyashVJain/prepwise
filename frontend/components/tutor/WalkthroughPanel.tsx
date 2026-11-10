// Step-by-step visual walkthroughs that can follow the tutor.
'use client'
import { useState } from 'react'
import { disabled, ghostButton, label, mono, primaryButton } from './ui'
import walkthroughs from '@/data/walkthroughs.json'

type Cell = { v: string; s?: string; loose?: boolean | string }
type Pointer = { i: number; label: string }
type Step = { cells: Cell[]; pointers: Pointer[]; code: string; note: string }
type Walkthrough = { id: string; subject: string; title: string; topics: string[]; layout: string; steps: Step[] }

const ALL = walkthroughs as Walkthrough[]
export const WALKTHROUGH_SUBJECTS = Array.from(new Set(ALL.map(w => w.subject)))

const CELL_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  active: { fill: 'rgba(212,254,66,0.08)', stroke: '#d4fe42', text: '#d4fe42' },
  done: { fill: 'rgba(212,254,66,0.18)', stroke: '#d4fe42', text: '#f2f2f0' },
  new: { fill: '#201f1f', stroke: '#f59e0b', text: '#f59e0b' },
  dim: { fill: '#131313', stroke: '#222222', text: '#555552' },
  plain: { fill: '#1a1919', stroke: '#2a2a2a', text: '#f2f2f0' },
}

// One step drawn as a row of boxes. The "linked" layout adds arrows between the boxes.
export function Diagram({ step, linked }: { step: Step; linked: boolean }) {
  const count = step.cells.length
  const width = 340
  const gap = linked ? 22 : 4
  const box = Math.min(46, (width - gap * (count - 1)) / count)
  const total = count * box + (count - 1) * gap
  const left = (width - total) / 2
  const top = 34
  const x = (i: number) => left + i * (box + gap)

  return (
    <svg viewBox={`0 0 ${width} 118`} width="100%" role="img" aria-label={`${step.code}. ${step.note}`} style={{ display: 'block' }}>
      {step.cells.map((cell, i) => {
        const color = CELL_COLORS[cell.s ?? 'plain'] ?? CELL_COLORS.plain
        const raised = Boolean(cell.loose)
        const y = raised ? top + 30 : top
        return (
          <g key={i}>
            <rect x={x(i)} y={y} width={box} height={box} fill={color.fill} stroke={color.stroke} strokeWidth={1} />
            <text x={x(i) + box / 2} y={y + box / 2 + 5} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize={14} fontWeight={700} fill={color.text}>{cell.v}</text>
            {!linked && (
              <text x={x(i) + box / 2} y={top + box + 14} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize={9} fill="#555552">{i}</text>
            )}
          </g>
        )
      })}

      {linked && step.cells.map((cell, i) => {
        if (i === count - 1) return null
        const next = step.cells[i + 1]
        // A node that is not linked in yet is skipped by the arrow from the node before it.
        if (next.loose) {
          if (i + 2 >= count) return null
          return <path key={`a${i}`} d={`M ${x(i) + box} ${top + box / 2} L ${x(i + 2) - 3} ${top + box / 2}`} stroke="#adaaaa" strokeWidth={1} markerEnd="url(#arrowhead)" fill="none" />
        }
        if (cell.loose === true) return null
        if (cell.loose === 'in') {
          return <path key={`a${i}`} d={`M ${x(i) + box} ${top + 30 + box / 2} L ${x(i + 1) + box / 2} ${top + 30 + box / 2} L ${x(i + 1) + box / 2} ${top + box + 3}`} stroke="#f59e0b" strokeWidth={1} markerEnd="url(#arrowhead)" fill="none" />
        }
        return <path key={`a${i}`} d={`M ${x(i) + box} ${top + box / 2} L ${x(i + 1) - 3} ${top + box / 2}`} stroke="#adaaaa" strokeWidth={1} markerEnd="url(#arrowhead)" fill="none" />
      })}

      {step.pointers.map((pointer, n) => {
        const index = Math.min(pointer.i, count - 1)
        const past = pointer.i > count - 1
        const cx = past ? x(index) + box + 8 : x(index) + box / 2
        const sameSpot = step.pointers.slice(0, n).filter(p => p.i === pointer.i).length
        return (
          <g key={`p${n}`}>
            <text x={cx} y={14 + sameSpot * 10} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize={9} fontWeight={700} fill="#d4fe42">{pointer.label}</text>
            <path d={`M ${cx} ${18 + sameSpot * 10} L ${cx} ${(step.cells[index].loose ? top + 30 : top) - 4}`} stroke="#d4fe42" strokeWidth={1} markerEnd="url(#pointerhead)" />
          </g>
        )
      })}

      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#adaaaa" /></marker>
        <marker id="pointerhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#d4fe42" /></marker>
      </defs>
    </svg>
  )
}

type Props = {
  subjectId: string
  topic: string
  // Counts the tutor's finished replies. With "follow" on, each new reply moves one step forward.
  cue: number
  onExplain: (text: string) => void
}

export default function WalkthroughPanel({ subjectId, topic, cue, onExplain }: Props) {
  const available = ALL.filter(w => w.subject === subjectId)
  const wanted = topic.trim().toLowerCase()
  const suggested = available.find(w => w.topics.some(t => t.toLowerCase() === wanted))

  const [chosenId, setChosenId] = useState<string | null>(null)
  const [base, setBase] = useState(0)
  const [followFrom, setFollowFrom] = useState<number | null>(null)

  const current = available.find(w => w.id === chosenId) ?? suggested ?? available[0]
  if (!current) {
    return <p style={{ fontSize: '13px', color: 'var(--text-2)', letterSpacing: '.04em' }}>No walkthroughs for this subject yet.</p>
  }

  const last = current.steps.length - 1
  const index = Math.max(0, Math.min(last, base + (followFrom === null ? 0 : cue - followFrom)))
  const step = current.steps[index]
  const following = followFrom !== null

  function goTo(next: number) {
    setBase(Math.max(0, Math.min(last, next)))
    if (following) setFollowFrom(cue)
  }

  function choose(id: string) {
    setChosenId(id)
    setBase(0)
    if (following) setFollowFrom(cue)
  }

  return (
    <div>
      <div style={{ ...label, marginBottom: 'var(--space-2)' }}>VISUAL WALKTHROUGH</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {available.map(w => (
          <button key={w.id} type="button" onClick={() => choose(w.id)} aria-pressed={w.id === current.id}
            style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px var(--space-2)', cursor: 'pointer', background: w.id === current.id ? 'var(--lime-dim)' : 'var(--bg4)', border: `1px solid ${w.id === current.id ? 'var(--lime)' : 'var(--border)'}`, color: w.id === current.id ? 'var(--lime)' : 'var(--text-2)' }}>
            {w.title}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border)', background: 'var(--bg2)', padding: 'var(--space-2) var(--space-2) var(--space-1)' }}>
        <Diagram step={step} linked={current.layout === 'linked'} />
      </div>
      <pre style={{ ...mono, fontSize: '12px', color: 'var(--lime)', background: 'var(--bg4)', padding: 'var(--space-2) 10px', margin: '0', whiteSpace: 'pre-wrap', border: '1px solid var(--border)', borderTop: 'none' }}>{step.code}</pre>
      <p aria-live="polite" style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text)', margin: '12px 0', minHeight: '62px' }}>{step.note}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '10px' }}>
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} style={disabled(ghostButton, index === 0)}>← BACK</button>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === last} style={disabled({ ...primaryButton, padding: '10px 18px', fontSize: '12px' }, index === last)}>NEXT →</button>
        <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.06em', marginLeft: 'auto' }}>STEP {index + 1} / {current.steps.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onExplain(`In the ${current.title} walkthrough, explain this step: ${step.code}. ${step.note}`)} style={ghostButton}>
          ASK ARIA ABOUT THIS STEP
        </button>
        <button type="button" aria-pressed={following}
          onClick={() => { setBase(index); setFollowFrom(following ? null : cue) }}
          style={{ ...ghostButton, borderColor: following ? 'var(--lime)' : 'var(--border)', color: following ? 'var(--lime)' : 'var(--text-2)' }}>
          FOLLOW ARIA: {following ? 'ON' : 'OFF'}
        </button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '10px' }}>
        With follow on, the diagram moves one step each time Aria finishes a reply.
      </p>
    </div>
  )
}
