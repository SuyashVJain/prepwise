'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { apiFetch, RATE_LIMIT_MESSAGE } from '@/lib/api'
import { TutorClient } from '@/lib/tutor/voiceClient'
import type { Citation, ProviderInfo, SyllabusPayload, TutorState, TurnEnd } from '@/lib/tutor/voiceClient'
import Sidebar from '@/components/Sidebar'
import PageShell from '@/components/PageShell'
import PageHeader from '@/components/PageHeader'
import MicHelp from '@/components/MicHelp'
import VideoPanel from '@/components/tutor/VideoPanel'
import RoadmapPanel from '@/components/tutor/RoadmapPanel'
import CodePanel from '@/components/tutor/CodePanel'
import WalkthroughPanel, { WALKTHROUGH_SUBJECTS } from '@/components/tutor/WalkthroughPanel'
import NotesPanel, { rememberNotes } from '@/components/tutor/NotesPanel'
import type { SessionNotes } from '@/components/tutor/NotesPanel'
import { disabled, eyebrow, ghostButton, label, mono, panel, primaryButton, tile } from '@/components/tutor/ui'
import subjects from '@/data/tutor-subjects.json'

type Mode = 'standalone' | 'documents'
type Phase = 'setup' | 'connecting' | 'session' | 'notes'
type NotesStatus = 'loading' | 'ready' | 'error' | 'empty'
type Message = {
  id: string
  role: 'student' | 'tutor'
  text: string
  turn?: number
  citations?: Citation[]
  note?: string
}
type Syllabus = SyllabusPayload & { name: string }
type SideTab = 'roadmap' | 'videos' | 'code' | 'visual'

// `only` limits a tab to some subjects.
const SIDE_TABS: { id: SideTab; label: string; only?: string[] }[] = [
  { id: 'roadmap', label: 'ROADMAP' },
  { id: 'videos', label: 'VIDEOS' },
  { id: 'visual', label: 'VISUAL', only: WALKTHROUGH_SUBJECTS },
  { id: 'code', label: 'CODE', only: ['python'] },
]

const STATE_COPY: Record<TutorState, { tag: string; hint: string }> = {
  idle: { tag: 'IDLE', hint: 'Hold the talk button, turn on hands-free, or type below.' },
  listening: { tag: 'LISTENING', hint: 'Go ahead, Aria is listening.' },
  thinking: { tag: 'THINKING', hint: 'Working out an answer.' },
  speaking: { tag: 'SPEAKING', hint: 'Start talking at any time to interrupt.' },
}

const DOUBT_LABELS: Record<string, string> = {
  simpler: 'SIMPLER WORDS',
  analogy: 'WITH AN ANALOGY',
  example: 'WITH AN EXAMPLE',
}

function providerLabel(info: ProviderInfo | null): string {
  if (!info) return 'LOADING'
  return info.fell_back ? `${info.active} (CLOUD FALLBACK)` : info.active
}

export default function TutorPage() {
  const router = useRouter()
  const clientRef = useRef<TutorClient | null>(null)
  const transcriptEnd = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('setup')
  const [subject, setSubject] = useState(subjects[0].name)
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<Mode>('standalone')
  const [hinglish, setHinglish] = useState(false)
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null)
  const [syllabusChecked, setSyllabusChecked] = useState(false)

  const [tutorState, setTutorState] = useState<TutorState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [handsFree, setHandsFree] = useState(false)
  const [holding, setHolding] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)
  const [level, setLevel] = useState(0)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [disconnected, setDisconnected] = useState(false)
  const [providers, setProviders] = useState<{ stt: ProviderInfo; tts: ProviderInfo } | null>(null)
  const [docsInfo, setDocsInfo] = useState<{ documents_loaded: boolean; chunks: number } | null>(null)
  const [lastTiming, setLastTiming] = useState<TurnEnd | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('roadmap')
  // Labels for tutor turns that arrive before the turn's first sentence, keyed by turn number.
  const [pendingNotes, setPendingNotes] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState<SessionNotes | null>(null)
  const [notesStatus, setNotesStatus] = useState<NotesStatus>('loading')
  const [notesError, setNotesError] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [repliesDone, setRepliesDone] = useState(0)

  // The student's latest syllabus, for the "use my documents" mode.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('syllabi').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (cancelled) return
      if (data) {
        setSyllabus({
          name: data.name || 'Syllabus',
          topics: data.topics || [],
          raw_chunks: data.raw_chunks || [],
          chunks_metadata: data.vectors || [],
          university: data.university || '',
          semester: data.semester || 0,
        })
      }
      setSyllabusChecked(true)
    }
    void load()
    return () => { cancelled = true }
  }, [router])

  // Close the socket and release the mic when leaving the page.
  useEffect(() => {
    const holder = clientRef
    return () => { holder.current?.close() }
  }, [])

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const subjectId = subjects.find(s => s.name === subject)?.id ?? ''
  const subjectTopics = subjects.find(s => s.name === subject)?.topics ?? []
  const sideTabs = SIDE_TABS.filter(tab => !tab.only || tab.only.includes(subjectId))
  const activeTab: SideTab = sideTabs.some(tab => tab.id === sideTab) ? sideTab : 'roadmap'

  async function startSession(topicOverride?: string) {
    const sessionTopic = (topicOverride ?? topic).trim()
    if (topicOverride !== undefined) setTopic(topicOverride)
    setError('')
    setDisconnected(false)
    setMessages([])
    setPendingNotes({})
    setProviders(null)
    setLastTiming(null)
    setPhase('connecting')

    const client = new TutorClient({
      onState: setTutorState,
      onStudentText: text => setMessages(prev => [...prev, { id: `s-${prev.length}-${Date.now()}`, role: 'student', text }]),
      onSentence: (turn, _seq, text) => setMessages(prev => {
        const index = prev.findIndex(m => m.role === 'tutor' && m.turn === turn)
        if (index === -1) return [...prev, { id: `t-${turn}`, role: 'tutor', text, turn }]
        const next = [...prev]
        next[index] = { ...next[index], text: `${next[index].text} ${text}` }
        return next
      }),
      onTurnEnd: end => {
        setLastTiming(end)
        if (!end.cancelled) setRepliesDone(n => n + 1)
        if (end.cancelled || end.refused) {
          setMessages(prev => prev.map(m => m.role === 'tutor' && m.turn === end.turn
            ? { ...m, note: end.cancelled ? 'INTERRUPTED' : 'NOT IN YOUR DOCUMENTS' } : m))
        }
      },
      onCitations: (turn, sources) => setMessages(prev => prev.map(m => m.role === 'tutor' && m.turn === turn ? { ...m, citations: sources } : m)),
      onDoubt: (turn, style) => setPendingNotes(prev => ({ ...prev, [turn]: `EXPLAINED AGAIN: ${DOUBT_LABELS[style] ?? style.toUpperCase()}` })),
      onProviders: (stt, tts) => setProviders({ stt, tts }),
      onReady: info => setDocsInfo(info),
      onError: (code, message) => {
        if (code === 'mic_denied' || code === 'mic_unavailable' || code === 'mic_unsupported') {
          setMicBlocked(true)
          setHandsFree(false)
          setHolding(false)
        }
        setError(code === 'rate_limited' ? RATE_LIMIT_MESSAGE : message)
      },
      onLevel: setLevel,
      onClosed: () => { setDisconnected(true); setTutorState('idle'); setHandsFree(false); setHolding(false) },
    })
    clientRef.current = client

    try {
      await client.connect()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the tutor service.')
      setPhase('setup')
      return
    }
    client.start({
      mode,
      subject,
      topic: sessionTopic,
      hinglish,
      speak: true,
      greet: true,
      syllabus: mode === 'documents' && syllabus ? syllabus : undefined,
    })
    setPhase('session')
  }

  const sessionTitle = (topic.trim() || subject).slice(0, 48)

  // One model call turns the transcript into a summary and flashcards.
  async function loadNotes() {
    setNotesStatus('loading')
    setNotesError('')
    setNotesSaved(false)
    try {
      const res = await apiFetch('/tutor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic: topic.trim(), transcript: messages.map(m => ({ role: m.role, text: m.text })) }),
      })
      if (res.status === 400) { setNotesStatus('empty'); return }
      if (!res.ok) throw new Error('Could not write notes for this session. Try again.')
      const data = await res.json() as SessionNotes
      setNotes(data)
      setNotesStatus('ready')
      rememberNotes(data, sessionTitle)
      // Saved to the account only if the tutor_notes table has been created; otherwise this fails quietly.
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: saveError } = await supabase.from('tutor_notes').insert({
          user_id: user.id, subject, topic: topic.trim(), mode, summary: data.summary, flashcards: data.flashcards,
        })
        setNotesSaved(!saveError)
      }
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Could not write notes for this session. Try again.')
      setNotesStatus('error')
    }
  }

  function closeSession() {
    clientRef.current?.close()
    clientRef.current = null
    setTutorState('idle')
    setHandsFree(false)
    setHolding(false)
    setError('')
  }

  function endSession() {
    closeSession()
    setNotes(null)
    setPhase('notes')
    void loadNotes()
  }

  function backToSetup() {
    closeSession()
    setPhase('setup')
  }

  // Move the running session to another roadmap topic.
  function switchTopic(title: string) {
    const client = clientRef.current
    if (!client) return
    setError('')
    setTopic(title)
    client.set({ topic: title })
    client.sendText(`Let us move on to ${title}. Start from the basics.`)
  }

  function toggleHinglish() {
    const next = !hinglish
    setHinglish(next)
    clientRef.current?.set({ hinglish: next })
  }

  async function toggleHandsFree() {
    const client = clientRef.current
    if (!client) return
    const next = !handsFree
    setError('')
    const ok = await client.setHandsFree(next)
    setHandsFree(ok && next)
  }

  async function holdStart() {
    const client = clientRef.current
    if (!client || holding) return
    setError('')
    setHolding(true)
    const ok = await client.pushToTalkStart()
    if (!ok) setHolding(false)
  }

  function holdEnd() {
    if (!holding) return
    setHolding(false)
    clientRef.current?.pushToTalkEnd(true)
  }

  function sendText() {
    const text = input.trim()
    if (!text || !clientRef.current) return
    setError('')
    setInput('')
    clientRef.current.sendText(text)
  }

  // ── NOTES ──
  if (phase === 'notes') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', fontFamily: "'Space Grotesk', sans-serif" }}>
        <Sidebar />
        <NotesPanel title={sessionTitle} status={notesStatus} notes={notes} error={notesError} saved={notesSaved} onRetry={loadNotes} onDone={backToSetup} interviewTopic={topic.trim() || subject} />
      </div>
    )
  }

  // ── SETUP ──
  if (phase !== 'session') {
    const docsUnavailable = syllabusChecked && !syllabus
    return (
      <PageShell>
        <div className="page-narrow">
          <PageHeader label="VOICE TUTOR" title="Learn by talking" subtitle="Pick a subject, say what confuses you, and interrupt whenever you want." />

          <div style={{ ...label, marginBottom: '12px' }}>SUBJECT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-2)', marginBottom: '28px' }}>
            {subjects.map(s => (
              <button key={s.id} type="button" onClick={() => { setSubject(s.name); setTopic('') }} style={tile(subject === s.name)}>
                {s.name}
              </button>
            ))}
          </div>

          <div style={{ ...label, marginBottom: '12px' }}>TOPIC (OPTIONAL)</div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. recursion, joins, deadlocks" maxLength={120}
            aria-label="Topic"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '14px', color: 'var(--text)', outline: 'none', marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
            {subjectTopics.map(t => (
              <button key={t} type="button" onClick={() => setTopic(t)}
                style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', background: topic === t ? 'var(--lime-dim)' : 'var(--bg4)', border: `1px solid ${topic === t ? 'var(--lime)' : 'var(--border)'}`, color: topic === t ? 'var(--lime)' : 'var(--text-2)' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Scrolls inside its own box so the start button stays within reach. */}
          <div style={{ marginBottom: '28px', maxHeight: '260px', overflowY: 'auto', paddingRight: 'var(--space-1)' }}>
            <RoadmapPanel subjectId={subjectId} currentTopic={topic} startLabel="START" onStart={title => { void startSession(title) }} />
          </div>

          <div style={{ ...label, marginBottom: '12px' }}>SOURCE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-2)', marginBottom: '12px' }}>
            <button type="button" onClick={() => setMode('standalone')} style={tile(mode === 'standalone')}>
              General knowledge
              <div style={{ ...mono, fontSize: '11px', fontWeight: 400, color: 'var(--text-3)', marginTop: '6px' }}>Aria teaches the topic from scratch.</div>
            </button>
            <button type="button" disabled={docsUnavailable} onClick={() => setMode('documents')} style={disabled(tile(mode === 'documents'), docsUnavailable)}>
              Use my documents
              <div style={{ ...mono, fontSize: '11px', fontWeight: 400, color: 'var(--text-3)', marginTop: '6px' }}>Answers only from your syllabus, with citations.</div>
            </button>
          </div>
          <p style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', color: syllabus ? 'var(--lime)' : 'var(--text-3)', marginBottom: '32px' }}>
            {!syllabusChecked ? 'CHECKING YOUR SYLLABUS...'
              : syllabus ? `✓ ${syllabus.name} · ${syllabus.topics.length} TOPICS · ${syllabus.raw_chunks.length} CHUNKS`
                : 'NO SYLLABUS UPLOADED YET. ADD ONE IN ONBOARDING TO USE THIS MODE.'}
          </p>

          <div style={{ ...label, marginBottom: '12px' }}>LANGUAGE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-2)', marginBottom: '32px' }}>
            <button type="button" onClick={() => setHinglish(false)} style={tile(!hinglish)}>English</button>
            <button type="button" onClick={() => setHinglish(true)} style={tile(hinglish)}>
              Hinglish
              <div style={{ ...mono, fontSize: '11px', fontWeight: 400, color: 'var(--text-3)', marginTop: '6px' }}>Hindi and English mixed. Code and terms stay in English.</div>
            </button>
          </div>

          {error && <div role="alert" style={{ ...mono, fontSize: '11px', color: '#ef4444', letterSpacing: '.06em', marginBottom: '12px' }}>{error}</div>}
          <button type="button" onClick={() => { void startSession() }} disabled={phase === 'connecting'} style={disabled(primaryButton, phase === 'connecting')}>
            {phase === 'connecting' ? 'CONNECTING...' : 'START SESSION →'}
          </button>
          <p style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.04em', marginTop: 'var(--space-3)' }}>
            Works best in Chrome or Edge with headphones. No microphone? You can type instead.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── SESSION ──
  const copy = STATE_COPY[tutorState]
  const active = tutorState !== 'idle'
  const barScale = tutorState === 'listening' ? Math.min(1, level * 14) : 0
  return (
    <div className="tutor-root" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', fontFamily: "'Space Grotesk', sans-serif" }}>
      <Sidebar />
      <div className="tutor-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* TOP BAR */}
        <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-3)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ ...eyebrow, marginBottom: '6px' }}>[VOICE TUTOR]</div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1 }}>
              {sessionTitle}
            </h1>
            <div style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', color: 'var(--text-3)', marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>
              {subject} · {mode === 'documents' ? `YOUR DOCUMENTS${docsInfo ? ` (${docsInfo.chunks} CHUNKS)` : ''}` : 'GENERAL KNOWLEDGE'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', color: 'var(--text-3)', textAlign: 'right', textTransform: 'uppercase' }}>
              EARS: {providerLabel(providers?.stt ?? null)}<br />VOICE: {providerLabel(providers?.tts ?? null)}
            </span>
            <button type="button" onClick={endSession} style={ghostButton}>END + NOTES</button>
          </div>
        </div>

        {/* STATE */}
        <div aria-live="polite" style={{ padding: '14px var(--space-5)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg2)' }}>
          <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px', width: '40px' }}>
            {[0.5, 0.9, 0.65, 1, 0.55].map((shape, i) => (
              <span key={i} style={{
                width: '4px', background: active ? 'var(--lime)' : 'var(--border-2)',
                height: tutorState === 'listening' ? `${6 + barScale * shape * 22}px` : `${6 + shape * 16}px`,
                animation: tutorState === 'speaking' ? `tutorPulse ${0.5 + i * 0.09}s ease-in-out infinite alternate`
                  : tutorState === 'thinking' ? `tutorBlink 1s ${i * 0.12}s ease-in-out infinite` : 'none',
                transition: 'height .09s linear',
              }} />
            ))}
          </div>
          <div>
            <div style={{ ...mono, fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', color: active ? 'var(--lime)' : 'var(--text-3)' }}>[ARIA] {copy.tag}</div>
            <div style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.04em', marginTop: '2px' }}>{copy.hint}</div>
          </div>
          {lastTiming?.first_audio_ms != null && (
            <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', marginLeft: 'auto' }}>
              FIRST AUDIO {lastTiming.first_audio_ms} MS · REPLY {lastTiming.total_ms} MS
            </span>
          )}
        </div>

        {(error || disconnected) && (
          <div role="alert" style={{ padding: 'var(--space-2) var(--space-5)', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ ...mono, fontSize: '11px', color: '#ef4444', letterSpacing: '.06em' }}>
              {disconnected ? 'CONNECTION LOST.' : error}
            </span>
            {disconnected && <button type="button" onClick={() => { void startSession() }} style={{ ...ghostButton, padding: 'var(--space-1) 10px' }}>RECONNECT</button>}
          </div>
        )}

        {/* TRANSCRIPT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-5)' }}>
          {messages.length === 0 && (
            <p style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em' }}>THE TRANSCRIPT OF BOTH SIDES APPEARS HERE.</p>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ marginBottom: 'var(--space-3)', maxWidth: '760px', marginLeft: m.role === 'student' ? 'auto' : 0 }}>
              <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: m.role === 'tutor' ? 'var(--lime)' : 'var(--text-3)', marginBottom: 'var(--space-1)' }}>
                {m.role === 'tutor' ? '[ARIA]' : '[YOU]'}
                {m.turn !== undefined && pendingNotes[m.turn] ? ` · ${pendingNotes[m.turn]}` : ''}
                {m.note ? ` · ${m.note}` : ''}
              </div>
              <div style={{ ...panel, padding: '12px var(--space-3)', fontSize: '14px', lineHeight: 1.6, color: m.role === 'tutor' ? 'var(--text)' : 'var(--text-2)' }}>
                {m.text}
              </div>
              {m.citations && m.citations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {m.citations.map(c => (
                    <span key={c.n} title={c.snippet} style={{ ...mono, fontSize: '11px', letterSpacing: '.06em', padding: '2px var(--space-2)', background: 'var(--lime-dim)', border: '1px solid var(--lime-border)', color: 'var(--lime)' }}>
                      ↗ {c.topic}{c.page ? ` · P.${c.page}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={transcriptEnd} />
        </div>

        {/* CONTROLS */}
        <div style={{ padding: 'var(--space-3) var(--space-5) 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <button type="button" disabled={micBlocked || disconnected}
              onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd}
              onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); void holdStart() } }}
              onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); holdEnd() } }}
              style={disabled({ ...primaryButton, padding: '12px var(--space-4)', fontSize: '11px', touchAction: 'none', background: holding ? 'var(--text)' : 'var(--lime)' }, micBlocked || disconnected)}>
              {holding ? 'RELEASE TO SEND' : 'HOLD TO TALK'}
            </button>
            <button type="button" disabled={micBlocked || disconnected} onClick={toggleHandsFree} aria-pressed={handsFree}
              style={disabled({ ...ghostButton, borderColor: handsFree ? 'var(--lime)' : 'var(--border)', color: handsFree ? 'var(--lime)' : 'var(--text-2)' }, micBlocked || disconnected)}>
              HANDS-FREE: {handsFree ? 'ON' : 'OFF'}
            </button>
            <button type="button" disabled={tutorState !== 'speaking' && tutorState !== 'thinking'} onClick={() => clientRef.current?.interrupt()}
              style={disabled(ghostButton, tutorState !== 'speaking' && tutorState !== 'thinking')}>
              STOP
            </button>
            <button type="button" disabled={disconnected || !messages.some(m => m.role === 'tutor')} onClick={() => { setError(''); clientRef.current?.askAgain() }}
              style={disabled(ghostButton, disconnected || !messages.some(m => m.role === 'tutor'))}>
              I DIDN&apos;T GET THAT
            </button>
            <button type="button" disabled={disconnected} onClick={toggleHinglish} aria-pressed={hinglish}
              style={disabled({ ...ghostButton, borderColor: hinglish ? 'var(--lime)' : 'var(--border)', color: hinglish ? 'var(--lime)' : 'var(--text-2)' }, disconnected)}>
              HINGLISH: {hinglish ? 'ON' : 'OFF'}
            </button>
            {micBlocked && <span style={{ ...mono, fontSize: '11px', color: '#f59e0b', letterSpacing: '.06em' }}>MIC OFF. TYPE BELOW.</span>}
          </div>
          <MicHelp blocked={micBlocked} />
          <form onSubmit={e => { e.preventDefault(); sendText() }} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Or type your question..." maxLength={2000} disabled={disconnected}
              aria-label="Type your question"
              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border-2)', padding: '12px 14px', fontSize: '14px', color: 'var(--text)', outline: 'none' }} />
            <button type="submit" disabled={!input.trim() || disconnected} style={disabled({ ...primaryButton, padding: '12px var(--space-4)', fontSize: '11px' }, !input.trim() || disconnected)}>SEND →</button>
          </form>
        </div>
      </div>

      {/* SIDE PANEL */}
      <aside className="tutor-aside" style={{ width: '380px', flexShrink: 0, borderLeft: '1px solid var(--border)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
          {sideTabs.map(tab => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setSideTab(tab.id)}
              style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', padding: '12px 14px', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--lime)' : 'transparent'}`, color: activeTab === tab.id ? 'var(--lime)' : 'var(--text-3)', fontWeight: activeTab === tab.id ? 700 : 400 }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: 'var(--space-3)', overflowY: 'auto' }}>
          {activeTab === 'roadmap' && <RoadmapPanel subjectId={subjectId} currentTopic={topic} startLabel="TEACH" onStart={switchTopic} />}
          {activeTab === 'videos' && <VideoPanel subjectId={subjectId} subjectName={subject} topic={topic.trim()} />}
          {activeTab === 'visual' && (
            <WalkthroughPanel subjectId={subjectId} topic={topic.trim()} cue={repliesDone}
              onExplain={text => { setError(''); clientRef.current?.sendText(text) }} />
          )}
          {activeTab === 'code' && <CodePanel topic={topic.trim()} />}
        </div>
      </aside>

      <style>{`
        @keyframes tutorPulse { from { transform: scaleY(0.45); } to { transform: scaleY(1.15); } }
        @keyframes tutorBlink { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </div>
  )
}
