// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLiveVoice } from './liveVoice.ts'

const flush = () => new Promise(r => setImmediate(r))

// A controllable world: manual timers, a fake recording and a transcription call the test answers by hand.
function world(overrides = {}) {
  const w = {
    now: 1000, ticks: null, cap: null, calls: [], pending: [], states: [], cancelled: 0, started: 0, stopped: 0,
    startError: null, finalAudio: new Blob(['final audio']),
  }
  const rec = {
    snapshot: () => new Blob(['so far']),
    stop: async () => { w.stopped++; return w.finalAudio },
    cancel: () => { w.cancelled++ },
    level: () => 0.5,
  }
  const deps = {
    start: async () => { w.started++; if (w.startError) throw w.startError; return rec },
    transcribe: blob => new Promise((resolve, reject) => { w.calls.push(blob); w.pending.push({ resolve, reject }) }),
    onChange: s => w.states.push(s),
    describeMic: err => ({ message: `mic:${err.name}`, blocked: err.name === 'NotAllowedError' }),
    describeTranscribe: err => ({ message: `failed:${err.message}`, limited: err.message === 'limited' }),
    noSpeechMessage: 'No speech',
    every: fn => { w.ticks = fn; return () => { w.ticks = null } },
    after: fn => { w.cap = fn; return () => { w.cap = null } },
    now: () => w.now,
    pauseMsWhenLimited: 15000,
    ...overrides,
  }
  w.voice = createLiveVoice(deps)
  w.answer = (i, text) => { const p = w.pending[i]; p.resolve(text); return flush() }
  w.fail = (i, message) => { w.pending[i].reject(new Error(message)); return flush() }
  return w
}

test('state flow: idle, starting, listening, finishing, done', async () => {
  const w = world()
  await w.voice.start()
  assert.deepEqual(w.states.map(s => s.phase), ['starting', 'listening'])
  assert.equal(w.voice.state.startedAt, 1000)
  const finishing = w.voice.finish()
  await flush()
  assert.equal(w.voice.state.phase, 'finishing')
  await w.answer(0, 'a stack is last in first out')
  await finishing
  assert.equal(w.voice.state.phase, 'done')
  assert.equal(w.voice.state.text, 'a stack is last in first out')
  assert.equal(w.stopped, 1)
})

test('a live update replaces the text with the transcript of the audio so far', async () => {
  const w = world()
  await w.voice.start()
  w.ticks()
  await w.answer(0, 'a stack')
  assert.equal(w.voice.state.text, 'a stack')
  w.ticks()
  await w.answer(1, 'a stack is last in first out')
  assert.equal(w.voice.state.text, 'a stack is last in first out')
  assert.equal(w.voice.state.phase, 'listening')
})

test('overlap guard: a tick is skipped while the previous request is still running', async () => {
  const w = world()
  await w.voice.start()
  w.ticks(); w.ticks(); w.ticks()
  assert.equal(w.calls.length, 1)
  await w.answer(0, 'one')
  w.ticks()
  assert.equal(w.calls.length, 2)
})

test('an empty live result keeps the words already shown', async () => {
  const w = world()
  await w.voice.start()
  w.ticks(); await w.answer(0, 'hello there')
  w.ticks(); await w.answer(1, '')
  assert.equal(w.voice.state.text, 'hello there')
})

test('finishing waits for a running live update, so requests never overlap, then runs one final transcription', async () => {
  const w = world()
  await w.voice.start()
  w.ticks()
  const finishing = w.voice.finish()
  await flush()
  assert.equal(w.calls.length, 1, 'final not sent while the live update runs')
  await w.answer(0, 'late live text')
  await flush()
  assert.equal(w.calls.length, 2)
  assert.equal(await w.calls[1].text(), 'final audio')
  await w.answer(1, 'the final answer')
  await finishing
  assert.equal(w.voice.state.text, 'the final answer', 'the final text wins over the late live text')
  assert.equal(w.voice.state.phase, 'done')
})

test('no more live updates after finishing', async () => {
  const w = world()
  await w.voice.start()
  const finishing = w.voice.finish()
  assert.equal(w.ticks, null)
  await flush()
  await w.answer(0, 'done text')
  await finishing
  assert.equal(w.calls.length, 1)
})

test('a failed live update shows a notice and recording carries on', async () => {
  const w = world()
  await w.voice.start()
  w.ticks(); await w.fail(0, 'network')
  assert.equal(w.voice.state.phase, 'listening')
  assert.equal(w.voice.state.notice, 'failed:network')
  assert.equal(w.voice.state.error, null)
  w.ticks(); await w.answer(1, 'back again')
  assert.equal(w.voice.state.notice, null)
  assert.equal(w.voice.state.text, 'back again')
})

test('a rate limit pauses live updates for a while, with a clear message', async () => {
  const w = world()
  await w.voice.start()
  w.ticks(); await w.fail(0, 'limited')
  assert.equal(w.voice.state.notice, 'failed:limited')
  w.now += 5000
  w.ticks()
  assert.equal(w.calls.length, 1, 'still paused')
  w.now += 11000
  w.ticks()
  assert.equal(w.calls.length, 2, 'resumes after the pause')
})

test('a failed final transcription is an error with retry, and the retry re-sends the same recording', async () => {
  const w = world()
  await w.voice.start()
  w.ticks(); await w.answer(0, 'live words')
  const finishing = w.voice.finish()
  await flush()
  await w.fail(1, 'boom')
  await finishing
  assert.equal(w.voice.state.phase, 'error')
  assert.equal(w.voice.state.error, 'failed:boom')
  assert.equal(w.voice.state.micProblem, false)
  assert.equal(w.voice.state.text, 'live words', 'the live words are kept')
  const retrying = w.voice.retry()
  await flush()
  assert.equal(w.started, 1, 'the microphone is not started again')
  assert.equal(await w.calls[2].text(), 'final audio')
  await w.answer(2, 'recovered')
  await retrying
  assert.equal(w.voice.state.phase, 'done')
  assert.equal(w.voice.state.text, 'recovered')
})

test('nothing heard in the final transcription is a calm error that offers another go', async () => {
  const w = world()
  await w.voice.start()
  const finishing = w.voice.finish()
  await flush()
  await w.answer(0, '')
  await finishing
  assert.equal(w.voice.state.phase, 'error')
  assert.equal(w.voice.state.error, 'No speech')
  await w.voice.retry()
  assert.equal(w.started, 2, 'retry records again')
  assert.equal(w.voice.state.phase, 'listening')
})

test('a blocked microphone is reported as blocked, other microphone errors are not', async () => {
  const blocked = world({ start: async () => { throw Object.assign(new Error('x'), { name: 'NotAllowedError' }) } })
  await blocked.voice.start()
  assert.equal(blocked.voice.state.phase, 'error')
  assert.equal(blocked.voice.state.micProblem, true)
  assert.equal(blocked.voice.state.blocked, true)
  const missing = world({ start: async () => { throw Object.assign(new Error('x'), { name: 'NotFoundError' }) } })
  await missing.voice.start()
  assert.equal(missing.voice.state.micProblem, true)
  assert.equal(missing.voice.state.blocked, false)
  assert.equal(missing.voice.state.error, 'mic:NotFoundError')
})

test('a transcription error never marks the microphone as a problem', async () => {
  const w = world()
  await w.voice.start()
  const finishing = w.voice.finish()
  await flush()
  await w.fail(0, 'limited')
  await finishing
  assert.equal(w.voice.state.micProblem, false)
  assert.equal(w.voice.state.blocked, false)
})

test('the time cap finishes the recording on its own', async () => {
  const w = world()
  await w.voice.start()
  w.cap()
  await flush()
  assert.equal(w.voice.state.phase, 'finishing')
  assert.equal(w.stopped, 1)
})

test('cancelling discards the recording and ignores a late result', async () => {
  const w = world()
  await w.voice.start()
  w.ticks()
  w.voice.cancel()
  assert.equal(w.cancelled, 1)
  assert.equal(w.voice.state.phase, 'idle')
  await w.answer(0, 'too late')
  assert.equal(w.voice.state.text, '')
  assert.equal(w.voice.state.phase, 'idle')
})

test('cancelling while the microphone is starting releases it as soon as it opens', async () => {
  let open
  const w = world({ start: () => new Promise(r => { open = r }) })
  const starting = w.voice.start()
  w.voice.cancel()
  let cancelled = 0
  open({ snapshot: () => new Blob([]), stop: async () => new Blob([]), cancel: () => { cancelled++ }, level: () => 0 })
  await starting
  assert.equal(cancelled, 1)
  assert.equal(w.voice.state.phase, 'idle')
})

test('a second tap while starting or finishing does nothing', async () => {
  const w = world()
  await Promise.all([w.voice.start(), w.voice.start()])
  assert.equal(w.started, 1)
  const finishing = w.voice.finish()
  await w.voice.finish()
  await w.voice.start()
  assert.equal(w.started, 1)
  await flush()
  await w.answer(0, 'x')
  await finishing
})
