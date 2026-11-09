import { getAccessToken, signOutToLogin, wsUrl } from '@/lib/api'

export type TutorState = 'idle' | 'listening' | 'thinking' | 'speaking'
export type ProviderInfo = { active: string; fell_back: boolean; reason: string }
export type Citation = { n: number; topic: string; page?: number | null; snippet: string }
export type TurnEnd = {
  turn: number
  cancelled: boolean
  refused: boolean
  text: string
  first_audio_ms: number | null
  total_ms: number
}
export type SyllabusPayload = {
  topics: string[]
  raw_chunks: string[]
  chunks_metadata: unknown[]
  university: string
  semester: number
}
export type StartOptions = {
  mode: 'standalone' | 'documents'
  subject: string
  topic: string
  hinglish: boolean
  speak: boolean
  greet: boolean
  syllabus?: SyllabusPayload
}

export interface TutorHandlers {
  onState(state: TutorState): void
  onStudentText(text: string): void
  onSentence(turn: number, seq: number, text: string): void
  onTurnEnd(end: TurnEnd): void
  onCitations(turn: number, sources: Citation[]): void
  onDoubt(turn: number, style: string): void
  onProviders(stt: ProviderInfo, tts: ProviderInfo): void
  onReady(info: { documents_loaded: boolean; chunks: number }): void
  onError(code: string, message: string): void
  onLevel(level: number): void
  onClosed(): void
}

type ServerMessage = { type: string; [key: string]: unknown }

const UNAUTHORIZED_CLOSE_CODE = 4401
const VAD_INTERVAL_MS = 40
const SPEECH_CONFIRM_MS = 200 // sustained sound before it counts as speech
const SILENCE_END_MS = 900 // quiet time that ends an utterance
const MIN_UTTERANCE_MS = 350
const BASE_THRESHOLD = 0.018

/**
 * One live tutor session: the WebSocket, microphone capture with a simple
 * energy-based voice activity detector, and gapless playback of the tutor's
 * audio. Speaking while the tutor is talking stops playback and cancels the
 * reply in flight (barge-in).
 */
export class TutorClient {
  private ws: WebSocket | null = null
  private audio: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private samples: Float32Array<ArrayBuffer> | null = null
  private recorder: MediaRecorder | null = null
  private recorded: Blob[] = []
  private discardRecording = false

  private vadTimer: ReturnType<typeof setInterval> | null = null
  private handsFree = false
  private noiseFloor = 0.005
  private loudSince = 0
  private quietSince = 0
  private speechStartedAt = 0
  private speechConfirmed = false
  private lastLevelAt = 0

  private pendingAudio: { turn: number; mime: string } | null = null
  private decodeChain: Promise<void> = Promise.resolve()
  private playing = new Set<AudioBufferSourceNode>()
  private decoding = 0 // audio chunks received but not yet scheduled
  private nextPlayTime = 0
  private latestTurn = 0
  private mutedThrough = 0 // audio and text for turns up to this one are dropped
  private serverBusy = false
  private state: TutorState = 'idle'
  private closedByUs = false

  constructor(private handlers: TutorHandlers) {}

  // ── connection ──

  /** Call from a click handler so the browser allows audio playback. */
  async connect(): Promise<void> {
    const token = await getAccessToken()
    if (!token) {
      await signOutToLogin()
      throw new Error('Not signed in')
    }
    this.audio = new AudioContext()
    if (this.audio.state === 'suspended') await this.audio.resume()

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl('/tutor/ws'))
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      let authenticated = false

      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }))
      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') {
          this.onAudioFrame(event.data as ArrayBuffer)
          return
        }
        const msg = JSON.parse(event.data) as ServerMessage
        if (!authenticated && msg.type === 'authenticated') {
          authenticated = true
          resolve()
          return
        }
        this.onMessage(msg)
      }
      ws.onerror = () => { if (!authenticated) reject(new Error('Could not reach the tutor service.')) }
      ws.onclose = (event: CloseEvent) => {
        if (event.code === UNAUTHORIZED_CLOSE_CODE) {
          void signOutToLogin()
          if (!authenticated) reject(new Error('Session expired. Please log in again.'))
          return
        }
        if (!authenticated) reject(new Error('Could not reach the tutor service.'))
        this.stopMic()
        this.stopPlayback()
        if (!this.closedByUs) this.handlers.onClosed()
      }
    })
  }

  start(options: StartOptions): void {
    this.send({ type: 'start', ...options })
  }

  set(options: { hinglish?: boolean; speak?: boolean; topic?: string }): void {
    this.send({ type: 'set', ...options })
  }

  sendText(text: string): void {
    const trimmed = text.trim()
    if (!trimmed) return
    this.interrupt()
    this.send({ type: 'user_text', text: trimmed })
  }

  /** "I did not get that": stop the tutor and have the last point explained a different way. */
  askAgain(): void {
    this.interrupt()
    this.send({ type: 'doubt' })
  }

  close(): void {
    this.closedByUs = true
    this.stopMic()
    this.stopPlayback()
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
      try { this.send({ type: 'end' }) } catch { /* already closed */ }
      this.ws.close()
    }
    this.ws = null
    void this.audio?.close()
    this.audio = null
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message))
  }

  // ── server messages ──

  private onMessage(msg: ServerMessage): void {
    const turn = typeof msg.turn === 'number' ? msg.turn : 0
    if (turn > this.latestTurn) this.latestTurn = turn

    switch (msg.type) {
      case 'ready':
        this.handlers.onReady({ documents_loaded: Boolean(msg.documents_loaded), chunks: Number(msg.chunks || 0) })
        break
      case 'providers':
        this.handlers.onProviders(msg.stt as ProviderInfo, msg.tts as ProviderInfo)
        break
      case 'state':
        if (msg.value === 'thinking') {
          this.serverBusy = true
          if (!this.isRecording()) this.setState('thinking')
        }
        break
      case 'transcript':
        this.handlers.onStudentText(String(msg.text || ''))
        break
      case 'sentence':
        if (turn <= this.mutedThrough) break
        this.handlers.onSentence(turn, Number(msg.seq), String(msg.text || ''))
        if (!this.isRecording()) this.setState('speaking')
        break
      case 'audio':
        this.pendingAudio = { turn, mime: String(msg.mime || 'audio/wav') }
        break
      case 'doubt':
        this.handlers.onDoubt(turn, String(msg.style || ''))
        break
      case 'citations':
        if (turn > this.mutedThrough) this.handlers.onCitations(turn, (msg.sources as Citation[]) || [])
        break
      case 'turn_end':
        this.serverBusy = false
        this.handlers.onTurnEnd(msg as unknown as TurnEnd)
        this.settle()
        break
      case 'error':
        if (msg.code !== 'tts_failed') this.serverBusy = false
        this.handlers.onError(String(msg.code || 'error'), String(msg.message || 'Something went wrong. Try again.'))
        this.settle()
        break
    }
  }

  // ── playback ──

  private onAudioFrame(data: ArrayBuffer): void {
    const header = this.pendingAudio
    this.pendingAudio = null
    if (!header || header.turn <= this.mutedThrough || !this.audio) return
    const turn = header.turn
    this.decoding += 1
    // Decode in arrival order so sentences are scheduled back to back.
    this.decodeChain = this.decodeChain.then(async () => {
      const ctx = this.audio
      try {
        if (!ctx || turn <= this.mutedThrough) return
        const buffer = await ctx.decodeAudioData(data.slice(0))
        if (turn <= this.mutedThrough) return
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        const at = Math.max(ctx.currentTime + 0.02, this.nextPlayTime)
        source.start(at)
        this.nextPlayTime = at + buffer.duration
        this.playing.add(source)
        source.onended = () => {
          this.playing.delete(source)
          this.settle()
        }
        if (!this.isRecording()) this.setState('speaking')
      } catch {
        // An undecodable chunk is skipped; the transcript still shows the text.
      } finally {
        this.decoding -= 1
        this.settle()
      }
    })
  }

  private stopPlayback(): void {
    for (const source of this.playing) {
      source.onended = null
      try { source.stop() } catch { /* not started yet */ }
    }
    this.playing.clear()
    this.nextPlayTime = 0
    this.pendingAudio = null
  }

  /** Barge-in: silence the tutor and cancel the reply being generated. */
  interrupt(): void {
    const wasActive = this.serverBusy || this.playing.size > 0 || this.decoding > 0
    this.mutedThrough = this.latestTurn
    this.stopPlayback()
    if (wasActive) {
      this.serverBusy = false
      this.send({ type: 'cancel' })
    }
    this.settle()
  }

  isBusy(): boolean {
    return this.serverBusy || this.playing.size > 0 || this.decoding > 0
  }

  // ── state ──

  private setState(state: TutorState): void {
    if (state === this.state) return
    this.state = state
    this.handlers.onState(state)
  }

  private settle(): void {
    if (this.isRecording()) { this.setState('listening'); return }
    if (this.serverBusy) return
    if (this.playing.size > 0 || this.decoding > 0) return
    this.setState(this.handsFree ? 'listening' : 'idle')
  }

  // ── microphone ──

  private async ensureMic(): Promise<boolean> {
    if (this.stream) return true
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.handlers.onError('mic_unsupported', 'This browser cannot record audio. Type your question instead.')
      return false
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      this.handlers.onError(
        denied ? 'mic_denied' : 'mic_unavailable',
        denied
          ? 'Microphone access is blocked. Allow it in the browser address bar, or type your question.'
          : 'No microphone was found. Type your question instead.',
      )
      return false
    }
    if (this.audio) {
      const source = this.audio.createMediaStreamSource(this.stream)
      this.analyser = this.audio.createAnalyser()
      this.analyser.fftSize = 1024
      this.samples = new Float32Array(this.analyser.fftSize)
      source.connect(this.analyser)
    }
    if (!this.vadTimer) this.vadTimer = setInterval(() => this.tick(), VAD_INTERVAL_MS)
    return true
  }

  private stopMic(): void {
    if (this.vadTimer) clearInterval(this.vadTimer)
    this.vadTimer = null
    this.discardRecording = true
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.recorder = null
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.analyser = null
    this.handsFree = false
  }

  private isRecording(): boolean {
    return this.recorder !== null && this.recorder.state === 'recording'
  }

  private beginRecording(): void {
    if (!this.stream || this.isRecording()) return
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
    const recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined)
    this.recorded = []
    this.discardRecording = false
    recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) this.recorded.push(event.data) }
    recorder.onstop = () => {
      const chunks = this.recorded
      this.recorded = []
      if (this.discardRecording || chunks.length === 0) { this.settle(); return }
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      void blob.arrayBuffer().then(buffer => {
        if (this.ws?.readyState !== WebSocket.OPEN) return
        this.serverBusy = true
        this.setState('thinking')
        this.send({ type: 'user_audio', mime: blob.type })
        this.ws.send(buffer)
      })
    }
    this.recorder = recorder
    recorder.start()
    this.setState('listening')
  }

  private endRecording(sendIt: boolean): void {
    if (!this.isRecording() || !this.recorder) return
    this.discardRecording = !sendIt
    this.recorder.stop()
  }

  /** Push-to-talk: start recording now. Interrupts the tutor if it is talking. */
  async pushToTalkStart(): Promise<boolean> {
    if (!(await this.ensureMic())) return false
    this.interrupt()
    this.beginRecording()
    return true
  }

  pushToTalkEnd(sendIt = true): void {
    this.endRecording(sendIt)
  }

  /** Hands-free: keep the mic open and let the voice activity detector find the start and end of speech. */
  async setHandsFree(on: boolean): Promise<boolean> {
    if (!on) {
      this.handsFree = false
      this.endRecording(false)
      this.settle()
      return true
    }
    if (!(await this.ensureMic())) return false
    this.handsFree = true
    this.loudSince = 0
    this.quietSince = 0
    this.settle()
    return true
  }

  private tick(): void {
    if (!this.analyser || !this.samples) return
    this.analyser.getFloatTimeDomainData(this.samples)
    let sum = 0
    for (let i = 0; i < this.samples.length; i++) sum += this.samples[i] * this.samples[i]
    const level = Math.sqrt(sum / this.samples.length)
    const now = performance.now()

    if (now - this.lastLevelAt > 90) {
      this.lastLevelAt = now
      this.handlers.onLevel(level)
    }
    if (!this.handsFree) return

    // While the tutor is talking the speakers leak into the mic, so ask for a louder voice.
    const threshold = Math.max(BASE_THRESHOLD, this.noiseFloor * 3) * (this.playing.size > 0 ? 2.5 : 1)
    const loud = level > threshold

    if (!this.isRecording()) {
      if (!loud) {
        this.noiseFloor = this.noiseFloor * 0.95 + level * 0.05
        this.loudSince = 0
        return
      }
      if (!this.loudSince) this.loudSince = now
      // Record from the first loud frame so the start of the word is kept.
      this.speechStartedAt = now
      this.speechConfirmed = false
      this.quietSince = 0
      this.beginRecording()
      return
    }

    if (loud) {
      this.quietSince = 0
      if (!this.speechConfirmed && now - this.speechStartedAt > SPEECH_CONFIRM_MS) {
        this.speechConfirmed = true
        this.interrupt() // the student is really speaking: stop the tutor
      }
      return
    }

    if (!this.quietSince) this.quietSince = now
    const quietFor = now - this.quietSince
    if (!this.speechConfirmed && quietFor > 250) {
      this.endRecording(false) // a click or cough, not speech
      return
    }
    if (quietFor > SILENCE_END_MS) {
      const voicedFor = this.quietSince - this.speechStartedAt
      this.endRecording(this.speechConfirmed && voicedFor > MIN_UTTERANCE_MS)
    }
  }
}
