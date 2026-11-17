// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeMicError, describeTranscribeFailure, NO_SPEECH_MESSAGE } from './voiceErrors.ts'

const MIC_ERRORS = ['NotAllowedError', 'SecurityError', 'NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'NotReadableError', 'AbortError', 'unsupported', 'SomethingElse', '']

test('only a permission error is a blocked microphone', () => {
  for (const name of ['NotAllowedError', 'SecurityError']) {
    const issue = describeMicError(name)
    assert.equal(issue.blocked, true, name)
    assert.match(issue.message, /blocked/i)
  }
  for (const name of MIC_ERRORS.filter(n => n !== 'NotAllowedError' && n !== 'SecurityError')) {
    const issue = describeMicError(name)
    assert.equal(issue.blocked, false, name)
    assert.doesNotMatch(issue.message, /blocked/i, name)
  }
})

test('each cause gets its own calm line, and every line offers typing', () => {
  const causes = ['NotFoundError', 'NotReadableError', 'unsupported', 'SomethingElse']
  assert.equal(new Set(causes.map(c => describeMicError(c).message)).size, causes.length)
  for (const name of MIC_ERRORS) assert.match(describeMicError(name).message, /type your answer|Type your answer/i, name)
  assert.match(describeMicError('NotFoundError').message, /No microphone was found/)
  assert.match(describeMicError('NotReadableError').message, /busy/)
})

test('a missing or busy microphone is not described as a permission problem', () => {
  assert.doesNotMatch(describeMicError('NotFoundError').message, /allow|permission|blocked/i)
  assert.doesNotMatch(describeMicError('NotReadableError').message, /allow|permission|blocked/i)
})

test('transcription failures are described by cause and never say blocked', () => {
  const failures = [400, 413, 429, 502, 503, 500, 'network']
  for (const f of failures) {
    const message = describeTranscribeFailure(f)
    assert.doesNotMatch(message, /blocked/i, String(f))
    assert.match(message, /type (your answer|it)|Type your answer|try again/i, String(f))
  }
  assert.match(describeTranscribeFailure(400), /No sound/)
  assert.match(describeTranscribeFailure(413), /too long/)
  assert.match(describeTranscribeFailure(429), /Too many requests/)
  assert.match(describeTranscribeFailure(502), /not available/)
  assert.equal(describeTranscribeFailure(502), describeTranscribeFailure(503))
  assert.match(describeTranscribeFailure('network'), /connection/)
  assert.notEqual(describeTranscribeFailure(500), describeTranscribeFailure(502))
})

test('no speech heard offers another try or typing', () => {
  assert.match(NO_SPEECH_MESSAGE, /No speech/)
  assert.match(NO_SPEECH_MESSAGE, /type your answer/)
})
