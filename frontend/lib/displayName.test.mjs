// Run with: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanDisplayName, NAME_MAX } from './displayName.ts'

test('a normal name is valid and unchanged', () => assert.deepEqual(cleanDisplayName('Asha Rao'), { value: 'Asha Rao', error: '' }))
test('empty is rejected', () => assert.equal(cleanDisplayName('').error, 'Enter a name.'))
test('only whitespace is rejected', () => assert.equal(cleanDisplayName('   \t \n ').error, 'Enter a name.'))
test('surrounding and repeated spaces are tidied', () => assert.equal(cleanDisplayName('  Asha    Rao  ').value, 'Asha Rao'))
test('40 characters is the longest allowed', () => assert.equal(cleanDisplayName('a'.repeat(NAME_MAX)).error, ''))
test('41 characters is rejected', () => assert.match(cleanDisplayName('a'.repeat(NAME_MAX + 1)).error, /40 characters or fewer/))
test('HTML tags are stripped', () => assert.deepEqual(cleanDisplayName('<b>Asha</b> <i>Rao</i>'), { value: 'Asha Rao', error: '' }))
test('script and style blocks are removed with their content', () => {
  assert.equal(cleanDisplayName('Asha<script>alert(1)</script>').value, 'Asha')
  assert.equal(cleanDisplayName('<style>body{}</style>Asha').value, 'Asha')
})
test('a name that is only markup is rejected', () => assert.equal(cleanDisplayName('<img src=x onerror=alert(1)>').error, 'Enter a name.'))
test('stray angle brackets and control characters are removed', () => {
  assert.equal(cleanDisplayName('Asha < Rao').value, 'Asha Rao')
  assert.equal(cleanDisplayName('Asha > Rao').value, 'Asha Rao')
  assert.equal(cleanDisplayName('As\u0000ha\u0007 Rao').value, 'As ha Rao')
})
test('the length limit counts the cleaned name, not the markup around it', () => {
  assert.equal(cleanDisplayName('<b>' + 'a'.repeat(NAME_MAX) + '</b>').error, '')
})
