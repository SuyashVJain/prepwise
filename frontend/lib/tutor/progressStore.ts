// Roadmap progress, kept in this browser only. Every storage access is guarded:
// localStorage can be blocked, full, or cleared at any time.

const STORAGE_KEY = 'prepwise_tutor_progress'
const EMPTY = '{}'

let cached = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && typeof JSON.parse(raw) === 'object') cached = raw
  } catch {
    cached = EMPTY
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// The stored JSON string. A string keeps the snapshot stable between renders.
export function getSnapshot(): string {
  load()
  return cached
}

export function getServerSnapshot(): string {
  return EMPTY
}

export function parseProgress(snapshot: string): Record<string, boolean> {
  try {
    const value = JSON.parse(snapshot)
    return value && typeof value === 'object' ? value as Record<string, boolean> : {}
  } catch {
    return {}
  }
}

export function setTopicDone(topicId: string, done: boolean): void {
  const progress = parseProgress(getSnapshot())
  if (done) progress[topicId] = true
  else delete progress[topicId]
  cached = JSON.stringify(progress)
  try {
    localStorage.setItem(STORAGE_KEY, cached)
  } catch {
    // Progress still works for this visit; it just will not survive a reload.
  }
  listeners.forEach(listener => listener())
}
