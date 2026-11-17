// Plain messages for voice input problems. Only a real permission error says "blocked"; everything else says what
// actually happened and offers typing. Pure, so it can be tested.

export type VoiceIssue = { message: string; blocked: boolean }

// What the browser's built-in speech recognition reports in its `error` event, and what each code really means.
// Returns null for "aborted", which only means the recognition was stopped on purpose.
export function describeSpeechError(code: string): VoiceIssue | null {
  switch (code) {
    case 'aborted':
      return null
    case 'not-allowed':
      return { blocked: true, message: 'The microphone is blocked for this site. Allow it in the browser address bar, or type your answer.' }
    case 'service-not-allowed':
      // Not the microphone: the browser's speech service refused or is missing, which happens in some Chrome and Edge builds.
      return { blocked: false, message: "This browser's speech service is not available here. Type your answer instead." }
    case 'network':
      return { blocked: false, message: 'Voice input could not reach the speech service. Check your connection, or type your answer.' }
    case 'no-speech':
      return { blocked: false, message: 'No speech was heard. Press VOICE and try again, or type your answer.' }
    case 'audio-capture':
      return { blocked: false, message: 'No microphone was found. Check that one is connected, or type your answer.' }
    case 'language-not-supported':
      return { blocked: false, message: 'Voice input does not support this language here. Type your answer instead.' }
    default:
      return { blocked: false, message: 'Voice input stopped working. Type your answer instead.' }
  }
}
