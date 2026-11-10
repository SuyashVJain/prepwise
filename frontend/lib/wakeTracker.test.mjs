// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWakeTracker, WAKE_THRESHOLD_MS } from './wakeTracker.ts'

// A clock we can move by hand.
function fakeClock() {
  let now = 0
  let nextId = 1
  const timers = new Map()
  return {
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { fn, at: now + ms }); return id },
    clearTimer: id => { timers.delete(id) },
    advance(ms) {
      now += ms
      for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn() }
    },
  }
}
const make = () => { const clock = fakeClock(); return { clock, tracker: createWakeTracker(WAKE_THRESHOLD_MS, clock.setTimer, clock.clearTimer) } }

test('the threshold is 4 seconds', () => assert.equal(WAKE_THRESHOLD_MS, 4000))

test('a request that answers before 4 seconds never turns the notice on', () => {
  const { clock, tracker } = make()
  const end = tracker.begin()
  clock.advance(3999)
  assert.equal(tracker.isWaking(), false)
  end()
  clock.advance(10000)
  assert.equal(tracker.isWaking(), false)
})

test('a request still waiting at 4 seconds turns the notice on', () => {
  const { clock, tracker } = make()
  tracker.begin()
  clock.advance(3999); assert.equal(tracker.isWaking(), false)
  clock.advance(1); assert.equal(tracker.isWaking(), true)
})

test('the notice clears as soon as the request answers', () => {
  const { clock, tracker } = make()
  const end = tracker.begin()
  clock.advance(6000); assert.equal(tracker.isWaking(), true)
  end(); assert.equal(tracker.isWaking(), false)
})

test('a failed request clears it too (the caller ends it in a finally block)', () => {
  const { clock, tracker } = make()
  const end = tracker.begin()
  clock.advance(5000); assert.equal(tracker.isWaking(), true)
  end(); end()
  assert.equal(tracker.isWaking(), false)
})

test('any request that answers clears it, even while another is still pending, and it does not come back on its own', () => {
  const { clock, tracker } = make()
  tracker.begin()
  const second = tracker.begin()
  clock.advance(4000); assert.equal(tracker.isWaking(), true)
  second(); assert.equal(tracker.isWaking(), false)
  clock.advance(60000); assert.equal(tracker.isWaking(), false)
})

test('listeners hear each change once and can unsubscribe', () => {
  const { clock, tracker } = make()
  let calls = 0
  const off = tracker.subscribe(() => { calls++ })
  const end = tracker.begin()
  clock.advance(4000); end()
  assert.equal(calls, 2)
  off()
  const end2 = tracker.begin(); clock.advance(4000); end2()
  assert.equal(calls, 2)
})
