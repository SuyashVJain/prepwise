// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderMySubjects, matchSubjectId, readPicked, rememberPicked, FIRST_TIME_IDS } from './mySubjectsCore.ts'

const subjects = [
  { id: 'python', name: 'Python' }, { id: 'dsa', name: 'DSA' }, { id: 'dbms', name: 'DBMS' }, { id: 'os', name: 'Operating Systems' },
  { id: 'cn', name: 'Computer Networks' }, { id: 'oop', name: 'OOP' }, { id: 'compilers', name: 'Compilers' }, { id: 'ml', name: 'Machine Learning' },
]
const order = (o) => orderMySubjects({ subjects, onboarding: [], syllabus: [], recent: [], ...o })

test('first-time fallback when nothing is known', () => assert.deepEqual(order({}), FIRST_TIME_IDS))
test('fallback also when nothing matches a shared subject', () => assert.deepEqual(order({ onboarding: ['Quantum basket weaving'] }), FIRST_TIME_IDS))
test('onboarding picks come first, then syllabus, then recent', () => {
  assert.deepEqual(order({ onboarding: ['Compilers', 'Python'], syllabus: ['Operating Systems'], recent: ['Machine Learning'] }), ['compilers', 'python', 'os', 'ml'])
})
test('duplicates are removed and the first position wins', () => {
  assert.deepEqual(order({ onboarding: ['Python', 'python'], syllabus: ['PYTHON', 'DSA'], recent: ['dsa', 'Python', 'OOP'] }), ['python', 'dsa', 'oop'])
})
test('aliases and ids map to the shared subject', () => {
  assert.equal(matchSubjectId('Data Structures and Algorithms', subjects), 'dsa')
  assert.equal(matchSubjectId('Compiler Design', subjects), 'compilers')
  assert.equal(matchSubjectId(' os ', subjects), 'os')
  assert.equal(matchSubjectId('Underwater Welding', subjects), null)
})
test('recent use keeps its own order (most recent first)', () => {
  assert.deepEqual(order({ recent: ['Machine Learning', 'OOP', 'Compilers'] }), ['ml', 'oop', 'compilers'])
})

function fakeStore() {
  const m = new Map()
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) } }
}
test('picked subjects are remembered per user, newest first, without repeats', () => {
  const s = fakeStore()
  rememberPicked(s, 'u1', 'ml'); rememberPicked(s, 'u1', 'oop'); rememberPicked(s, 'u1', 'ml')
  assert.deepEqual(readPicked(s, 'u1'), ['ml', 'oop'])
  assert.deepEqual(readPicked(s, 'u2'), [])
})
test('blocked or broken storage never throws', () => {
  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.deepEqual(readPicked(broken, 'u1'), [])
  assert.doesNotThrow(() => rememberPicked(broken, 'u1', 'ml'))
  assert.deepEqual(readPicked(null, 'u1'), [])
  assert.deepEqual(readPicked({ getItem: () => '{not json', setItem() {} }, 'u1'), [])
})
