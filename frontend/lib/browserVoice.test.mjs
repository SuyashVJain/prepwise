// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickVoice, cleanForBrowserSpeech, sentencesForBrowser } from './browserVoice.ts'

const v = (name, lang) => ({ name, lang })

test('English (India) is preferred over other English voices', () => {
  const voices = [v('Google US English', 'en-US'), v('Google UK English Female', 'en-GB'), v('Microsoft Neerja', 'en-IN')]
  assert.equal(pickVoice(voices).name, 'Microsoft Neerja')
})

test('an underscore language tag still counts as India', () => assert.equal(pickVoice([v('A', 'en-US'), v('B', 'en_IN')]).name, 'B'))

test('a voice that names India is next best', () => {
  assert.equal(pickVoice([v('Google US English', 'en-US'), v('Rishi (India)', 'en-AU')]).name, 'Rishi (India)')
})

test('any English voice is used when there is no Indian one', () => {
  assert.equal(pickVoice([v('Deutsch', 'de-DE'), v('Daniel', 'en-GB')]).name, 'Daniel')
})

test('no English voice gives undefined, so the caller keeps the browser default', () => {
  assert.equal(pickVoice([v('Deutsch', 'de-DE'), v('Hindi', 'hi-IN')]), undefined)
  assert.equal(pickVoice([]), undefined)
})

test('markdown marks and code are not read aloud', () => {
  assert.equal(cleanForBrowserSpeech('A **stack** is `LIFO`. See [the notes](http://x.test).'), 'A stack is LIFO . See the notes.')
  assert.equal(cleanForBrowserSpeech('Try this:\n```py\nprint(1)\n```\nDone.'), 'Try this: Done.')
  assert.equal(cleanForBrowserSpeech('  \n  '), '')
})

const entry = (turn, seq, extra = {}) => ({ turn, seq, text: `t${turn}s${seq}`, hasAudio: false, queued: false, ...extra })

test('only sentences without server audio and not yet queued go to the browser, in order', () => {
  const log = [entry(1, 2), entry(1, 1), entry(1, 3, { hasAudio: true }), entry(1, 4, { queued: true })]
  assert.deepEqual(sentencesForBrowser(log, 0).map(e => e.text), ['t1s1', 't1s2'])
})

test('sentences of a turn the student interrupted are dropped', () => {
  const log = [entry(1, 1), entry(2, 1), entry(2, 2)]
  assert.deepEqual(sentencesForBrowser(log, 1).map(e => e.text), ['t2s1', 't2s2'])
})

test('turns stay in order across turns', () => {
  assert.deepEqual(sentencesForBrowser([entry(3, 1), entry(2, 5)], 0).map(e => e.text), ['t2s5', 't3s1'])
})
