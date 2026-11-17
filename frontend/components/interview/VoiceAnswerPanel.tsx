'use client'

import { useEffect, useRef, useState } from 'react'
import MicHelp from '@/components/MicHelp'
import { createLiveVoice, type VoicePhase, type VoiceState } from '@/lib/liveVoice'
import { describeMicError, NO_SPEECH_MESSAGE } from '@/lib/voiceErrors'
import { describeTranscribeError, startRecording, transcribeRecording } from '@/lib/voiceAnswer'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const BARS = 48

const clockNow = () => Date.now()
function mmss(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

const STATUS: Record<VoicePhase, string> = {
  idle: 'Tap the mic and start speaking',
  starting: 'Starting the microphone...',
  listening: 'Listening...',
  finishing: 'Writing it up...',
  done: 'Done, review and submit',
  error: 'That did not work',
}

// The voice view of an answer: a big mic button, a waveform from the real microphone level, a live transcript and one
// status line. The text goes into the page's answer (after anything already typed), so the counters and Submit work as in text mode.
export default function VoiceAnswerPanel({ answer, onAnswer, onPhase, elapsed, targetSeconds, disabled }: {
  answer: string
  onAnswer: (text: string) => void
  onPhase: (phase: VoicePhase) => void
  elapsed: number
  targetSeconds: number
  disabled?: boolean
}) {
  const [state, setState] = useState<VoiceState>({ phase: 'idle', text: '', startedAt: null, error: null, micProblem: false, blocked: false, notice: null })
  const [markFrom, setMarkFrom] = useState(0)
  const baseRef = useRef('')
  const answerRef = useRef(answer)
  const lastTextRef = useRef('')
  const wordsRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onAnswer, onPhase })
  useEffect(() => { answerRef.current = answer; callbacks.current = { onAnswer, onPhase } })

  const voiceRef = useRef<ReturnType<typeof createLiveVoice> | null>(null)
  // Created on mount and discarded on unmount: leaving voice mode (or the question) throws away any recording and pending result.
  useEffect(() => {
    let alive = true
    const voice = createLiveVoice({
    start: startRecording,
    transcribe: transcribeRecording,
    describeMic: err => describeMicError(err instanceof Error ? err.name : ''),
    describeTranscribe: describeTranscribeError,
    noSpeechMessage: NO_SPEECH_MESSAGE,
    every: (fn, ms) => { const id = setInterval(fn, ms); return () => clearInterval(id) },
    after: (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id) },
    now: clockNow,
    onChange: s => {
      if (!alive) return // cancelling on leave must not wipe the words already in the answer
      setState(s)
      callbacks.current.onPhase(s.phase)
      if (s.phase === 'starting') { baseRef.current = answerRef.current.trim(); lastTextRef.current = ''; wordsRef.current = 0 }
      if (s.text !== lastTextRef.current) {
        lastTextRef.current = s.text
        callbacks.current.onAnswer([baseRef.current, s.text].filter(Boolean).join(' '))
        setMarkFrom(wordsRef.current)
        wordsRef.current = s.text.split(/\s+/).filter(Boolean).length
      }
    },
    })
    voiceRef.current = voice
    return () => { alive = false; voice.cancel(); voiceRef.current = null }
  }, [])

  // Waveform: one bar per slice of time, drawn from the real microphone level.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const history = new Array<number>(BARS).fill(0)
    const color = getComputedStyle(canvas).getPropertyValue('--lime').trim() || '#c8ff00'
    let raf = 0
    let last = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 60) return
      last = t
      history.push(voiceRef.current?.level() ?? 0); history.shift()
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      const step = w / BARS
      history.forEach((v, i) => {
        const bh = Math.max(3, v * h)
        ctx.globalAlpha = 0.35 + 0.65 * (i / BARS)
        ctx.fillRect(i * step + step * 0.2, (h - bh) / 2, step * 0.6, bh)
      })
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  // On a phone the panel sits below the question, so bring it into view when voice mode opens.
  useEffect(() => {
    if (window.innerWidth <= 800) panelRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  // Redraw the recording clock while listening.
  const [clock, setClock] = useState(0)
  useEffect(() => {
    if (state.phase !== 'listening') return
    const id = setInterval(() => setClock(clockNow()), 500)
    return () => clearInterval(id)
  }, [state.phase])

  const { phase } = state
  const recording = phase === 'listening'
  const busy = phase === 'starting' || phase === 'finishing'
  const words = state.text.split(/\s+/).filter(Boolean)
  const recSeconds = state.startedAt && clock > state.startedAt ? Math.floor((clock - state.startedAt) / 1000) : 0

  function tapMic() {
    if (disabled || busy) return
    if (recording) void voiceRef.current?.finish()
    else void voiceRef.current?.start()
  }

  return (
    <div className="voice-panel" ref={panelRef}>
      <button type="button" className={`voice-mic${recording ? ' rec' : ''}`} onClick={tapMic} disabled={disabled || busy}
        aria-label={recording ? 'Finish recording' : busy ? STATUS[phase] : phase === 'done' ? 'Record more' : 'Start recording'}>
        {recording
          ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          : <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
      </button>

      <p role="status" aria-live="polite" style={{ ...mono, fontSize: '13px', letterSpacing: '.08em', color: phase === 'error' ? '#f59e0b' : 'var(--text)', margin: 0, textAlign: 'center' }}>
        {STATUS[phase]}
      </p>

      <canvas ref={canvasRef} className="voice-wave" aria-hidden="true" />

      <div style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', color: elapsed > targetSeconds ? '#f59e0b' : 'var(--text-2)' }}>
        {mmss(elapsed)} / {mmss(targetSeconds)}{recording ? ` · REC ${mmss(recSeconds)}` : ''}
      </div>

      {state.error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
          <p role="alert" style={{ fontSize: '14px', color: '#f59e0b', textAlign: 'center', margin: 0 }}>{state.error}</p>
          <button type="button" className="voice-btn" onClick={() => void voiceRef.current?.retry()}>TRY AGAIN</button>
          {state.micProblem && <MicHelp blocked={state.blocked} />}
        </div>
      )}
      {state.notice && !state.error && <p role="status" style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', margin: 0 }}>{state.notice}</p>}

      {(recording || phase === 'finishing') && (
        <div className="voice-card" aria-label="Live transcript">
          {words.length === 0
            ? <span style={{ color: 'var(--text-3)' }}>Your words will appear here as you speak.</span>
            : words.map((w, i) => (
              <span key={i} style={i >= markFrom ? { background: 'color-mix(in srgb, var(--lime) 22%, transparent)', color: 'var(--text)' } : { color: 'var(--text-2)' }}>{w}{' '}</span>
            ))}
        </div>
      )}

      {(phase === 'done' || (phase === 'error' && answer.trim())) && (
        <label style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)' }}>EDIT YOUR ANSWER</span>
          <textarea className="voice-card" value={answer} onChange={e => onAnswer(e.target.value)} aria-label="Your answer" disabled={disabled}
            style={{ minHeight: '140px', resize: 'vertical', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
        </label>
      )}
    </div>
  )
}
