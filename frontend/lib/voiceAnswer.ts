import { apiFetch, RATE_LIMIT_MESSAGE } from '@/lib/api'
import { describeTranscribeFailure } from '@/lib/voiceErrors'

// Record the microphone, then send the recording to the server's speech-to-text (the one the voice tutor uses).
// This works in any browser that can record audio, unlike the browser's built-in speech recognition.

export type Recording = {
  /** Stop and return what was recorded. */
  stop(): Promise<Blob>
  /** Stop and throw the recording away. */
  cancel(): void
}

export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

/** Rejects with the browser's DOMException when the microphone cannot be used (see describeMicError). */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  const release = () => stream.getTracks().forEach(track => track.stop())
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) chunks.push(event.data) }
  recorder.start()
  return {
    stop: () => new Promise<Blob>(resolve => {
      const done = () => { release(); resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })) }
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
