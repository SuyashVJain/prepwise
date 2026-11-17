// Helpers for speaking the tutor's reply with the browser's own voice when the server voice fails. Pure, so they can be tested.

export type VoiceLike = { lang: string; name: string }

const normal = (lang: string) => lang.replace('_', '-').toLowerCase()

// English (India) first, then a voice that names India, then any English voice. Undefined when the browser has none.
export function pickVoice<T extends VoiceLike>(voices: T[]): T | undefined {
  return (
    voices.find(v => normal(v.lang) === 'en-in') ??
    voices.find(v => /india/i.test(v.name) && normal(v.lang).startsWith('en')) ??
    voices.find(v => normal(v.lang).startsWith('en'))
  )
}

// Removes markdown marks and code so the voice does not read symbols aloud.
export function cleanForBrowserSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_#>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SentenceLog = { turn: number; seq: number; text: string; hasAudio: boolean; queued: boolean }

// The sentences the browser still has to speak: no server audio arrived for them, they were not queued yet, and the
// student has not interrupted past them. In reading order.
export function sentencesForBrowser(log: SentenceLog[], mutedThrough: number): SentenceLog[] {
  return log
    .filter(e => !e.hasAudio && !e.queued && e.turn > mutedThrough)
    .sort((a, b) => a.turn - b.turn || a.seq - b.seq)
}
