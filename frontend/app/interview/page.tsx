// Mock interview: session setup, the live question and answer screen, and the debrief.
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, RATE_LIMIT_MESSAGE } from '@/lib/api'
import { DEFAULTS_KEY, capFirst } from '@/lib/stats'
import PageShell from '@/components/PageShell'
import { optionStyle, cardBase, fieldStyle } from '@/lib/ui'
import PageHeader from '@/components/PageHeader'
import { PageSkeleton } from '@/components/Skeleton'
import MicHelp from '@/components/MicHelp'
import { useToast } from '@/components/Toast'
import ScoreRing from '@/components/ScoreRing'
import ClaimsList, { type Claim } from '@/components/ClaimsList'
import Dropdown from '@/components/Dropdown'
import subjectList from '@/data/subjects.json'


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
  is_follow_up?: boolean
}

type AnswerResult = {
  score: number
  hint: string
  ideal_answer: string
  weak_areas: string[]
  claims?: Claim[]
}

type SessionQuestion = Question & { answer: string; result: AnswerResult | null; time_taken?: number }
type Profile = { university?: string; semester?: number }
type Syllabus = { id?: string; name?: string; topics?: string[]; raw_chunks?: string[]; vectors?: Record<string, unknown>[] }
type Debrief = { debrief: string; avg_score: number; weak_topics?: string[] }
type SpeechRec = { continuous: boolean; interimResults: boolean; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start(): void; stop(): void }
type SpeechRecCtor = new () => SpeechRec
type Phase = 'setup' | 'interview' | 'debrief'

// A soft target only: nothing stops the student going over it.
const SOFT_TARGET_SECONDS = 180

// The assessment is written as four sentences: overall, strongest moment, biggest gap, next action.
// Only split it when it really has that shape, otherwise show it unchanged.
function splitAssessment(text: string) {
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length !== 4) return null
  return [
    { title: 'OVERALL', text: sentences[0] },
    { title: 'STRENGTH', text: sentences[1] },
    { title: 'FIX NEXT', text: sentences[2] + ' ' + sentences[3] },
  ]
}

async function okJson(res: Response) {
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

const SESSION_KEY = 'pw_interview_session'
// Dropdown value for a subject the student types themselves.
const OTHER = '__other__'
const MAX_SUBJECT = 60
const SHORT_ANSWER_WORDS = 15

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function countClaims(claims: Claim[], verdict: Claim['verdict']) {
  return claims.filter(c => c.verdict === verdict).length
}

function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // The help panel starts open on wide screens and closed on phones.
  const [helpOpen, setHelpOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900)
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
  const [now, setNow] = useState(0)
  const [takenSeconds, setTakenSeconds] = useState<number | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const [startingSession, setStartingSession] = useState(false)

  const [debrief, setDebrief] = useState<Debrief | null>(null)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const [loadingDebrief, setLoadingDebrief] = useState(false)
  const [apiError, setApiError] = useState('')
  const [failedStep, setFailedStep] = useState<'start' | 'submit' | 'next' | 'debrief' | null>(null)
  const [waitSeconds, setWaitSeconds] = useState(0)
  const [slow, setSlow] = useState(false)
  const [confirmShort, setConfirmShort] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Set when the page is opened as /interview?topic=..., e.g. from the voice tutor.
  const [presetTopic, setPresetTopic] = useState('')
  // For the Subject-Specific type: keep every question on one subject from the shared list ('' = the whole syllabus).
  const [subjectPick, setSubjectPick] = useState('')
  const [otherSubject, setOtherSubject] = useState('')

const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionStartRef = useRef(0)
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<SpeechRec | null>(null)
  // The text typed before voice input started; recognised speech is added after it.
  const baseAnswerRef = useRef('')
  // The saved session row, so a retry after a failed answers save does not create a second session.
  const savedIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

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

      try {
        const d = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}')
        if (d.type in TYPE_MAP) setInterviewType(d.type)
        if ([5, 10, 15].includes(d.count)) setTotalQuestions(d.count)
      } catch { /* no saved defaults, or storage is blocked */ }
      try {
        const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
        if (saved && saved.phase === 'interview' && saved.currentQ && syll) {
          setInterviewType(saved.interviewType)
          setTargetCompany(saved.targetCompany)
          setTotalQuestions(saved.totalQuestions)
          setCurrentQ(saved.currentQ)
          setQNumber(saved.qNumber)
          setAnswer(saved.answer || '')
          setResult(saved.result || null)
          setSessionQuestions(saved.sessionQuestions || [])
          setTopicsPool(saved.topicsPool || [])
          setAskedTopics(saved.askedTopics || [])
          // Time away counts: both clocks are wall-clock, so a refresh does not reset them.
          const away = typeof saved.savedAt === 'number' ? Math.max(0, Math.round((Date.now() - saved.savedAt) / 1000)) : 0
          setTimeLeft(Math.max(0, (saved.timeLeft ?? 900) - away))
          questionStartRef.current = typeof saved.questionStart === 'number' ? saved.questionStart : Date.now()
          setTakenSeconds(typeof saved.takenSeconds === 'number' ? saved.takenSeconds : null)
          setNow(Date.now())
          setPhase('interview')
        }
      } catch { /* nothing saved, or storage is blocked */ }
      setProfile(prof)
      setSyllabus(syll)
      setPresetTopic((new URLSearchParams(window.location.search).get('topic') || '').trim().slice(0, 120))
      setLoadingProfile(false)
    }
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'interview') return
    timerRef.current = setInterval(() => {
      setNow(Date.now())
      setTimeLeft(t => {
        if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const elapsed = takenSeconds ?? Math.max(0, Math.round((now - questionStartRef.current) / 1000))
  const ariaState: 'idle' | 'listening' | 'thinking' | 'evaluated' = submitting ? 'thinking' : result ? 'evaluated' : listening ? 'listening' : 'idle'
  // Average score per topic for the chart, weakest first so the problem areas are at the top.
  const topicAverages = (() => {
    const map = new Map<string, number[]>()
    for (const q of sessionQuestions) map.set(q.topic, [...(map.get(q.topic) || []), q.result?.score || 0])
    return [...map.entries()]
      .map(([topic, v]) => ({ topic, avg: Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10 }))
      .sort((x, y) => x.avg - y.avg)
      .slice(0, 8)
  })()
  const assessmentParts = debrief ? splitAssessment(debrief.debrief) : null
  // Average over the answers that were timed; null when none were.
  const timed = sessionQuestions.filter(q => q.time_taken !== undefined)
  const avgSeconds = timed.length ? Math.round(timed.reduce((a, q) => a + (q.time_taken ?? 0), 0) / timed.length) : null

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  // Save the live session in this tab so a refresh can pick it up again. Cleared when the session ends.
  useEffect(() => {
    if (phase !== 'interview' || !currentQ) return
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        phase, interviewType, targetCompany, totalQuestions, currentQ, qNumber, answer, result,
        sessionQuestions, topicsPool, askedTopics, timeLeft,
        questionStart: questionStartRef.current, takenSeconds, savedAt: Date.now(),
      }))
    } catch { /* storage full or blocked: the session just will not survive a refresh */ }
  }, [phase, interviewType, targetCompany, totalQuestions, currentQ, qNumber, answer, result, sessionQuestions, topicsPool, askedTopics, timeLeft, takenSeconds])

  // After scoring, bring the score card into view so it is never below the fold.
  useEffect(() => {
    if (result) scoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [result])

  async function copySummary() {
    if (!debrief) return
    const lines = [
      `Prepwise session: ${debrief.avg_score}/10, ${sessionQuestions.length} answered`,
      debrief.debrief,
      ...sessionQuestions.map((q, i) => `Q${i + 1} (${q.result?.score ?? 0}/10): ${q.question}`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n\n'))
      toast('Summary copied.')
    } catch { toast('Could not copy. Select the text and copy it by hand.', 'error') }
  }

  // Detach first so a late result from the old question can never write into the next one.
  function stopRecognition() {
    const rec = recognitionRef.current
    recognitionRef.current = null
    if (rec) {
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      try { rec.stop() } catch { /* already stopped */ }
    }
    setVoiceMode(false)
    setListening(false)
  }

  // Release the microphone when leaving the page.
  useEffect(() => () => {
    const rec = recognitionRef.current
    if (rec) { rec.onresult = null; rec.onend = null; rec.onerror = null; try { rec.stop() } catch { /* ignore */ } }
  }, [])

  function exitSession() {
    if (sessionQuestions.length > 0 && !window.confirm('Leave now? Answers so far will not be saved. Use END SESSION to save them.')) return
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    router.push('/dashboard')
  }

  // Asks before leaving a debrief whose save failed, because the answers would be lost.
  function leaveUnsaved() {
    return !saveError || window.confirm('This session has not been saved. Leave anyway?')
  }

  // Back to a clean setup screen: no stored practise topic, question number or leftovers.
  function newSession() {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    savedIdRef.current = null
    baseAnswerRef.current = ''
    setPresetTopic('')
    try { window.history.replaceState(null, '', '/interview') } catch { /* ignore */ }
    setPhase('setup')
    setSessionQuestions([])
    setDebrief(null)
    setCurrentQ(null)
    setQNumber(1)
    setAskedTopics([])
    setTopicsPool([])
    setTimeLeft(900)
    setResult(null)
    setAnswer('')
    setTakenSeconds(null)
    setSavedSessionId(null)
    setSaveError('')
    setApiError('')
    setFailedStep(null)
  }

  function startQuestionClock() {
    questionStartRef.current = Date.now()
    setNow(questionStartRef.current)
    setTakenSeconds(null)
  }

  function showApiError(err: unknown, step: 'start' | 'submit' | 'next' | 'debrief') {
    setFailedStep(step)
    if (err instanceof Error && err.message === RATE_LIMIT_MESSAGE) {
      setApiError(RATE_LIMIT_MESSAGE)
      setWaitSeconds((err as Error & { retryAfter?: number }).retryAfter ?? 30)
    } else {
      setApiError('The server did not answer properly. Your answer is still here.')
      setWaitSeconds(0)
    }
  }

  function retry() {
    const step = failedStep
    setApiError('')
    setFailedStep(null)
    if (step === 'start') startSession()
    else if (step === 'submit') submitAnswer()
    else if (step === 'next') nextQuestion()
    else if (step === 'debrief') fetchDebrief()
  }

  // Counts a rate-limit wait down to zero, one second at a time.
  useEffect(() => {
    if (waitSeconds <= 0) return
    const t = setTimeout(() => setWaitSeconds(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [waitSeconds])

  // Tell the student when the server is slow instead of leaving a silent spinner.
  const waiting = submitting || startingSession || loadingDebrief
  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setSlow(true), startingSession ? 4000 : 8000)
    return () => { clearTimeout(t); setSlow(false) }
  }, [waiting, startingSession])

  // A practise topic wins; otherwise the chosen subject when the type is Subject-Specific.
  const focusTopic = presetTopic || (interviewType === 'subject' ? (subjectPick === OTHER ? otherSubject.trim() : subjectPick) : '')
  const needsOtherText = interviewType === 'subject' && !presetTopic && subjectPick === OTHER && !otherSubject.trim()

  async function startSession() {
    if (!syllabus) { router.push('/onboarding'); return }
    setStartingSession(true)
    setApiError('')

    const body = {
      university: profile?.university || '',
      semester: profile?.semester || 5,
      interview_type: interviewType,
      target_company: targetCompany,
      total_questions: totalQuestions,
      // A preset topic is sent alone, so every question stays on it.
      topics: focusTopic ? [focusTopic] : syllabus.topics || [],
      raw_chunks: focusTopic ? [] : syllabus.raw_chunks || [],
      chunks_metadata: focusTopic ? [] : syllabus.vectors || [],
    }

    let data
    try {
      const res = await apiFetch('/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      data = await okJson(res)
    } catch (err) {
      showApiError(err, 'start')
      setStartingSession(false)
      return
    }
    setCurrentQ(data)
    setTopicsPool(data.topics_pool || syllabus.topics || [])
    setAskedTopics([data.topic])
    setQNumber(1)
    startQuestionClock()
    setPhase('interview')
    setStartingSession(false)
  }

  function trySubmit() {
    if (submitting || result || !currentQ || !answer.trim()) return
    if (countWords(answer) < SHORT_ANSWER_WORDS && !confirmShort) { setConfirmShort(true); return }
    setConfirmShort(false)
    submitAnswer()
  }

  async function submitAnswer() {
    if (!currentQ || !answer.trim()) return
    stopRecognition()
    setSubmitting(true)

    setApiError('')
    const taken = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000))
    let evalResult
    try {
      const res = await apiFetch('/interview/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          answer,
          topic: currentQ.topic,
          expected_keywords: currentQ.expected_keywords,
          ideal_answer_hint: currentQ.ideal_answer_hint,
          time_taken_seconds: taken,
        }),
      })
      evalResult = await okJson(res)
    } catch (err) {
      showApiError(err, 'submit')
      setSubmitting(false)
      return
    }
    setResult(evalResult)
    setTakenSeconds(taken)
    setSessionQuestions(prev => [...prev, { ...currentQ, answer, result: evalResult, time_taken: taken }])
    setSubmitting(false)
  }

  async function nextQuestion() {
    if (qNumber >= totalQuestions) { await fetchDebrief(); return }
    stopRecognition()
    baseAnswerRef.current = ''
    const nextNum = qNumber + 1
    setQNumber(nextNum)
    setAnswer('')
    setResult(null)
    setSubmitting(true)

    setApiError('')
    let data
    try {
      const res = await apiFetch('/interview/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university: profile?.university || '',
          semester: profile?.semester || 5,
          interview_type: interviewType,
          target_company: targetCompany,
          asked_topics: askedTopics,
          last_result: { question: currentQ?.question || '', topic: currentQ?.topic || '', score: result?.score ?? 10, weak_areas: result?.weak_areas || [], claims: result?.claims || [] },
          last_was_follow_up: !!currentQ?.is_follow_up,
          follow_ups_so_far: sessionQuestions.filter(q => q.is_follow_up).length,
          total_questions: totalQuestions,
          previous_questions: sessionQuestions.map(q => q.question),
          question_number: nextNum,
          topics: topicsPool,
          raw_chunks: focusTopic ? [] : syllabus?.raw_chunks || [],
          chunks_metadata: focusTopic ? [] : syllabus?.vectors || [],
        }),
      })
      data = await okJson(res)
    } catch (err) {
      // Put the previous question back so the user can retry.
      showApiError(err, 'next')
      setQNumber(qNumber)
      setAnswer(answer)
      setResult(result)
      setSubmitting(false)
      return
    }
    setCurrentQ(data)
    startQuestionClock()
    // A follow-up stays on the same topic, so the topic is only recorded once.
    if (!data.is_follow_up) setAskedTopics(prev => [...prev, data.topic])
    setSubmitting(false)
  }

  async function fetchDebrief() {
    stopRecognition()
    setLoadingDebrief(true)
    setSavedSessionId(null)
    setSaveError('')
    savedIdRef.current = null
    setPhase('debrief')
    if (timerRef.current) clearInterval(timerRef.current)

    const scores = sessionQuestions.map(q => q.result?.score || 0)
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0

    setApiError('')
    let data
    try {
      const res = await apiFetch('/interview/debrief', {
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
      data = await okJson(res)
    } catch (err) {
      // The answers and the stored session stay as they are, so Retry picks up where this left off.
      showApiError(err, 'debrief')
      setPhase('interview')
      setLoadingDebrief(false)
      return
    }
    const full: Debrief = { ...data, avg_score: avgScore }
    setDebrief(full)
    setLoadingDebrief(false)
    await saveSession(full)
  }

  // Saves the session and its answers. The stored copy is cleared only when both writes succeed.
  async function saveSession(d: Debrief) {
    setSaveError('')
    // An early end with nothing answered has nothing worth saving.
    if (sessionQuestions.length === 0) {
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      let id = savedIdRef.current
      if (!id) {
        const { data: session, error } = await supabase.from('sessions').insert({
          user_id: user.id,
          syllabus_id: syllabus?.id || null,
          interview_type: interviewType,
          target_company: targetCompany,
          // The number actually answered, which is lower than the configured count when the session ends early.
          total_questions: sessionQuestions.length,
          score_avg: d.avg_score,
          weak_topics: d.weak_topics || [],
          completed: true,
        }).select().single()
        if (error || !session) throw error ?? new Error('No session returned')
        id = session.id as string
        savedIdRef.current = id
      }
      const rows = sessionQuestions.map(q => ({
        session_id: id,
        question_text: q.question,
        user_answer: q.answer,
        score: q.result?.score || 0,
        hint: q.result?.hint || '',
        ideal_answer: q.result?.ideal_answer || '',
      }))
      // The extra columns come from docs/migrations/question_extras.sql; until it is applied, save the basic rows.
      const extras = sessionQuestions.map((q, i) => ({ ...rows[i], claims: q.result?.claims ?? null, time_taken_seconds: q.time_taken ?? null, is_follow_up: !!q.is_follow_up }))
      let { error } = await supabase.from('questions').insert(extras)
      if (error) ({ error } = await supabase.from('questions').insert(rows))
      if (error) throw error
      setSavedSessionId(id)
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    } catch (err) {
      console.error('Session save error:', err)
      setSaveError('Your session could not be saved. Your answers are still here. Check your connection and try again.')
    }
  }

  function toggleVoice() {
    if (voiceMode) { stopRecognition(); return }
    const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      setVoiceNote('Voice input is not supported in this browser. Use Chrome or Edge, or type your answer.')
      return
    }
    setVoiceNote('')
    // Results are cumulative for one recognition run, so each result replaces the whole spoken part after the typed text.
    baseAnswerRef.current = answer.trim() ? answer.trimEnd() + ' ' : ''
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      if (recognitionRef.current !== rec) return
      const spoken = Array.from(e.results).map(r => r[0].transcript).join('').trim()
      setAnswer(baseAnswerRef.current + spoken)
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setVoiceNote('The microphone is blocked. Allow it in the browser address bar, or type your answer.')
        stopRecognition()
      }
    }
    // The browser can end a run by itself, for example after silence.
    rec.onend = () => {
      if (recognitionRef.current !== rec) return
      recognitionRef.current = null
      setVoiceMode(false)
      setListening(false)
      setVoiceNote('Voice input stopped. Press VOICE to continue.')
    }
    recognitionRef.current = rec
    try { rec.start() } catch { recognitionRef.current = null; setVoiceNote('Voice input could not start. Type your answer instead.'); return }
    setVoiceMode(true)
    setListening(true)
  }

  if (loadingProfile) {
    return <PageShell><PageSkeleton rows={3} /></PageShell>
  }

  const errorBar = apiError ? (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '0 0 12px' }}>
      <span style={{ fontSize: '14px', color: '#ef4444' }}>
        {waitSeconds > 0 ? `Too many requests. Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'}.` : apiError}
      </span>
      {failedStep && (
        <button type="button" onClick={retry} disabled={waitSeconds > 0}
          style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 16px', minHeight: '40px' }}>
          RETRY
        </button>
      )}
    </div>
  ) : null

  // ── SETUP ──
  if (phase === 'setup') {
    return (
      <PageShell>
        <div>
          <PageHeader label="NEW SESSION" title="Configure your session" />

          {syllabus ? (
            <p style={{ fontSize: '13px', color: 'var(--lime)', marginBottom: '32px' }}>
              ✓ {syllabus.name} · {(syllabus.topics || []).length} TOPICS READY
            </p>
          ) : (
            <div style={{ ...mono, fontSize: '12px', color: '#f59e0b', letterSpacing: '.06em', marginBottom: '32px', padding: '12px 16px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              ⚠ NO SYLLABUS FOUND - <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/onboarding')}>UPLOAD ONE FIRST</span>
            </div>
          )}

          {presetTopic && (
            <p style={{ fontSize: '13px', color: 'var(--lime)', margin: '-20px 0 32px' }}>
              ✓ TOPIC FOR THIS SESSION: {presetTopic.toUpperCase()}
            </p>
          )}


          <div className="page-cols">
          <div>
          {/* interview type */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>INTERVIEW TYPE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.entries(TYPE_MAP).map(([id, label]) => (
                <div key={id} onClick={() => setInterviewType(id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => setInterviewType(id))() } }}
                  aria-pressed={interviewType === id} style={{ ...optionStyle(interviewType === id), display: 'flex' }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {interviewType === 'subject' && !presetTopic && (
            <div style={{ marginBottom: '28px' }}>
              <Dropdown label="Subject" value={subjectPick}
                onChange={setSubjectPick}
                options={[{ value: '', label: 'All my syllabus topics' }, ...subjectList.map(s => ({ value: s.name, label: s.name })), { value: OTHER, label: 'Other (type a subject)' }]} />
              {subjectPick === OTHER && (
                <input value={otherSubject} onChange={e => setOtherSubject(e.target.value.slice(0, MAX_SUBJECT))} maxLength={MAX_SUBJECT}
                  placeholder="Type a subject, e.g. Digital Logic" aria-label="Subject"
                  style={{ ...fieldStyle, width: '100%', marginTop: '12px' }} />
              )}
            </div>
          )}

          {/* target */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>TARGET COMPANY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.entries(COMPANY_MAP).map(([id, label]) => (
                <div key={id} onClick={() => setTargetCompany(id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => setTargetCompany(id))() } }}
                  aria-pressed={targetCompany === id} style={{ ...optionStyle(targetCompany === id), display: 'flex' }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* question count */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>NUMBER OF QUESTIONS</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[5, 10, 15].map(n => (
                <div key={n} onClick={() => setTotalQuestions(n)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (() => setTotalQuestions(n))() } }}
                  aria-pressed={totalQuestions === n} style={{ ...optionStyle(totalQuestions === n), minWidth: '64px', justifyContent: 'center' }}>
                  {n}
                </div>
              ))}
            </div>
          </div>

          {errorBar}
          {slow && startingSession && <p role="status" style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '12px' }}>Waking the server, this can take up to a minute.</p>}
          <div>
            <button onClick={startSession} disabled={startingSession || !syllabus || needsOtherText}
              style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: (startingSession || !syllabus || needsOtherText) ? 'not-allowed' : 'pointer', opacity: (startingSession || !syllabus || needsOtherText) ? 0.5 : 1 }}>
              {startingSession ? 'LOADING SESSION...' : 'START SESSION →'}
            </button>
          </div>
          </div>
          <aside className="page-aside">
          <details open={helpOpen} onToggle={e => setHelpOpen((e.currentTarget as HTMLDetailsElement).open)} style={{ ...cardBase, padding: '8px 24px 16px' }}>
            <summary style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', fontSize: '20px', fontWeight: 600 }}>How a session works</summary>
            <ul style={{ listStyle: 'none', display: 'grid', gap: '14px', fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginTop: '8px' }}>
              <li><strong style={{ color: 'var(--text)' }}>Device.</strong> Chrome or Edge on a laptop or desktop for voice answers. Typing works anywhere.</li>
              <li><strong style={{ color: 'var(--text)' }}>Timer.</strong> A 15 minute session clock and a 3 minute target per answer. Neither cuts you off.</li>
              <li><strong style={{ color: 'var(--text)' }}>Follow-ups.</strong> A weak or doubtful answer may get one follow-up, at most a third of the session.</li>
              <li><strong style={{ color: 'var(--text)' }}>Ending early.</strong> Press End session at any time. Only answered questions are saved and scored.</li>
              <li><strong style={{ color: 'var(--text)' }}>Shortcut.</strong> Ctrl+Enter (Cmd+Enter on Mac) submits your answer.</li>
            </ul>
          </details>
          </aside>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── INTERVIEW ──
  if (phase === 'interview') {
    return (
      <div className="interview-root" style={{ background: 'var(--bg)', color: 'var(--text)', ...grotesk }}>

        {/* TOP BAR */}
        <div className="interview-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '52px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={exitSession} aria-label="Exit the interview and go to the dashboard"
            style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', padding: '6px 14px', cursor: 'pointer' }}>
            ← EXIT
          </button>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{TYPE_MAP[interviewType]}</span>
            <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{COMPANY_MAP[targetCompany]}</span>
            <span style={{ ...mono, fontSize: '12px', color: 'var(--lime)', fontWeight: 700, letterSpacing: '.06em' }}>QUESTION {qNumber} OF {totalQuestions}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '13px', color: timeLeft < 120 ? '#ef4444' : 'var(--text-2)', fontWeight: 700 }}>{formatTime(timeLeft)}</span>
            <button onClick={fetchDebrief} style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', padding: '6px 14px', cursor: 'pointer' }}>
              END SESSION
            </button>
          </div>
        </div>

        <div role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={totalQuestions} aria-valuenow={sessionQuestions.length}
          style={{ height: '4px', background: 'var(--bg4)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${Math.min(100, (sessionQuestions.length / totalQuestions) * 100)}%`, background: 'var(--lime)', transition: 'width .3s ease' }} />
        </div>

        {/* SPLIT */}
        <div className="interview-split">

          {/* LEFT - ARIA */}
          <div className="interview-pane" style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
              <span style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>[ARIA]</span>
              <div className="aria-bars" data-state={ariaState} aria-hidden="true">
                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.3, 0.7, 1, 0.5].map((h, i) => (
                  <div key={i} className="aria-bar" style={{ height: `${h * 48}px`, animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
              <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ariaState === 'idle' ? 'var(--text-3)' : 'var(--lime)' }} />
                <span style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: ariaState === 'idle' ? 'var(--text-2)' : 'var(--lime)' }}>
                  {{ idle: 'READY FOR YOUR ANSWER', listening: 'LISTENING', thinking: 'CHECKING YOUR CLAIMS', evaluated: 'EVALUATED' }[ariaState]}
                </span>
                {slow && submitting && <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>Still working. The server is slower than usual.</span>}
              </div>
            </div>

            <div style={{ padding: '32px', flex: 1 }}>
              {currentQ ? (
                <>
                  <span style={{ ...mono, fontSize: '12px', color: 'var(--lime)', letterSpacing: '.1em', marginBottom: '16px', display: 'block' }}>[Q.{String(qNumber).padStart(2, '0')}]</span>
                  <p style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.5, color: 'var(--text)', marginBottom: '20px' }}>{currentQ.question}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                      {currentQ.topic_tag?.replace(/_/g, ' ') || currentQ.topic}
                    </span>
                    {currentQ.is_follow_up && (
                      <span style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid var(--lime-border)', color: 'var(--lime)' }}>
                        FOLLOW-UP
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>Loading question...</div>
              )}
            </div>

            {result && (
              <div ref={scoreRef} role="status" aria-live="polite" style={{ margin: '0 32px 32px', padding: '20px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '56px', fontWeight: 700, color: scoreColor(result.score), lineHeight: 1, ...mono }}>{result.score}</span>
                    <span style={{ ...mono, fontSize: '14px', color: 'var(--text-2)' }}>/10</span>
                  </span>
                  {result.claims && result.claims.length > 0 && (
                    <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.04em' }}>
                      <span style={{ color: '#d4fe42' }}>{countClaims(result.claims, 'correct')} correct</span>
                      {' / '}<span style={{ color: '#ef4444' }}>{countClaims(result.claims, 'incorrect')} incorrect</span>
                      {' / '}<span style={{ color: '#f59e0b' }}>{countClaims(result.claims, 'unverifiable')} unverifiable</span>
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7 }}>{result.hint}</p>
                <ClaimsList claims={result.claims} />
                <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '12px' }}>Scores come from a language model. Treat them as a guide.</p>
              </div>
            )}
          </div>

          {/* RIGHT - ANSWER */}
          <div className="interview-right">
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>[YOUR ANSWER]</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={stopRecognition}
                  style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 12px', border: '1px solid var(--border)', background: !voiceMode ? 'var(--lime)' : 'transparent', color: !voiceMode ? '#0e0e0e' : 'var(--text-3)', cursor: 'pointer' }}>
                  TEXT
                </button>
                <button onClick={toggleVoice}
                  style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 12px', border: '1px solid var(--border)', background: voiceMode ? 'var(--lime)' : 'transparent', color: voiceMode ? '#0e0e0e' : 'var(--text-3)', cursor: 'pointer' }}>
                  VOICE {listening ? '●' : '○'}
                </button>
              </div>
            </div>

            {(voiceMode || voiceNote) && (
              <div style={{ padding: '8px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {voiceNote && <p role="alert" style={{ fontSize: '14px', color: '#f59e0b', marginBottom: '4px' }}>{voiceNote}</p>}
                <MicHelp blocked={!!voiceNote} />
              </div>
            )}

            <div className="interview-scroll" style={{ padding: '24px' }}>
              {result ? (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8, marginBottom: '24px' }}>{answer}</p>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '10px' }}>IDEAL ANSWER</div>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8 }}>{result.ideal_answer}</p>
                  </div>
                </div>
              ) : (
                <textarea value={answer} onChange={e => { setAnswer(e.target.value); setConfirmShort(false) }}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); trySubmit() } }}
                  aria-label="Your answer"
                  placeholder="Start typing your answer..." disabled={submitting}
                  style={{ width: '100%', height: '100%', minHeight: '300px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '15px', color: 'var(--text)', lineHeight: 1.8, caretColor: 'var(--lime)' }} />
              )}
            </div>

            <div className="interview-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
              <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.06em' }}>
                {answer.trim().split(/\s+/).filter(Boolean).length} WORDS
                <span style={{ marginLeft: '16px', color: elapsed > SOFT_TARGET_SECONDS ? '#f59e0b' : 'var(--text-3)' }}>
                  {formatTime(elapsed)} / TARGET {formatTime(SOFT_TARGET_SECONDS)}
                </span>
                {!result && <span style={{ marginLeft: '16px' }}>CTRL+ENTER TO SUBMIT</span>}
              </span>
              {errorBar}
              {confirmShort && !result && (
                <div role="alertdialog" aria-label="Submit a short answer?" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', order: -1 }}>
                  <span style={{ fontSize: '14px', color: '#f59e0b' }}>Submit a short answer? It has {countWords(answer)} word{countWords(answer) === 1 ? '' : 's'}.</span>
                  <button type="button" onClick={() => { setConfirmShort(false); submitAnswer() }} style={{ ...mono, fontSize: '12px', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '8px 16px', minHeight: '40px', fontWeight: 700 }}>SUBMIT ANYWAY</button>
                  <button type="button" onClick={() => setConfirmShort(false)} style={{ ...mono, fontSize: '12px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '8px 16px', minHeight: '40px' }}>KEEP WRITING</button>
                </div>
              )}
              {result ? (
                <button onClick={nextQuestion}
                  style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '12px 28px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {qNumber >= totalQuestions ? 'VIEW DEBRIEF →' : 'NEXT QUESTION →'}
                </button>
              ) : (
                <button onClick={trySubmit} disabled={submitting || !answer.trim()}
                  style={{ background: submitting || !answer.trim() ? 'var(--bg4)' : 'var(--lime)', color: submitting || !answer.trim() ? 'var(--text-3)' : '#0e0e0e', border: 'none', padding: '12px 28px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer', transition: 'all .1s' }}>
                  {submitting ? 'EVALUATING...' : 'SUBMIT ANSWER →'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    )
  }

  // ── DEBRIEF ──
  return (
    <div className="print-doc" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk, padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <PageHeader label="SESSION COMPLETE" title="Session debrief" />

        {loadingDebrief ? (
          <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.08em' }}>ARIA IS ANALYSING YOUR SESSION...</div>
        ) : debrief && (
          <>
            {saveError && (
              <div role="alert" className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: 'var(--space-3)', padding: '12px 16px', border: '1px solid rgba(239,68,68,0.5)' }}>
                <span style={{ fontSize: '14px', color: '#ef4444' }}>{saveError}</span>
                <button type="button" onClick={() => saveSession(debrief)}
                  style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 16px', minHeight: '40px' }}>
                  RETRY SAVE
                </button>
              </div>
            )}
            <div data-print-card style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap', ...cardBase, padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              <ScoreRing score={debrief.avg_score} />
              <div style={{ flex: 1, minWidth: '240px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-2)' }}>
                {[
                  { label: 'ANSWERED', value: String(sessionQuestions.length), suffix: sessionQuestions.length < totalQuestions ? ` of ${totalQuestions}` : '' },
                  { label: 'AVG TIME / ANSWER', value: avgSeconds === null ? '-' : formatTime(avgSeconds), suffix: '' },
                  { label: 'WEAK TOPICS', value: String(debrief.weak_topics?.length || 0), suffix: '' },
                ].map(st => (
                  <div key={st.label} style={{ border: '1px solid var(--border)', padding: 'var(--space-3)' }}>
                    <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.1em', marginBottom: 'var(--space-1)' }}>{st.label}</div>
                    <div style={{ ...mono, fontSize: '28px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{st.value}<span style={{ fontSize: '14px', color: 'var(--text-2)' }}>{st.suffix}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>Scores come from a language model. Treat them as a guide.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              {(assessmentParts ?? [{ title: 'ASSESSMENT', text: debrief.debrief }]).map(part => (
                <div key={part.title} data-print-card style={{ background: 'var(--bg2)', border: `1px solid ${part.title === 'STRENGTH' ? 'var(--lime-border)' : part.title === 'FIX NEXT' ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, padding: 'var(--space-4)', gridColumn: part.title === 'OVERALL' || part.title === 'ASSESSMENT' ? '1 / -1' : undefined }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: part.title === 'STRENGTH' ? 'var(--lime)' : part.title === 'FIX NEXT' ? '#f59e0b' : 'var(--text-2)', marginBottom: 'var(--space-2)' }}>{part.title}</div>
                  <p style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text)', maxWidth: '65ch' }}>{part.text}</p>
                </div>
              ))}
            </div>

            {topicAverages.length > 0 && (
              <div data-print-card style={{ ...cardBase, padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>AVERAGE SCORE BY TOPIC</div>
                <svg width="100%" viewBox={`0 0 560 ${topicAverages.length * 32 + 8}`} role="img" aria-label={'Average score by topic: ' + topicAverages.map(t => `${t.topic} ${t.avg}`).join(', ')}>
                  {topicAverages.map((t, i) => (
                    <g key={t.topic} transform={`translate(0 ${i * 32 + 4})`}>
                      <text x="0" y="14" fill="var(--text)" style={{ fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>{t.topic.length > 26 ? t.topic.slice(0, 25) + '…' : t.topic}</text>
                      <rect x="190" y="2" width="300" height="16" fill="var(--bg4)" />
                      <rect x="190" y="2" width={300 * t.avg / 10} height="16" fill={scoreColor(t.avg)} />
                      <text x="500" y="14" fill="var(--text)" style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{t.avg}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {(debrief.weak_topics?.length ?? 0) > 0 && (
              <div data-print-card style={{ ...cardBase, padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>PRACTISE THESE NEXT</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {debrief.weak_topics!.map(t => (
                    <li key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text)' }}>{capFirst(t)}</span>
                      <Link href={`/interview?topic=${encodeURIComponent(t)}`} className="no-print"
                        style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--lime)', border: '1px solid var(--lime-border)', padding: '8px 14px', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>
                        PRACTISE THIS →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>QUESTION BREAKDOWN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessionQuestions.map((q, i) => (
                  <div key={i} data-print-card style={{ ...cardBase, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>Q{i + 1} · {q.topic}</span>
                        {q.is_follow_up && <span style={{ color: 'var(--lime)', border: '1px solid var(--lime-border)', padding: '0 6px' }}>FOLLOW-UP</span>}
                        {q.time_taken !== undefined && <span>{formatTime(q.time_taken)}</span>}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{q.question}</div>
                      {savedSessionId && (
                        <Link href={`/history?session=${savedSessionId}`} className="no-print"
                          style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', color: 'var(--lime)', display: 'inline-block', marginTop: '8px' }}>
                          OPEN IN HISTORY →
                        </Link>
                      )}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(q.result?.score || 0), ...mono, flexShrink: 0 }}>
                      {q.result?.score || 0}/10
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
              <button onClick={copySummary}
                style={{ flex: 1, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-2)', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                COPY SUMMARY
              </button>
              <button onClick={() => window.print()}
                style={{ flex: 1, background: 'transparent', color: 'var(--lime)', border: '1px solid var(--lime-border)', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                EXPORT PDF
              </button>
              <button onClick={() => { if (leaveUnsaved()) newSession() }}
                style={{ flex: 1, background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '16px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                NEW SESSION →
              </button>
              <button onClick={() => { if (leaveUnsaved()) router.push('/dashboard') }}
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
