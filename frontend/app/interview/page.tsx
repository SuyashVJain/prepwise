// prepwise-mono/frontend/app/interview/page.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const COMPANY_MAP: Record<string, string> = {
  faang: 'FAANG / Big Tech',
  product: 'Product Startups',
  service: 'Service Companies',
  core: 'Core CS Campus',
}

const TYPE_MAP: Record<string, string> = {
  technical: 'Technical',
  hr: 'HR / Behavioural',
  system_design: 'System Design',
  subject: 'Subject-Specific',
}

type Question = {
  question: string
  topic: string
  topic_tag: string
  expected_keywords: string[]
  ideal_answer_hint: string
}

type AnswerResult = {
  score: number
  hint: string
  ideal_answer: string
  weak_areas: string[]
}

type SessionQuestion = Question & { answer: string; result: AnswerResult | null }
type Phase = 'setup' | 'interview' | 'debrief'

function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [profile, setProfile] = useState<any>(null)
  const [syllabus, setSyllabus] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [interviewType, setInterviewType] = useState('technical')
  const [targetCompany, setTargetCompany] = useState('faang')
  const [totalQuestions, setTotalQuestions] = useState(5)

  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const [qNumber, setQNumber] = useState(1)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([])
  const [topicsPool, setTopicsPool] = useState<string[]>([])
  const [askedTopics, setAskedTopics] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(900)
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [startingSession, setStartingSession] = useState(false)

  const [debrief, setDebrief] = useState<any>(null)
  const [loadingDebrief, setLoadingDebrief] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const recognitionRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: syll }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('syllabi').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
      ])

      setProfile(prof)
      setSyllabus(syll)
      setLoadingProfile(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (phase !== 'interview') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  async function startSession() {
    if (!syllabus) { router.push('/onboarding'); return }
    setStartingSession(true)

    const body = {
      university: profile?.university || '',
      semester: profile?.semester || 5,
      interview_type: interviewType,
      target_company: targetCompany,
      total_questions: totalQuestions,
      topics: syllabus.topics || [],
      raw_chunks: syllabus.raw_chunks || [],
      chunks_metadata: syllabus.vectors || [],
    }

    const res = await fetch(`${API}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setCurrentQ(data)
    setTopicsPool(data.topics_pool || syllabus.topics || [])
    setAskedTopics([data.topic])
    setQNumber(1)
    setPhase('interview')
    setStartingSession(false)
  }

  async function submitAnswer() {
    if (!currentQ || !answer.trim()) return
    setSubmitting(true)

    const res = await fetch(`${API}/interview/submit-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: currentQ.question,
        answer,
        topic: currentQ.topic,
        expected_keywords: currentQ.expected_keywords,
        ideal_answer_hint: currentQ.ideal_answer_hint,
      }),
    })
    const evalResult = await res.json()
    setResult(evalResult)
    setSessionQuestions(prev => [...prev, { ...currentQ, answer, result: evalResult }])
    setSubmitting(false)
  }

  async function nextQuestion() {
    if (qNumber >= totalQuestions) { await fetchDebrief(); return }
    const nextNum = qNumber + 1
    setQNumber(nextNum)
    setAnswer('')
    setResult(null)
    setSubmitting(true)

    const res = await fetch(`${API}/interview/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        university: profile?.university || '',
        semester: profile?.semester || 5,
        interview_type: interviewType,
        target_company: targetCompany,
        asked_topics: askedTopics,
        previous_questions: sessionQuestions.map(q => q.question),
        question_number: nextNum,
        topics: topicsPool,
        raw_chunks: syllabus?.raw_chunks || [],
        chunks_metadata: syllabus?.vectors || [],
      }),
    })
    const data = await res.json()
    setCurrentQ(data)
    setAskedTopics(prev => [...prev, data.topic])
    setSubmitting(false)
  }

  async function fetchDebrief() {
    setLoadingDebrief(true)
    setPhase('debrief')
    clearInterval(timerRef.current)

    const scores = sessionQuestions.map(q => q.result?.score || 0)
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0

    const res = await fetch(`${API}/interview/debrief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: sessionQuestions.map(q => ({
          question: q.question,
          score: q.result?.score || 0,
          weak_areas: q.result?.weak_areas || [],
          topic: q.topic,
        })),
        interview_type: interviewType,
        target_company: targetCompany,
      }),
    })
    const data = await res.json()
    setDebrief({ ...data, avg_score: avgScore })
    setLoadingDebrief(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: session } = await supabase.from('sessions').insert({
        user_id: user.id,
        syllabus_id: syllabus?.id || null,
        interview_type: interviewType,
        target_company: targetCompany,
        total_questions: totalQuestions,
        score_avg: avgScore,
        weak_topics: data.weak_topics || [],
        completed: true,
      }).select().single()

      if (session) {
        await supabase.from('questions').insert(
          sessionQuestions.map(q => ({
            session_id: session.id,
            question_text: q.question,
            user_answer: q.answer,
            score: q.result?.score || 0,
            hint: q.result?.hint || '',
            ideal_answer: q.result?.ideal_answer || '',
          }))
        )
      }
    }
  }

  function toggleVoice() {
    if (!voiceMode) {
      setVoiceMode(true)
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) return
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e: any) => {
        const t = Array.from(e.results).map((r: any) => r[0].transcript).join('')
        setAnswer(t)
      }
      rec.start()
      recognitionRef.current = rec
      setListening(true)
    } else {
      setVoiceMode(false)
      recognitionRef.current?.stop()
      setListening(false)
    }
  }

  if (loadingProfile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>LOADING...</span>
      </div>
    )
  }

  // ── SETUP ──
  if (phase === 'setup') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[NEW SESSION]</div>
          <h1 style={{ fontSize: '42px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '8px' }}>Configure<br />your session</h1>

          {syllabus ? (
            <p style={{ ...mono, fontSize: '11px', color: 'var(--lime)', letterSpacing: '.06em', marginBottom: '32px' }}>
              ✓ {syllabus.name} · {(syllabus.topics || []).length} TOPICS · {(syllabus.raw_chunks || []).length} CHUNKS INDEXED
            </p>
          ) : (
            <div style={{ ...mono, fontSize: '11px', color: '#f59e0b', letterSpacing: '.06em', marginBottom: '32px', padding: '12px 16px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              ⚠ NO SYLLABUS FOUND - <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/onboarding')}>UPLOAD ONE FIRST</span>
            </div>
          )}

          {/* interview type */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>INTERVIEW TYPE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.entries(TYPE_MAP).map(([id, label]) => (
                <div key={id} onClick={() => setInterviewType(id)}
                  style={{ padding: '14px 16px', border: `1px solid ${interviewType === id ? 'var(--lime)' : 'var(--border)'}`, background: interviewType === id ? 'var(--lime-dim)' : 'var(--bg2)', cursor: 'pointer', transition: 'all .1s' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: interviewType === id ? 'var(--lime)' : 'var(--text)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* target */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>TARGET COMPANY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.entries(COMPANY_MAP).map(([id, label]) => (
                <div key={id} onClick={() => setTargetCompany(id)}
                  style={{ padding: '14px 16px', border: `1px solid ${targetCompany === id ? 'var(--lime)' : 'var(--border)'}`, background: targetCompany === id ? 'var(--lime-dim)' : 'var(--bg2)', cursor: 'pointer', transition: 'all .1s' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: targetCompany === id ? 'var(--lime)' : 'var(--text)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* question count */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>NUMBER OF QUESTIONS</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[5, 10, 15].map(n => (
                <div key={n} onClick={() => setTotalQuestions(n)}
                  style={{ padding: '12px 24px', border: `1px solid ${totalQuestions === n ? 'var(--lime)' : 'var(--border)'}`, background: totalQuestions === n ? 'var(--lime)' : 'var(--bg2)', cursor: 'pointer', ...mono, fontSize: '13px', fontWeight: 700, color: totalQuestions === n ? '#0e0e0e' : 'var(--text-2)', transition: 'all .1s' }}>
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--border)', padding: '14px 24px', cursor: 'pointer' }}>
              ← BACK
            </button>
            <button onClick={startSession} disabled={startingSession || !syllabus}
              style={{ flex: 1, background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (startingSession || !syllabus) ? 'not-allowed' : 'pointer', opacity: (startingSession || !syllabus) ? 0.5 : 1 }}>
              {startingSession ? 'LOADING SESSION...' : 'START SESSION →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── INTERVIEW ──
  if (phase === 'interview') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk, display: 'flex', flexDirection: 'column' }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '52px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{TYPE_MAP[interviewType]}</span>
            <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{COMPANY_MAP[targetCompany]}</span>
            <span style={{ ...mono, fontSize: '12px', color: 'var(--lime)', fontWeight: 700, letterSpacing: '.06em' }}>QUESTION {qNumber} OF {totalQuestions}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '13px', color: timeLeft < 120 ? '#ef4444' : 'var(--text-2)', fontWeight: 700 }}>{formatTime(timeLeft)}</span>
            <button onClick={fetchDebrief} style={{ ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--border)', padding: '6px 14px', cursor: 'pointer' }}>
              END SESSION
            </button>
          </div>
        </div>

        {/* SPLIT */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '45% 55%', overflow: 'hidden' }}>

          {/* LEFT - ARIA */}
          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>[ARIA]</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px' }}>
                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.3, 0.7, 1, 0.5].map((h, i) => (
                  <div key={i} style={{ width: '4px', height: `${h * 48}px`, background: 'var(--lime)', borderRadius: '2px', opacity: submitting ? 1 : 0.3 + (i % 3) * 0.2, animation: submitting ? `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate` : 'none' }} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: submitting ? 'var(--lime)' : 'var(--text-3)' }} />
                <span style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: submitting ? 'var(--lime)' : 'var(--text-3)' }}>
                  {submitting ? 'THINKING...' : result ? 'EVALUATED' : 'LISTENING...'}
                </span>
              </div>
            </div>

            <div style={{ padding: '32px', flex: 1 }}>
              {currentQ ? (
                <>
                  <span style={{ ...mono, fontSize: '11px', color: 'var(--lime)', letterSpacing: '.1em', marginBottom: '16px', display: 'block' }}>[Q.{String(qNumber).padStart(2, '0')}]</span>
                  <p style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.5, color: 'var(--text)', marginBottom: '20px' }}>{currentQ.question}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                      {currentQ.topic_tag?.replace(/_/g, ' ') || currentQ.topic}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ ...mono, fontSize: '12px', color: 'var(--text-3)' }}>Loading question...</div>
              )}
            </div>

            {result && (
              <div style={{ margin: '0 32px 32px', padding: '16px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: scoreColor(result.score), ...mono }}>{result.score}</span>
                  <span style={{ ...mono, fontSize: '12px', color: 'var(--text-3)' }}>/10</span>
                </div>
                <p style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.6 }}>{result.hint}</p>
              </div>
            )}
          </div>

          {/* RIGHT - ANSWER */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>[YOUR ANSWER]</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setVoiceMode(false); recognitionRef.current?.stop(); setListening(false) }}
                  style={{ ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 12px', border: '1px solid var(--border)', background: !voiceMode ? 'var(--lime)' : 'transparent', color: !voiceMode ? '#0e0e0e' : 'var(--text-3)', cursor: 'pointer' }}>
                  TEXT
                </button>
                <button onClick={toggleVoice}
                  style={{ ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 12px', border: '1px solid var(--border)', background: voiceMode ? 'var(--lime)' : 'transparent', color: voiceMode ? '#0e0e0e' : 'var(--text-3)', cursor: 'pointer' }}>
                  VOICE {listening ? '●' : '○'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
              {result ? (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8, marginBottom: '24px' }}>{answer}</p>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>IDEAL ANSWER</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.8 }}>{result.ideal_answer}</p>
                  </div>
                </div>
              ) : (
                <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                  placeholder="Start typing your answer..." disabled={submitting}
                  style={{ width: '100%', height: '100%', minHeight: '300px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '15px', color: 'var(--text)', lineHeight: 1.8, caretColor: 'var(--lime)' }} />
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.06em' }}>
                {answer.trim().split(/\s+/).filter(Boolean).length} WORDS
              </span>
              {result ? (
                <button onClick={nextQuestion}
                  style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '12px 28px', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {qNumber >= totalQuestions ? 'VIEW DEBRIEF →' : 'NEXT QUESTION →'}
                </button>
              ) : (
                <button onClick={submitAnswer} disabled={submitting || !answer.trim()}
                  style={{ background: submitting || !answer.trim() ? 'var(--bg4)' : 'var(--lime)', color: submitting || !answer.trim() ? 'var(--text-3)' : '#0e0e0e', border: 'none', padding: '12px 28px', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer', transition: 'all .1s' }}>
                  {submitting ? 'EVALUATING...' : 'SUBMIT ANSWER →'}
                </button>
              )}
            </div>
          </div>
        </div>

        <style>{`@keyframes pulse { from { opacity: 0.3; transform: scaleY(0.6); } to { opacity: 1; transform: scaleY(1); } }`}</style>
      </div>
    )
  }

  // ── DEBRIEF ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk, padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[SESSION COMPLETE]</div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '40px' }}>TECHNICAL<br />AUTOPSY</h1>

        {loadingDebrief ? (
          <div style={{ ...mono, fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.08em' }}>ARIA IS ANALYSING YOUR SESSION...</div>
        ) : debrief && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '32px' }}>
              {[
                { label: 'OVERALL SCORE', value: debrief.avg_score, color: scoreColor(debrief.avg_score), suffix: '/10' },
                { label: 'QUESTIONS', value: sessionQuestions.length, color: 'var(--lime)', suffix: '' },
                { label: 'WEAK TOPICS', value: debrief.weak_topics?.length || 0, color: '#f59e0b', suffix: '' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '20px' }}>
                  <div style={{ ...mono, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontSize: '48px', fontWeight: 700, color: s.color, ...mono, lineHeight: 1 }}>{s.value}<span style={{ fontSize: '16px', color: 'var(--text-3)' }}>{s.suffix}</span></div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: '24px', marginBottom: '24px' }}>
              <div style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '12px' }}>ARIA'S ASSESSMENT</div>
              <p style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--text-2)' }}>{debrief.debrief}</p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>QUESTION BREAKDOWN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessionQuestions.map((q, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>Q{i + 1} · {q.topic}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{q.question}</div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(q.result?.score || 0), ...mono, flexShrink: 0 }}>
                      {q.result?.score || 0}/10
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setPhase('setup'); setSessionQuestions([]); setDebrief(null); setTimeLeft(900); setResult(null); setAnswer('') }}
                style={{ flex: 1, background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                NEW SESSION →
              </button>
              <button onClick={() => router.push('/dashboard')}
                style={{ flex: 1, background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                BACK TO DASHBOARD
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
