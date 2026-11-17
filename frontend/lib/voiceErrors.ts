// Plain messages for voice answer problems. Only a real permission error says "blocked"; everything else says what
// actually happened and offers typing. Pure, so it can be tested.

export type VoiceIssue = { message: string; blocked: boolean }

export const NO_SPEECH_MESSAGE = 'No speech was heard. Press VOICE and try again, or type your answer.'

// `name` is the DOMException name from getUserMedia, or "unsupported" when the browser cannot record at all.
export function describeMicError(name: string): VoiceIssue {
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return { blocked: true, message: 'The microphone is blocked for this site. Allow it in the browser address bar, or type your answer.' }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return { blocked: false, message: 'No microphone was found. Check that one is connected, or type your answer.' }
    case 'NotReadableError':
    case 'AbortError':
      return { blocked: false, message: 'The microphone is busy or not responding. Close other apps that use it, or type your answer.' }
    case 'unsupported':
      return { blocked: false, message: 'This browser cannot record audio. Type your answer instead.' }
    default:
      return { blocked: false, message: 'Voice input could not start. Type your answer instead.' }
  }
}

// What went wrong when the recording was sent to be turned into text: an HTTP status from the server, or "network".
export function describeTranscribeFailure(failure: number | 'network'): string {
  if (failure === 'network') return 'Could not reach the server, so the recording was not turned into text. Check your connection, or type your answer.'
  switch (failure) {
    case 400:
      return 'No sound was recorded. Press VOICE and try again, or type your answer.'
    case 413:
      return 'That recording was too long. Record a shorter answer, or type it.'
    case 429:
      return 'Too many requests. Wait a moment, then try again, or type your answer.'
    case 502:
    case 503:
      return 'Speech-to-text is not available right now. Type your answer instead.'
    default:
      return 'Could not turn that recording into text. Try again, or type your answer.'
  }
}
