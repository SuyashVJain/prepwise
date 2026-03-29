// prepwise/app/(dashboard)/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'DASHBOARD', href: '/dashboard' },
  { id: 'new', label: 'NEW SESSION', href: '/interview' },
  { id: 'study', label: 'STUDY MODE', href: '/study' },
  { id: 'history', label: 'HISTORY', href: '/dashboard' },
  { id: 'progress', label: 'PROGRESS', href: '/dashboard' },
  { id: 'settings', label: 'SETTINGS', href: '/dashboard' },
]

function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

export default function DashboardPage() {
  const [active, setActive] = useState('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState('')
  const [editUni, setEditUni] = useState('')
  const [editSem, setEditSem] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: sess }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setProfile(prof)
      setSessions(sess || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || '')
      setEditUni(profile.university || '')
      setEditSem(profile.semester || 1)
    }
  }, [profile])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        full_name: editName,
        university: editUni,
        semester: editSem,
      }).eq('id', user.id)
      setProfile((p: any) => ({ ...p, full_name: editName, university: editUni, semester: editSem }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

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

  const weakTopicsMap: Record<string, number> = {}
  sessions.forEach(s => {
    const topics = s.weak_topics || []
    topics.forEach((t: string) => {
      weakTopicsMap[t] = (weakTopicsMap[t] || 0) + 1
    })
  })
  const weakTopics = Object.entries(weakTopicsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          LOADING SYSTEM...
        </span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', ...grotesk }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>Prepwise</div>
          <div style={{ ...mono, fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '3px' }}>AI INTERVIEW PREP</div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV_ITEMS.map(item => (
            <div key={item.id}
              onClick={() => item.id === 'new' ? router.push('/interview') : item.id === 'study' ? router.push('/study') : setActive(item.id)}
              style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', cursor: 'pointer', borderLeft: `2px solid ${active === item.id ? 'var(--lime)' : 'transparent'}`, background: active === item.id ? 'var(--bg2)' : 'transparent', transition: 'all .1s' }}>
              <span style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: active === item.id ? 'var(--lime)' : 'var(--text-3)', fontWeight: active === item.id ? 700 : 400 }}>
                {item.label}
              </span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '11px', color: 'var(--lime)', fontWeight: 700, flexShrink: 0 }}>
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{profile?.full_name || 'User'}</div>
              <div style={{ ...mono, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '2px' }}>{profile?.university || '-'}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ ...mono, fontSize: '9px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            SIGN OUT →
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── DASHBOARD VIEW ── */}
        {active === 'dashboard' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '32px 40px 0', marginBottom: '32px' }}>
              <div>
                <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '6px' }}>TECHNICAL OVERVIEW / SYSTEM ACTIVE</div>
                <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1 }}>CANDIDATE DASHBOARD</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>LAST UPDATED</div>
                <div style={{ ...mono, fontSize: '10px', color: 'var(--text-2)' }}>{new Date().toUTCString().slice(0, 25)} UTC</div>
                <Link href="/interview">
                  <button style={{ marginTop: '12px', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '10px 20px', ...grotesk, fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    NEW SESSION →
                  </button>
                </Link>
              </div>
            </div>

            <div style={{ padding: '0 40px 40px' }}>
              {/* stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
                {[
                  { label: 'SESSIONS DONE', value: totalSessions.toString(), suffix: '', icon: totalSessions > 0 ? '↗' : '' },
                  { label: 'AVG SCORE', value: avgScore.toString(), suffix: '/10', icon: '' },
                  { label: 'BEST STREAK', value: streak.toString(), suffix: ' DAYS', icon: '' },
                  { label: 'WEAK TOPICS', value: weakTopics.length.toString(), suffix: '', icon: weakTopics.length > 0 ? '⚠' : '' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px 20px 16px' }}>
                    <div style={{ ...mono, fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>{stat.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--lime)', letterSpacing: '-.02em', lineHeight: 1 }}>{stat.value}</span>
                      <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)' }}>{stat.suffix}</span>
                      {stat.icon && <span style={{ fontSize: '14px', color: stat.label === 'WEAK TOPICS' ? '#f59e0b' : 'var(--lime)', marginLeft: '4px' }}>{stat.icon}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '8px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
                  <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '20px' }}>PERFORMANCE OVER TIME</div>
                  {scores.length >= 2 ? (
                    <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: 'visible' }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                        <line key={i} x1="20" y1={20 + t * (chartH - 40)} x2={chartW - 20} y2={20 + t * (chartH - 40)} stroke="var(--border)" strokeWidth="1" />
                      ))}
                      <polyline points={pts} fill="none" stroke="var(--lime)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      {scores.map((v, i) => {
                        const x = (i / (scores.length - 1)) * (chartW - 40) + 20
                        const y = chartH - 20 - ((v - minS) / (maxS - minS || 1)) * (chartH - 40)
                        return <circle key={i} cx={x} cy={y} r="4" fill="var(--lime)" />
                      })}
                      {chartSessions.map((s, i) => {
                        const x = (i / (scores.length - 1)) * (chartW - 40) + 20
                        const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        return <text key={i} x={x} y={chartH + 4} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: 'var(--text-3)' }}>{date}</text>
                      })}
                    </svg>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Complete 2+ sessions to see chart
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
                  <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '20px' }}>WEAK TOPICS ANALYSIS</div>
                  {weakTopics.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {weakTopics.map(([topic, count]) => {
                        const pct = Math.round((count / sessions.length) * 100)
                        return (
                          <div key={topic}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{topic}</span>
                              <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ height: '3px', background: 'var(--bg4)' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--lime)', transition: 'width .6s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center' }}>
                      No weak topics yet.<br />Complete a session first.
                    </div>
                  )}
                </div>
              </div>

              {/* sessions table */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>RECENT DIAGNOSTIC SESSIONS</div>
                </div>
                {sessions.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '16px' }}>No sessions yet. Start your first mock interview.</div>
                    <Link href="/interview">
                      <button style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '12px 28px', ...grotesk, fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                        START SESSION →
                      </button>
                    </Link>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['DATE', 'TYPE', 'TARGET', 'SCORE', 'QUESTIONS', 'WEAK TOPICS'].map(h => (
                          <th key={h} style={{ ...mono, fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '10px 20px', textAlign: 'left', fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', padding: '14px 20px' }}>
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
                          <td style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', padding: '14px 20px' }}>
                            {s.total_questions || 0}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(s.weak_topics || []).slice(0, 2).map((t: string) => (
                                <span key={t} style={{ ...mono, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>{t}</span>
                              ))}
                              {(s.weak_topics || []).length > 2 && (
                                <span style={{ ...mono, fontSize: '9px', color: 'var(--text-3)' }}>+{s.weak_topics.length - 2}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── HISTORY VIEW ── */}
        {active === 'history' && (
          <div style={{ padding: '32px 40px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[HISTORY]</div>
            <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '32px' }}>ALL SESSIONS</h1>
            {sessions.length === 0 ? (
              <div style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>No sessions yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map((s) => (
                  <div key={s.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flex: 1 }}>
                      <div>
                        <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>DATE</div>
                        <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>{new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <div>
                        <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>TYPE</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{s.interview_type?.replace('_', ' ') || '-'}</div>
                      </div>
                      <div>
                        <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>TARGET</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase' }}>{s.target_company || '-'}</div>
                      </div>
                      <div>
                        <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>QUESTIONS</div>
                        <div style={{ ...mono, fontSize: '13px', color: 'var(--text-2)' }}>{s.total_questions || 0}</div>
                      </div>
                      <div>
                        <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>WEAK TOPICS</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(s.weak_topics || []).slice(0, 3).map((t: string) => (
                            <span key={t} style={{ ...mono, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 6px', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>{t}</span>
                          ))}
                          {!(s.weak_topics || []).length && <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)' }}>-</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      <div style={{ fontSize: '32px', fontWeight: 700, ...mono, color: scoreColor(s.score_avg || 0), lineHeight: 1 }}>{s.score_avg || 0}</div>
                      <div style={{ ...mono, fontSize: '10px', color: 'var(--text-3)' }}>/10</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS VIEW ── */}
        {active === 'progress' && (
          <div style={{ padding: '32px 40px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[PROGRESS]</div>
            <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '32px' }}>YOUR TRAJECTORY</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
              {[
                { label: 'TOTAL SESSIONS', value: totalSessions.toString() },
                { label: 'AVERAGE SCORE', value: `${avgScore}/10` },
                { label: 'WEAK AREAS', value: weakTopics.length.toString() },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
                  <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontSize: '42px', fontWeight: 700, color: 'var(--lime)', ...mono, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px', marginBottom: '16px' }}>
              <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '20px' }}>SCORE PROGRESSION</div>
              {scores.length >= 2 ? (
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: 'visible' }}>
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                    <line key={i} x1="20" y1={20 + t * (chartH - 40)} x2={chartW - 20} y2={20 + t * (chartH - 40)} stroke="var(--border)" strokeWidth="1" />
                  ))}
                  <polyline points={pts} fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {scores.map((v, i) => {
                    const x = (i / (scores.length - 1)) * (chartW - 40) + 20
                    const y = chartH - 20 - ((v - minS) / (maxS - minS || 1)) * (chartH - 40)
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill="var(--lime)" />
                        <text x={x} y={y - 12} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fill: 'var(--lime)', fontWeight: 700 }}>{v}</text>
                      </g>
                    )
                  })}
                </svg>
              ) : (
                <div style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', padding: '40px 0' }}>
                  Complete 2+ sessions to see progression
                </div>
              )}
            </div>

            {weakTopics.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
                <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '20px' }}>WEAK AREAS TO FOCUS ON</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {weakTopics.map(([topic, count]) => {
                    const pct = Math.round((count / sessions.length) * 100)
                    return (
                      <div key={topic}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text)' }}>{topic}</span>
                          <span style={{ ...mono, fontSize: '11px', color: 'var(--lime)', fontWeight: 700 }}>{pct}% of sessions</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg4)' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--lime)' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS VIEW ── */}
        {active === 'settings' && (
          <div style={{ padding: '32px 40px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[SETTINGS]</div>
            <h1 style={{ fontSize: '36px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '32px' }}>PROFILE CONFIG</h1>

            <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { label: 'FULL NAME', value: editName, onChange: setEditName },
                { label: 'UNIVERSITY', value: editUni, onChange: setEditUni },
              ].map(field => (
                <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{field.label}</label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', ...grotesk, fontSize: '14px', color: 'var(--text)', outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                    onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>SEMESTER</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <div key={s} onClick={() => setEditSem(s)}
                      style={{ ...mono, fontSize: '11px', padding: '8px 14px', border: `1px solid ${editSem === s ? 'var(--lime)' : 'var(--border)'}`, background: editSem === s ? 'var(--lime)' : 'var(--bg3)', color: editSem === s ? '#0e0e0e' : 'var(--text-2)', cursor: 'pointer', fontWeight: editSem === s ? 700 : 400, transition: 'all .1s' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                style={{ background: saved ? 'var(--bg3)' : 'var(--lime)', color: saved ? 'var(--lime)' : '#0e0e0e', border: saved ? '1px solid var(--lime-border)' : 'none', padding: '14px 32px', ...grotesk, fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start', transition: 'all .2s' }}>
                {saving ? 'SAVING...' : saved ? 'SAVED ✓' : 'SAVE CHANGES →'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* right margin */}
      <div style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ ...mono, fontSize: '9px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--border-2)', writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
          PREPWISE // RELEASE_CANDIDATE // ACTIVE
        </span>
      </div>
    </div>
  )
}
