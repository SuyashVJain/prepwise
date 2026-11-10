'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { PageSkeleton } from '@/components/Skeleton'
import { type SessionRow, scoreColor, formatDate, formatTime, sessionsPerWeek, topicTrends } from '@/lib/stats'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }
const cardTitle: React.CSSProperties = { ...mono, fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '20px' }

export default function ProgressPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [avgSeconds, setAvgSeconds] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('sessions').select('*')
        .eq('user_id', user.id).eq('completed', true).order('created_at', { ascending: false }).limit(100)
      if (error) setError('Could not load your sessions. Try again.')
      const rows: SessionRow[] = data || []
      setSessions(rows)
      if (rows.length) {
        // Read only. The column may not exist on older databases, in which case there is simply no average.
        const { data: qs } = await supabase.from('questions').select('time_taken_seconds').in('session_id', rows.map(r => r.id))
        const times = (qs || []).map(q => q.time_taken_seconds).filter((t): t is number => typeof t === 'number')
        if (times.length) setAvgSeconds(Math.round(times.reduce((a, b) => a + b, 0) / times.length))
      }
      setLoading(false)
    }
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ordered = [...sessions].reverse().slice(-30)
  const scores = ordered.map(s => s.score_avg || 0)
  const avg = sessions.length ? Math.round((sessions.reduce((a, s) => a + (s.score_avg || 0), 0) / sessions.length) * 10) / 10 : 0
  const weeks = sessionsPerWeek(sessions)
  const maxWeek = Math.max(1, ...weeks.map(w => w.count))
  const trends = topicTrends(sessions)
  const W = 560, H = 160

  const point = (v: number, i: number) => [
    scores.length > 1 ? 24 + (i / (scores.length - 1)) * (W - 48) : W / 2,
    H - 24 - (v / 10) * (H - 48),
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0 }}>
        {loading ? <PageSkeleton /> : (
          <div style={{ padding: '32px clamp(16px, 4vw, 40px)' }}>
            <div style={{ ...mono, fontSize: '11px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: '12px' }}>[PROGRESS]</div>
            <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '32px' }}>Your trajectory</h1>
            {error && <p role="alert" style={{ ...mono, fontSize: '12px', color: '#ef4444', marginBottom: '16px' }}>{error}</p>}

            {sessions.length === 0 ? (
              <div style={card}>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>No sessions yet. Finish a mock interview and your progress will show up here.</p>
                <Link href="/interview" className="btn-primary" style={{ display: 'inline-block', background: 'var(--lime)', color: '#0e0e0e', padding: '12px 28px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em' }}>START SESSION →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'SESSIONS', value: String(sessions.length) },
                    { label: 'AVERAGE SCORE', value: `${avg}/10` },
                    { label: 'LATEST SCORE', value: `${sessions[0].score_avg || 0}/10` },
                    { label: 'AVG TIME / ANSWER', value: avgSeconds === null ? '-' : formatTime(avgSeconds) },
                  ].map(s => (
                    <div key={s.label} style={{ ...card, padding: '20px' }}>
                      <div style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', letterSpacing: '.1em', marginBottom: '8px' }}>{s.label}</div>
                      <div style={{ ...mono, fontSize: '32px', fontWeight: 700, color: 'var(--lime)', lineHeight: 1 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <section style={card} aria-label="Score over time">
                  <div style={cardTitle}>SCORE OVER TIME</div>
                  {scores.length >= 2 ? (
                    <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`Scores for the last ${scores.length} sessions, from ${scores[0]} to ${scores[scores.length - 1]}`}>
                      {[0, 5, 10].map(v => {
                        const y = H - 24 - (v / 10) * (H - 48)
                        return (
                          <g key={v}>
                            <line x1="24" x2={W - 24} y1={y} y2={y} stroke="var(--border-2)" />
                            <text x="0" y={y + 4} style={{ ...mono, fontSize: '11px', fill: 'var(--text-3)' }}>{v}</text>
                          </g>
                        )
                      })}
                      <polyline fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinejoin="round" points={scores.map((v, i) => point(v, i).join(',')).join(' ')} />
                      {scores.map((v, i) => <circle key={i} cx={point(v, i)[0]} cy={point(v, i)[1]} r="4" fill="var(--lime)"><title>{`${v}/10 on ${new Date(ordered[i].created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`}</title></circle>)}
                      <text x="24" y={H + 12} style={{ ...mono, fontSize: '11px', fill: 'var(--text-3)' }}>{formatDate(ordered[0].created_at)}</text>
                      {formatDate(ordered[0].created_at) !== formatDate(ordered[ordered.length - 1].created_at) && <text x={W - 24} y={H + 12} textAnchor="end" style={{ ...mono, fontSize: '11px', fill: 'var(--text-3)' }}>{formatDate(ordered[ordered.length - 1].created_at)}</text>}
                    </svg>
                  ) : (
                    <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Complete 2 or more sessions to see your score over time.</p>
                  )}
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <section style={card} aria-label="Sessions per week">
                    <div style={cardTitle}>SESSIONS PER WEEK</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
                      {weeks.map(w => (
                        <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <span style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px' }}>{w.count}</span>
                          <div style={{ width: '100%', height: `${(w.count / maxWeek) * 80}px`, minHeight: '2px', background: w.count ? 'var(--lime)' : 'var(--bg4)' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>LAST 8 WEEKS, OLDEST FIRST</div>
                  </section>

                  <section style={card} aria-label="Weak topic trend">
                    <div style={cardTitle}>WEAK TOPICS: LAST 5 VS THE 5 BEFORE</div>
                    {trends.length === 0 ? (
                      <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>No weak topics recorded yet.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {trends.map(t => {
                          const delta = t.recent - t.earlier
                          const text = sessions.length <= 5 ? 'new' : delta < 0 ? 'improving' : delta > 0 ? 'getting worse' : 'steady'
                          return (
                            <li key={t.topic} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
                              <span style={{ color: 'var(--text)' }}>{t.topic}</span>
                              <span style={{ ...mono, fontSize: '12px', color: delta > 0 ? '#f59e0b' : 'var(--text-2)', whiteSpace: 'nowrap' }}>{t.recent} vs {t.earlier} · {text}</span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                </div>

                <p style={{ ...mono, fontSize: '12px', color: 'var(--text-3)' }}>
                  Latest session: <span style={{ color: scoreColor(sessions[0].score_avg || 0) }}>{sessions[0].score_avg || 0}/10</span> on {formatDate(sessions[0].created_at)}. <Link href="/history" style={{ color: 'var(--lime)' }}>OPEN HISTORY →</Link>
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
