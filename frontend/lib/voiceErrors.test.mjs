// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeSpeechError } from './voiceErrors.ts'

test('only not-allowed is a blocked microphone', () => {
  const issue = describeSpeechError('not-allowed')
  assert.equal(issue.blocked, true)
  assert.match(issue.message, /blocked/i)
  for (const code of ['service-not-allowed', 'network', 'no-speech', 'audio-capture', 'language-not-supported', 'bad-grammar', 'something-new']) {
    const other = describeSpeechError(code)
    assert.equal(other.blocked, false, code)
    assert.doesNotMatch(other.message, /blocked/i, code)
  }
})

test('the speech service being unavailable is not called a microphone problem', () => {
  const issue = describeSpeechError('service-not-allowed')
  assert.match(issue.message, /speech service/i)
  assert.doesNotMatch(issue.message, /microphone/i)
})

test('every message offers typing', () => {
  for (const code of ['not-allowed', 'service-not-allowed', 'network', 'no-speech', 'audio-capture', 'language-not-supported', 'whatever']) {
    assert.match(describeSpeechError(code).message, /type your answer|Type your answer/, code)
  }
})

test('each cause gets its own calm line', () => {
  const messages = ['network', 'no-speech', 'audio-capture', 'service-not-allowed'].map(c => describeSpeechError(c).message)
  assert.equal(new Set(messages).size, 4)
  assert.match(describeSpeechError('no-speech').message, /No speech/)
  assert.match(describeSpeechError('audio-capture').message, /No microphone was found/)
  assert.match(describeSpeechError('network').message, /connection/)
})

test('aborted means we stopped it ourselves, so nothing is shown', () => assert.equal(describeSpeechError('aborted'), null))
