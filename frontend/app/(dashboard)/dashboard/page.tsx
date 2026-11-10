// Dashboard: stats, weak topics, next suggested practice and recent sessions.
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import { cardBase } from '@/lib/ui'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import WelcomeGuide from '@/components/WelcomeGuide'
import { PageSkeleton } from '@/components/Skeleton'
import { weakTopicStats } from '@/lib/stats'
import { useRouter } from 'next/navigation'

function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

type SessionRow = {
  id: string
  created_at: string
  interview_type?: string
  target_company?: string
  total_questions?: number
  score_avg?: number
  weak_topics?: string[]
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)


  const router = useRouter()
  const supabase = createClient()

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: sess } = await supabase.from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(20)

      setSessions(sess || [])
      setLoading(false)
    }
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── COMPUTED STATS ──
  const totalSessions = sessions.length
  const avgScore = totalSessions > 0
    ? Math.round((sessions.reduce((sum, s) => sum + (s.score_avg || 0), 0) / totalSessions) * 10) / 10
    : 0

  const streak = (() => {
    if (!sessions.length) return 0
    const dates = sessions.map(s => new Date(s.created_at).toDateString())
    const unique = [...new Set(dates)]
    let count = 1
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1])
      const curr = new Date(unique[i])
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) count++
      else break
    }
    return count
  })()

  const weakTopics = weakTopicStats(sessions).slice(0, 5)
  const nextTopic = weakTopics[0]?.topic

  const chartSessions = [...sessions].reverse().slice(-8)
  const chartW = 460, chartH = 140
  const scores = chartSessions.map(s => s.score_avg || 0)
  const minS = scores.length ? Math.max(0, Math.min(...scores) - 1) : 0
  const maxS = scores.length ? Math.min(10, Math.max(...scores) + 1) : 10
  const pts = scores.map((v, i) => {
    const x = scores.length > 1 ? (i / (scores.length - 1)) * (chartW - 40) + 20 : chartW / 2
    const y = chartH - 20 - ((v - minS) / (maxS - minS || 1)) * (chartH - 40)
    return `${x},${y}`
  }).join(' ')

  if (loading) {
    return (
      <PageShell><PageSkeleton rows={4} /></PageShell>
    )
  }

  return (
    <PageShell>
      <WelcomeGuide />
      <div>

        {/* ── DASHBOARD VIEW ── */}
        {(
          <>
            <PageHeader label="DASHBOARD" title="Dashboard" action={
              <Link href="/interview" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', background: 'var(--lime)', color: '#0e0e0e', padding: '0 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                NEW SESSION →
              </Link>
            } />

            <div>
              {sessions.length === 0 && (
                <EmptyState title="No sessions yet" help="Pick a type, answer a few questions and every claim in your answers is checked. Your scores, weak topics and history appear here." actionLabel="Start your first session →" href="/interview" />
              )}

              {sessions.length > 0 && (
                <>
              {/* next best action: plain rule, no model call */}
              <div style={{ background: 'var(--lime-dim)', border: '1px solid var(--lime-border)', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--lime)', marginBottom: '4px' }}>NEXT BEST ACTION</div>
                  <div style={{ fontSize: '15px', color: 'var(--text)' }}>
                    {nextTopic ? `Practise ${nextTopic}, your most frequent weak topic.` : 'Start your first mock interview to find your weak topics.'}
                  </div>
                </div>
                <Link href={nextTopic ? `/interview?topic=${encodeURIComponent(nextTopic)}` : '/interview'}
                  className="btn-primary" style={{ background: 'var(--lime)', color: '#0e0e0e', padding: '10px 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em' }}>
                  {nextTopic ? 'PRACTISE THIS →' : 'NEW SESSION →'}
                </Link>
              </div>

              {/* stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  { label: 'SESSIONS DONE', value: totalSessions.toString(), suffix: '', icon: totalSessions > 0 ? '↗' : '' },
                  { label: 'AVG SCORE', value: avgScore.toString(), suffix: '/10', icon: '' },
                  { label: 'BEST STREAK', value: streak.toString(), suffix: ' DAYS', icon: '' },
                  { label: 'WEAK TOPICS', value: weakTopics.length.toString(), suffix: '', icon: weakTopics.length > 0 ? '⚠' : '' },
                ].map(stat => (
                  <div key={stat.label} style={{ ...cardBase, padding: '16px' }}>
                    <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '10px' }}>{stat.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--lime)', letterSpacing: '-.02em', lineHeight: 1 }}>{stat.value}</span>
                      <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>{stat.suffix}</span>
                      {stat.icon && <span style={{ fontSize: '14px', color: stat.label === 'WEAK TOPICS' ? '#f59e0b' : 'var(--lime)', marginLeft: '4px' }}>{stat.icon}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ ...cardBase, padding: '24px' }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '20px' }}>PERFORMANCE OVER TIME</div>
                  {scores.length >= 2 ? (
                    <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: 'visible' }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                        <line key={i} x1="20" y1={20 + t * (chartH - 40)} x2={chartW - 20} y2={20 + t * (chartH - 40)} stroke="var(--border)" strokeWidth="1" />
                      ))}
                      <polyline points={pts} fill="none" stroke="var(--lime)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      {scores.map((v, i) => {
                        const x = (i / (scores.length - 1)) * (chartW - 40) + 20
                        const y = chartH - 20 - ((v - minS) / (maxS - minS || 1)) * (chartH - 40)
                        return <circle key={i} cx={x} cy={y} r="4" fill="var(--lime)"><title>{`${v}/10 on ${new Date(chartSessions[i].created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`}</title></circle>
                      })}
                      {chartSessions.map((s, i) => {
                        const x = (i / (scores.length - 1)) * (chartW - 40) + 20
                        const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        const date = fmt(s.created_at)
                        // Each day is labelled once, at its first point; the full time is in the hover title.
                        if (i > 0 && fmt(chartSessions[i - 1].created_at) === date) return null
                        return <text key={i} x={x} y={chartH + 4} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fill: 'var(--text-2)' }}>{date}</text>
                      })}
                    </svg>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Complete 2+ sessions to see chart
                    </div>
                  )}
                </div>

                <div style={{ ...cardBase, padding: '24px' }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '20px' }}>WEAK TOPICS ANALYSIS</div>
                  {weakTopics.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {weakTopics.map(({ topic, count, total }) => {
                        const pct = Math.round((count / total) * 100)
                        return (
                          <div key={topic}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                              <span style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{topic}</span>
                              <span style={{ ...mono, fontSize: '12px', color: 'var(--lime)', fontWeight: 700, whiteSpace: 'nowrap' }}>{count} of {total} sessions</span>
                            </div>
                            <div style={{ height: '3px', background: 'var(--bg4)' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--lime)', transition: 'width .6s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center' }}>
                      No weak topics yet.<br />Complete a session first.
                    </div>
                  )}
                </div>
              </div>

              {/* sessions table */}
              <div style={{ ...cardBase }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)' }}>RECENT SESSIONS</div>
                </div>
                {sessions.length === 0 ? (
                  <p style={{ padding: '16px 24px', fontSize: '15px', color: 'var(--text-2)' }}>Finished sessions will be listed here.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['DATE', 'TYPE', 'TARGET', 'SCORE', 'QUESTIONS', 'WEAK TOPICS'].map(h => (
                          <th key={h} style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', padding: '10px 20px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', padding: '14px 20px' }}>
                            {new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', padding: '14px 20px', textTransform: 'capitalize' }}>
                            {s.interview_type?.replace('_', ' ') || '-'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-2)', padding: '14px 20px', textTransform: 'uppercase' }}>
                            {s.target_company || '-'}
                          </td>
                          <td style={{ ...mono, fontSize: '13px', fontWeight: 700, color: scoreColor(s.score_avg || 0), padding: '14px 20px' }}>
                            {s.score_avg || 0}/10
                          </td>
                          <td style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', padding: '14px 20px' }}>
                            {s.total_questions || 0}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(s.weak_topics || []).slice(0, 2).map((t: string) => (
                                <span key={t} style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>{t}</span>
                              ))}
                              {(s.weak_topics || []).length > 2 && (
                                <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>+{(s.weak_topics?.length ?? 0) - 2}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
                </>
              )}
            </div>
          </>
        )}

      </div>
    </PageShell>
  )
}
