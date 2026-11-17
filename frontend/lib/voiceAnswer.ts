import { apiFetch, RATE_LIMIT_MESSAGE } from '@/lib/api'
import { describeTranscribeFailure } from '@/lib/voiceErrors'

// Record the microphone, then send the recording to the server's speech-to-text (the one the voice tutor uses).
// This works in any browser that can record audio, unlike the browser's built-in speech recognition.

export type Recording = {
  /** The audio recorded so far, as one playable file. */
  snapshot(): Blob
  /** Stop and return what was recorded. */
  stop(): Promise<Blob>
  /** Stop and throw the recording away. */
  cancel(): void
  /** The current microphone level, 0 to 1, for the waveform. */
  level(): number
}

export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

/** Rejects with the browser's DOMException when the microphone cannot be used (see describeMicError). */
export async function startRecording(): Promise<Recording> {
  if (!canRecord()) throw Object.assign(new Error('This browser cannot record audio'), { name: 'unsupported' })
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) chunks.push(event.data) }

  // A level meter for the waveform. If the browser has no AudioContext the waveform just stays flat.
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  const samples = new Uint8Array(256)
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) {
      ctx = new Ctor()
      analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
    }
  } catch { ctx = null; analyser = null }

  const release = () => {
    stream.getTracks().forEach(track => track.stop())
    try { void ctx?.close() } catch { /* already closed */ }
  }
  const blobOf = () => new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
  // A one second slice keeps the audio so far available at any moment for live transcription.
  recorder.start(1000)
  return {
    snapshot: blobOf,
    level: () => {
      if (!analyser) return 0
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const v of samples) { const d = (v - 128) / 128; sum += d * d }
      return Math.min(1, Math.sqrt(sum / samples.length) * 3)
    },
    stop: () => new Promise<Blob>(resolve => {
      const done = () => { release(); resolve(blobOf()) }
      if (recorder.state === 'inactive') { done(); return }
      recorder.onstop = done
      recorder.stop()
    }),
    cancel: () => {
      recorder.onstop = null
      try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* already stopped */ }
      release()
    },
  }
}

/** A failed transcription, with the HTTP status the server answered. */
export class TranscribeError extends Error {
  constructor(public status: number) { super(`Transcription failed (${status})`) }
}

/** The text of a recording, or an empty string when nothing was heard. Throws TranscribeError or the network error. */
export async function transcribeRecording(blob: Blob): Promise<string> {
  // A clip this small holds no speech (a click on the button).
  if (blob.size < 1000) return ''
  const form = new FormData()
  form.append('file', blob, blob.type.includes('mp4') ? 'answer.m4a' : 'answer.webm')
  const res = await apiFetch('/interview/transcribe', { method: 'POST', body: form })
  if (!res.ok) throw new TranscribeError(res.status)
  const data = await res.json()
  return String(data.text || '').trim()
}

/** The message for whatever went wrong in transcribeRecording. */
export function transcribeFailureMessage(err: unknown): string {
  if (err instanceof TranscribeError) return describeTranscribeFailure(err.status)
  if (err instanceof Error && err.message === RATE_LIMIT_MESSAGE) return describeTranscribeFailure(429)
  return describeTranscribeFailure('network')
}

/** The message for a failed transcription, and whether it was a rate limit (live updates then pause for a while). */
export function describeTranscribeError(err: unknown): { message: string; limited: boolean } {
  const limited = (err instanceof TranscribeError && err.status === 429) || (err instanceof Error && err.message === RATE_LIMIT_MESSAGE)
  return { message: transcribeFailureMessage(err), limited }
}
