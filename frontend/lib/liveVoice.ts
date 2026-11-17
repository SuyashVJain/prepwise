// The live voice answer as a small state machine. It has no browser or network code of its own: the recorder, the
// transcription call, the timers and the messages are passed in, so the rules (no overlapping requests, one final
// transcription, calm errors, late results thrown away) can be tested without a browser.

export type VoicePhase = 'idle' | 'starting' | 'listening' | 'finishing' | 'done' | 'error'

export type VoiceState = {
  phase: VoicePhase
  /** The transcript so far. Live ticks replace it; the final transcription replaces it once more. */
  text: string
  /** When recording began (ms), for the timer. */
  startedAt: number | null
  /** A calm message when something went wrong, shown with a retry button. */
  error: string | null
  /** The microphone itself could not be used (blocked, missing, busy or unsupported). */
  micProblem: boolean
  /** The microphone is specifically blocked by permission. */
  blocked: boolean
  /** A passing problem while still recording, for example a live update that failed or was rate limited. */
  notice: string | null
}

export type LiveRecording = {
  /** The audio recorded so far, as one playable file. */
  snapshot(): Blob
  /** Stop recording and return all of the audio. */
  stop(): Promise<Blob>
  /** Stop and throw the audio away. */
  cancel(): void
  /** The current microphone level, 0 to 1. */
  level(): number
}

export type LiveDeps = {
  start(): Promise<LiveRecording>
  transcribe(blob: Blob): Promise<string>
  onChange(state: VoiceState): void
  describeMic(err: unknown): { message: string; blocked: boolean }
  describeTranscribe(err: unknown): { message: string; limited: boolean }
  noSpeechMessage: string
  every(fn: () => void, ms: number): () => void
  after(fn: () => void, ms: number): () => void
  now(): number
  intervalMs?: number
  maxMs?: number
  pauseMsWhenLimited?: number
}

export const LIVE_INTERVAL_MS = 4000
export const MAX_RECORDING_MS = 180_000
export const PAUSE_WHEN_LIMITED_MS = 15_000

const EMPTY: VoiceState = { phase: 'idle', text: '', startedAt: null, error: null, micProblem: false, blocked: false, notice: null }

export function createLiveVoice(deps: LiveDeps) {
  const intervalMs = deps.intervalMs ?? LIVE_INTERVAL_MS
  const maxMs = deps.maxMs ?? MAX_RECORDING_MS
  const pauseMs = deps.pauseMsWhenLimited ?? PAUSE_WHEN_LIMITED_MS

  let state: VoiceState = EMPTY
  let rec: LiveRecording | null = null
  let finalAudio: Blob | null = null
  let token = 0                         // bumped whenever the session ends, so late results are ignored
  let inflight: Promise<void> | null = null
  let pausedUntil = 0
  let stopTicks: (() => void) | null = null
  let stopCap: (() => void) | null = null

  function set(patch: Partial<VoiceState>) {
    state = { ...state, ...patch }
    deps.onChange(state)
  }

  function clearTimers() {
    stopTicks?.(); stopTicks = null
    stopCap?.(); stopCap = null
  }

  // One live update. Skipped when the previous one is still running, or while paused after a rate limit.
  function tick() {
    if (state.phase !== 'listening' || !rec || inflight || deps.now() < pausedUntil) return
    const mine = token
    const blob = rec.snapshot()
    const run = (async () => {
      try {
        const text = await deps.transcribe(blob)
        if (mine !== token || state.phase !== 'listening') return
        set(text ? { text, notice: null } : { notice: null })
      } catch (err) {
        if (mine !== token || state.phase !== 'listening') return
        const d = deps.describeTranscribe(err)
        if (d.limited) pausedUntil = deps.now() + pauseMs
        set({ notice: d.message })
      }
    })()
    const p: Promise<void> = run.finally(() => { if (inflight === p) inflight = null })
    inflight = p
  }

  async function transcribeFinal() {
    if (!finalAudio) return
    const mine = token
    set({ phase: 'finishing', error: null, notice: null })
    try {
      const text = await deps.transcribe(finalAudio)
      if (mine !== token) return
      if (!text) {
        finalAudio = null
        set({ phase: 'error', error: deps.noSpeechMessage, micProblem: false, blocked: false })
        return
      }
      set({ phase: 'done', text, error: null })
    } catch (err) {
      if (mine !== token) return
      set({ phase: 'error', error: deps.describeTranscribe(err).message, micProblem: false, blocked: false })
    }
  }

  return {
    get state() { return state },
    /** The microphone level for the waveform, 0 when not recording. */
    level: () => (rec && state.phase === 'listening' ? rec.level() : 0),

    async start() {
      if (state.phase === 'starting' || state.phase === 'listening' || state.phase === 'finishing') return
      const mine = ++token
      finalAudio = null
      set({ phase: 'starting', text: '', error: null, micProblem: false, blocked: false, notice: null })
      try {
        const r = await deps.start()
        if (mine !== token) { r.cancel(); return }
        rec = r
        pausedUntil = 0
        set({ phase: 'listening', startedAt: deps.now() })
        stopTicks = deps.every(tick, intervalMs)
        stopCap = deps.after(() => { void this.finish() }, maxMs)
      } catch (err) {
        if (mine !== token) return
        const issue = deps.describeMic(err)
        set({ phase: 'error', error: issue.message, micProblem: true, blocked: issue.blocked })
      }
    },

    /** Stop recording, wait for any live update to end, then run one final transcription. */
    async finish() {
      if (state.phase !== 'listening' || !rec) return
      const r = rec
      rec = null
      clearTimers()
      const mine = ++token
      set({ phase: 'finishing', notice: null })
      const pending = inflight
      try {
        finalAudio = await r.stop()
        if (pending) await pending
      } catch {
        if (mine !== token) return
        set({ phase: 'error', error: deps.describeTranscribe(new Error('stop')).message, micProblem: false, blocked: false })
        return
      }
      if (mine !== token) return
      await transcribeFinal()
    },

    /** Try again after an error: re-send the same recording if there is one, otherwise record again. */
    async retry() {
      if (state.phase !== 'error') return
      if (finalAudio && !state.micProblem) { await transcribeFinal(); return }
      await this.start()
    },

    /** Leave voice mode: discard the recording and any pending result. */
    cancel() {
      token++
      clearTimers()
      rec?.cancel()
      rec = null
      finalAudio = null
      inflight = null
      state = { ...EMPTY }
      deps.onChange(state)
    },
  }
}
