'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import { fieldStyle, cardBase } from '@/lib/ui'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import ScoreChart from '@/components/ScoreChart'
import Skeleton, { PageSkeleton } from '@/components/Skeleton'
import ClaimsList, { type Claim } from '@/components/ClaimsList'
import { typeName } from '@/lib/stats'

type SessionRow = {
  id: string
  created_at: string
  interview_type?: string
  target_company?: string
  total_questions?: number
  score_avg?: number
}

// Columns that may not exist yet (see docs/migrations/question_extras.sql) are optional.
type QuestionRow = {
  id: string
  question_text: string
  user_answer?: string | null
  score?: number | null
  hint?: string | null
  ideal_answer?: string | null
  claims?: Claim[] | null
  time_taken_seconds?: number | null
  is_follow_up?: boolean | null
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const label: React.CSSProperties = { ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }

function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<SessionRow | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [minScore, setMinScore] = useState(0)
  const [maxScore, setMaxScore] = useState(10)
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) setError('Could not load your sessions. Try again.')
      setSessions(data || [])
      setLoading(false)
      // A link from the debrief names the session to open.
      const wanted = new URLSearchParams(window.location.search).get('session')
      const match = (data || []).find((r: SessionRow) => r.id === wanted)
      if (match) openSession(match)
    }
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openSession(s: SessionRow) {
    setSelected(s)
    setQuestions([])
    setError('')
    setLoadingQuestions(true)
    const { data, error } = await supabase.from('questions')
      .select('*')
      .eq('session_id', s.id)
      .order('created_at', { ascending: true })
    if (error) setError('Could not load this session. Try again.')
    setQuestions(data || [])
    setLoadingQuestions(false)
  }

  const types = [...new Set(sessions.map(s => s.interview_type).filter((t): t is string => !!t))]
  const visible = sessions
    .filter(s => (typeFilter === 'all' || s.interview_type === typeFilter) && (s.score_avg || 0) >= minScore && (s.score_avg || 0) <= maxScore)
    .sort((a, b) => sortBy === 'score' ? (b.score_avg || 0) - (a.score_avg || 0) : (a.created_at < b.created_at ? 1 : -1))
  // Oldest first so the line reads left to right in time.
  const trendRows = [...visible].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const trend = trendRows.map(s => s.score_avg || 0)
  const trendPoints = trendRows.map(s => ({ score: s.score_avg || 0, at: s.created_at }))

  const control: React.CSSProperties = fieldStyle
  const controlLabel: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: '4px' }

  if (loading) {
    return <PageShell><PageSkeleton rows={4} /></PageShell>
  }

  return (
    <PageShell>
      <div>
        {selected && (
          <button onClick={() => setSelected(null)}
            style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', padding: '10px 20px', cursor: 'pointer', marginBottom: '32px' }}>
            ← ALL SESSIONS
          </button>
        )}
        <PageHeader label="HISTORY" title={selected ? 'Session replay' : 'Past sessions'} />

        {error && <div style={{ ...mono, fontSize: '12px', color: '#ef4444', letterSpacing: '.06em', marginBottom: '16px' }}>{error}</div>}

        {!selected && (sessions.length === 0 ? (
          <EmptyState title="No sessions yet" help="Finished sessions appear here, and you can replay every question, answer and claim." actionLabel="Start a session →" href="/interview" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {trend.length >= 2 && (
              <section aria-label="Score trend" style={{ ...cardBase, padding: '16px 24px', marginBottom: '8px' }}>
                <h2 className="sec-title" style={{ marginBottom: '8px' }}>Score trend</h2>
                <ScoreChart points={trendPoints} label={`Score trend across ${trend.length} sessions, from ${trend[0]} to ${trend[trend.length - 1]}`} />
              </section>
            )}
            <div role="group" aria-label="Filter and sort sessions" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={controlLabel}>TYPE
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={control}>
                  <option value="all">All types</option>
                  {types.map(t => <option key={t} value={t}>{typeName(t)}</option>)}
                </select>
              </label>
              <label style={controlLabel}>MIN SCORE
                <input type="number" min={0} max={10} step={0.5} value={minScore} onChange={e => setMinScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)))} style={{ ...control, width: '90px' }} />
              </label>
              <label style={controlLabel}>MAX SCORE
                <input type="number" min={0} max={10} step={0.5} value={maxScore} onChange={e => setMaxScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)))} style={{ ...control, width: '90px' }} />
              </label>
              <label style={controlLabel}>SORT BY
                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'score')} style={control}>
                  <option value="date">Newest first</option>
                  <option value="score">Highest score</option>
                </select>
              </label>
            </div>
            {visible.length === 0 && (
              <p style={{ fontSize: '14px', color: 'var(--text-2)', padding: '24px 0' }}>No sessions match these filters.</p>
            )}
            {visible.map(s => (
              <button key={s.id} onClick={() => openSession(s)}
                style={{ textAlign: 'left', color: 'inherit', ...cardBase, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div><div style={label}>DATE</div><div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>{formatDate(s.created_at)}</div></div>
                  <div><div style={label}>TYPE</div><div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{typeName(s.interview_type)}</div></div>
                  <div><div style={label}>QUESTIONS ANSWERED</div><div style={{ ...mono, fontSize: '13px', color: 'var(--text-2)' }}>{s.total_questions || 0}</div></div>
                </div>
                <div style={{ ...mono, fontSize: '28px', fontWeight: 700, color: scoreColor(s.score_avg || 0), lineHeight: 1 }}>
                  {s.score_avg || 0}<span style={{ fontSize: '12px', color: 'var(--text-2)' }}>/10</span>
                </div>
              </button>
            ))}
          </div>
        ))}

        {selected && (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '24px' }}>
              {formatDate(selected.created_at)} · {typeName(selected.interview_type)} · AVERAGE {selected.score_avg || 0}/10
            </p>
            {loadingQuestions ? (
              <div role="status" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><Skeleton height={110} /><Skeleton height={110} /></div>
            ) : questions.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-2)', textTransform: 'uppercase' }}>No questions were saved for this session.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ ...cardBase, padding: '16px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ ...mono, fontSize: '12px', color: 'var(--lime)', letterSpacing: '.1em', marginBottom: '6px' }}>
                          [Q.{String(i + 1).padStart(2, '0')}]{q.is_follow_up ? ' · FOLLOW-UP' : ''}
                          {typeof q.time_taken_seconds === 'number' ? ` · ${formatTime(q.time_taken_seconds)}` : ''}
                        </div>
                        <div style={{ fontSize: '15px', lineHeight: 1.5 }}>{q.question_text}</div>
                      </div>
                      <div style={{ ...mono, fontSize: '24px', fontWeight: 700, color: scoreColor(q.score || 0), flexShrink: 0 }}>{q.score ?? 0}/10</div>
                    </div>
                    {q.user_answer && (
                      <>
                        <div style={label}>YOUR ANSWER</div>
                        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{q.user_answer}</p>
                      </>
                    )}
                    {q.hint && (
                      <>
                        <div style={label}>FEEDBACK</div>
                        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 }}>{q.hint}</p>
                      </>
                    )}
                    <ClaimsList claims={q.claims} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
