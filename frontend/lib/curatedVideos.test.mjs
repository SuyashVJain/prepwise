import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(new URL('../data/curated-videos.json', import.meta.url), 'utf8'))
const SUBJECTS = ['python', 'dsa', 'dbms', 'os', 'cn', 'oop', 'toc', 'compilers', 'coa', 'digital', 'discrete', 'system-design', 'se', 'web', 'ml', 'ai']

test('every subject has an entry', () => {
  for (const id of SUBJECTS) assert.ok(Array.isArray(data[id]?.default), `missing subject ${id}`)
})

test('every video is complete, real and unique', () => {
  for (const id of SUBJECTS) {
    const lists = [data[id].default, ...Object.values(data[id].topics ?? {})]
    for (const list of lists) {
      const seen = new Set()
      for (const v of list) {
        assert.ok(v.id && v.title && v.channel, `${id}: entry needs id, title and channel`)
        assert.ok(!v.id.startsWith('TODO'), `${id}: placeholder ${v.id}`)
        assert.equal(v.id.length, 11, `${id}: bad id ${v.id}`)
        assert.ok(!seen.has(v.id), `${id}: duplicate ${v.id}`)
        seen.add(v.id)
      }
    }
  }
})
