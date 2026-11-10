// Run with: npm test (Node 22 or newer runs the TypeScript helper directly).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { longestStreak } from './stats.ts'

const d = (day) => new Date(2026, 0, day, 12).toISOString()

test('no sessions', () => assert.equal(longestStreak([]), 0))
test('one session', () => assert.equal(longestStreak([d(5)]), 1))
test('same day twice counts once', () => assert.equal(longestStreak([d(5), d(5)]), 1))
test('a gap splits the run and the longest wins', () => {
  // 1,2,3 then a gap, then 7,8: longest is 3 even though the latest run is 2.
  assert.equal(longestStreak([d(8), d(7), d(3), d(2), d(1)]), 3)
})
test('order does not matter', () => assert.equal(longestStreak([d(3), d(1), d(2)]), 3))
test('works across a month end', () => {
  assert.equal(longestStreak([new Date(2026, 0, 31, 9).toISOString(), new Date(2026, 1, 1, 9).toISOString()]), 2)
})
