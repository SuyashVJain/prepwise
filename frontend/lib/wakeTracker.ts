// Detects a sleeping backend: a request that has not answered after a few seconds turns "waking up" on, and any request
// that answers or fails turns it off. It only watches; it never cancels, repeats or delays a request.

export const WAKE_THRESHOLD_MS = 4000

type Timer = ReturnType<typeof setTimeout>

export function createWakeTracker(
  thresholdMs = WAKE_THRESHOLD_MS,
  setTimer: (fn: () => void, ms: number) => Timer = setTimeout,
  clearTimer: (t: Timer) => void = clearTimeout,
) {
  let nextId = 0
  let waking = false
  const pending = new Map<number, Timer>()
  const listeners = new Set<() => void>()

  const set = (value: boolean) => {
    if (waking === value) return
    waking = value
    listeners.forEach(l => l())
  }

  // Call when a request starts; call the returned function when it answers or fails.
  function begin(): () => void {
    const id = nextId++
    pending.set(id, setTimer(() => { if (pending.has(id)) set(true) }, thresholdMs))
    return () => {
      const t = pending.get(id)
      if (t === undefined) return
      clearTimer(t)
      pending.delete(id)
      set(false)
    }
  }

  return {
    begin,
    isWaking: () => waking,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

// The one tracker shared by every call that goes through apiFetch.
export const wakeTracker = createWakeTracker()
