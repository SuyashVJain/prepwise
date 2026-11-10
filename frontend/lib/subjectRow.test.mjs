// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibleSubjects } from './subjectRow.ts'

const o = v => ({ value: v })
const mine = ['python', 'dsa', 'dbms', 'os', 'cn', 'oop', 'ml', 'web'].map(o)
const values = list => list.map(x => x.value)

test('selected already visible: the row is unchanged and nothing moves', () => {
  const before = values(visibleSubjects(mine, o('python'), 5))
  for (const pick of ['python', 'dsa', 'os']) assert.deepEqual(values(visibleSubjects(mine, o(pick), 5)), before)
  assert.deepEqual(before, ['python', 'dsa', 'dbms', 'os', 'cn'])
})

test('selected hidden: it replaces the last visible pill only', () => {
  assert.deepEqual(values(visibleSubjects(mine, o('web'), 5)), ['python', 'dsa', 'dbms', 'os', 'web'])
})

test('Python, then Web Technologies, then Python again leaves the other pills untouched', () => {
  const a = values(visibleSubjects(mine, o('python'), 4))
  const b = values(visibleSubjects(mine, o('web'), 4))
  const c = values(visibleSubjects(mine, o('python'), 4))
  assert.deepEqual(a, ['python', 'dsa', 'dbms', 'os'])
  assert.deepEqual(b, ['python', 'dsa', 'dbms', 'web'])
  assert.deepEqual(c, a)
  assert.deepEqual(b.slice(0, 3), a.slice(0, 3))
})

test('narrow width: one pill fits, the selection takes it', () => {
  assert.deepEqual(values(visibleSubjects(mine, o('dsa'), 1)), ['dsa'])
  assert.deepEqual(values(visibleSubjects(mine, o('python'), 1)), ['python'])
  assert.deepEqual(values(visibleSubjects(mine, o('python'), 0)), ['python'])
})

test('at most six pills even when more would fit', () => {
  assert.equal(visibleSubjects(mine, o('python'), 20).length, 6)
})

test('All my syllabus topics first: selecting a subject keeps it in place while it fits', () => {
  const all = [o(''), ...mine]
  assert.deepEqual(values(visibleSubjects(all, o('dsa'), 4)), ['', 'python', 'dsa', 'dbms'])
  assert.deepEqual(values(visibleSubjects(all, o(''), 4)), ['', 'python', 'dsa', 'dbms'])
})

test('All my syllabus topics is replaced only as the last pill when it is the selection that is hidden', () => {
  const all = [o(''), ...mine]
  // narrow: only the leading pill fits and a subject is selected, so the subject takes that single slot
  assert.deepEqual(values(visibleSubjects(all, o('dsa'), 1)), ['dsa'])
  // wider: the leading pill stays first and the selection takes the last slot
  assert.deepEqual(values(visibleSubjects(all, o('web'), 3)), ['', 'python', 'web'])
})

test('no candidates: the selection is shown on its own', () => {
  assert.deepEqual(values(visibleSubjects([], o('ml'), 3)), ['ml'])
  assert.deepEqual(values(visibleSubjects([], undefined, 3)), [])
})
