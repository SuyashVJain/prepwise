// Dashboard: stats, weak topics, next suggested practice and recent sessions.
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import { cardBase } from '@/lib/ui'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import ScoreChart from '@/components/ScoreChart'
import WelcomeGuide from '@/components/WelcomeGuide'
import { PageSkeleton } from '@/components/Skeleton'
import { warmBackend } from '@/lib/api'
import { weakTopicStats, typeName, companyName, capFirst, longestStreak } from '@/lib/stats'
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
  const [firstName, setFirstName] = useState('')
  // The true totals, which can be larger than the 20 latest rows kept for the list and chart.
  const [total, setTotal] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [error, setError] = useState(false)


  const router = useRouter()
  const supabase = createClient()

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  async function load() {
    setError(false)
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      warmBackend()

      const done = () => supabase.from('sessions').select('created_at', { count: 'exact' }).eq('user_id', user.id).eq('completed', true)
      const [latest, all, prof] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', user.id).eq('completed', true).order('created_at', { ascending: false }).limit(20),
        done().order('created_at', { ascending: false }).limit(1000),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      ])
      // A failed session query must never look like an empty history.
      if (latest.error || all.error) throw latest.error ?? all.error
      setFirstName(((prof.data?.full_name as string | undefined) || '').trim().split(' ')[0] || '')
      setSessions(latest.data || [])
      setTotal(all.count ?? (all.data || []).length)
      setBestStreak(longestStreak((all.data || []).map(r => r.created_at as string)))
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── COMPUTED STATS ──
  const totalSessions = total
  const recent = sessions.length
  const avgScore = recent > 0
    ? Math.round((sessions.reduce((sum, s) => sum + (s.score_avg || 0), 0) / recent) * 10) / 10
    : 0
  const streak = bestStreak

  const weakTopics = weakTopicStats(sessions).slice(0, 5)
  const nextTopic = weakTopics[0]?.topic

  const chartSessions = [...sessions].reverse().slice(-8)
  const scores = chartSessions.map(s => s.score_avg || 0)

  if (loading) {
    return (
      <PageShell><PageSkeleton rows={4} /></PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <PageHeader label="DASHBOARD" title="Dashboard" />
        <div role="alert" style={{ ...cardBase, padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', color: '#ef4444' }}>We could not load your sessions. Check your connection and try again.</span>
          <button type="button" onClick={load} className="btn-primary"
            style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '0 24px', minHeight: '44px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em' }}>
            RETRY
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <WelcomeGuide />
      <div>

        {/* ── DASHBOARD VIEW ── */}
        {(
          <>
            <PageHeader label="DASHBOARD" title="Dashboard" subtitle={firstName ? `Welcome back, ${firstName}` : 'Welcome back'} action={
              <Link href="/interview" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '0 20px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                NEW SESSION →
              </Link>
            } />

            <div>
              {totalSessions === 0 && (
                <EmptyState title="No sessions yet" help="Pick a type, answer a few questions and every claim in your answers is checked. Your scores, weak topics and history appear here." actionLabel="Start your first session →" href="/interview" />
              )}

              {totalSessions > 0 && (
                <>
              {/* next best action: plain rule, no model call */}
              <div style={{ ...cardBase, borderLeft: '4px solid var(--lime)', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: 'var(--lime)', fontWeight: 600, marginBottom: '6px' }}>Next best action</div>
                  <div style={{ fontSize: '22px', fontWeight: 600, lineHeight: 1.3, color: 'var(--text)' }}>
                    {nextTopic ? `Practise ${capFirst(nextTopic)}` : 'Start your first mock interview'}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text-2)', marginTop: '4px' }}>
                    {nextTopic ? (weakTopics[0].count > 1 ? 'It is your most frequent weak topic.' : 'It is your latest weak topic.') : 'Your weak topics show up here afterwards.'}
                  </div>
                </div>
                <Link href={nextTopic ? `/interview?topic=${encodeURIComponent(nextTopic)}` : '/interview'}
                  className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '48px', background: 'var(--lime)', color: '#0e0e0e', padding: '0 28px', fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {nextTopic ? 'PRACTISE THIS →' : 'NEW SESSION →'}
                </Link>
              </div>

              {/* stat cards */}
              <div className="stat-row">
                {[
                  { label: 'SESSIONS DONE', value: totalSessions.toString(), suffix: '', icon: totalSessions > 0 ? '↗' : '' },
                  { label: totalSessions > recent ? 'AVG SCORE, LAST 20' : 'AVG SCORE', value: avgScore.toString(), suffix: '/10', icon: '' },
                  { label: 'BEST STREAK', value: streak.toString(), suffix: ' DAYS', icon: '' },
                  { label: 'WEAK TOPICS', value: weakTopics.length.toString(), suffix: '', icon: weakTopics.length > 0 ? '⚠' : '' },
                ].map(stat => (
                  <div key={stat.label} style={{ ...cardBase, padding: '24px' }}>
                    <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '10px' }}>{stat.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '40px', fontWeight: 700, color: 'var(--lime)', letterSpacing: '-.02em', lineHeight: 1 }}>{stat.value}</span>
                      <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>{stat.suffix}</span>
                      {stat.icon && <span style={{ fontSize: '14px', color: stat.label === 'WEAK TOPICS' ? '#f59e0b' : 'var(--lime)', marginLeft: '4px' }}>{stat.icon}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* charts row */}
              <div className="dash-split">
                <div className="chart-card" style={{ ...cardBase, padding: '24px' }}>
                  <h2 className="sec-title">Performance over time</h2>
                  {scores.length >= 2 ? (
                    <ScoreChart points={chartSessions.map(s => ({ score: s.score_avg || 0, at: s.created_at }))} label={`Scores for the last ${scores.length} sessions`} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', fontSize: '14px', color: 'var(--text-2)' }}>
                      Complete 2 or more sessions to see the chart
                    </div>
                  )}
                </div>

                <div style={{ ...cardBase, padding: '24px' }}>
                  <h2 className="sec-title">Weak topics</h2>
                  {weakTopics.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {weakTopics.map(({ topic, count, total }) => {
                        const pct = Math.round((count / total) * 100)
                        return (
                          <div key={topic}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                              <span style={{ fontSize: '15px', color: 'var(--text)' }}>{capFirst(topic)}</span>
                              <span style={{ fontSize: '14px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{count} of {total} sessions</span>
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

              {/* recent sessions: each row opens the replay */}
              <div style={{ ...cardBase, padding: '24px 24px 8px' }}>
                <h2 className="sec-title">Recent sessions</h2>
                <div className="srow-head" aria-hidden="true">
                  <span>Date</span><span>Type</span><span>Target</span><span>Score</span><span>Weak topics</span>
                </div>
                {sessions.map(s => {
                  const topics = s.weak_topics || []
                  const shown = topics.slice(0, 2).map(capFirst).join(', ')
                  return (
                    <Link key={s.id} href={`/history?session=${encodeURIComponent(s.id)}`} className="srow">
                      <span className="r-date">{new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="r-type">{typeName(s.interview_type)}</span>
                      <span className="r-target">{companyName(s.target_company)}</span>
                      <span className="r-score" style={{ color: scoreColor(s.score_avg || 0) }}>{s.score_avg || 0}/10</span>
                      <span className="r-topics" title={topics.map(capFirst).join(', ')}>
                        {shown || <span style={{ color: 'var(--text-2)' }}>None</span>}
                        {topics.length > 2 && <span style={{ color: 'var(--text-2)' }}> +{topics.length - 2} more</span>}
                      </span>
                    </Link>
                  )
                })}
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
