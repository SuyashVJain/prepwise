// Subject roadmap with progress kept in this browser.
'use client'
import { useState, useSyncExternalStore } from 'react'
import { getServerSnapshot, getSnapshot, parseProgress, setTopicDone, subscribe } from '@/lib/tutor/progressStore'
import { label, mono } from './ui'
import roadmaps from '@/data/tutor-roadmaps.json'

type RoadmapTopic = { id: string; title: string; summary: string }

const roadmapBySubject = roadmaps as Record<string, RoadmapTopic[]>

// A subject without a roadmap (for example one the student typed) simply has no roadmap block.
export function hasRoadmap(subjectId: string): boolean {
  return (roadmapBySubject[subjectId] ?? []).length > 0
}

type Props = {
  subjectId: string
  currentTopic: string
  startLabel: string
  onStart: (title: string) => void
}

export default function RoadmapPanel({ subjectId, currentTopic, startLabel, onStart }: Props) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const progress = parseProgress(snapshot)
  const topics = roadmapBySubject[subjectId] ?? []
  const doneCount = topics.filter(t => progress[t.id]).length
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? topics : topics.slice(0, 6)

  if (topics.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
        <span style={label}>ROADMAP</span>
        <span style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', color: doneCount > 0 ? 'var(--lime)' : 'var(--text-3)' }}>
          {doneCount} / {topics.length} DONE
        </span>
      </div>
      <div aria-hidden="true" style={{ height: '3px', background: 'var(--bg4)', marginBottom: '12px' }}>
        <div style={{ height: '100%', width: `${(doneCount / topics.length) * 100}%`, background: 'var(--lime)', transition: 'width .2s ease' }} />
      </div>
      <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {shown.map((t, i) => {
          const done = Boolean(progress[t.id])
          const current = t.title.toLowerCase() === currentTopic.trim().toLowerCase()
          return (
            <li key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: 'var(--space-2) 10px', background: current ? 'var(--lime-dim)' : 'var(--bg2)', border: `1px solid ${current ? 'var(--lime-border)' : 'var(--border)'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px', margin: '-10px -14px -10px -14px', flexShrink: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={done} onChange={e => setTopicDone(t.id, e.target.checked)}
                aria-label={`Mark ${t.title} as done`}
                className="cbx" />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                  <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginRight: '6px' }}>{String(i + 1).padStart(2, '0')}</span>
                  {t.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.4, marginTop: '2px' }}>{t.summary}</div>
              </div>
              <button type="button" onClick={() => onStart(t.title)}
                style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', padding: 'var(--space-1) var(--space-2)', cursor: 'pointer', flexShrink: 0, background: 'transparent', border: '1px solid var(--border-2)', color: current ? 'var(--lime)' : 'var(--text-2)' }}>
                {current ? 'CURRENT' : startLabel}
              </button>
            </li>
          )
        })}
      </ol>
      {topics.length > 6 && (
        <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
          style={{ marginTop: '12px', minHeight: '44px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-card)', padding: '0 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          {showAll ? 'Show fewer' : `Show all ${topics.length}`}
        </button>
      )}
      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '10px' }}>Progress is saved in this browser only.</p>
    </div>
  )
}
