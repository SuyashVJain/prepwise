// Takes the README screenshots from a running app and the mock server. Needs Node 22 or newer and a Chrome or
// Chromium binary (set CHROME_PATH). No packages to install.
//
//   FRONTEND_URL=http://localhost:3100 CHROME_PATH=/path/to/chrome node scripts/screenshots/capture.mjs docs/assets
//
// The frontend must be started with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_API_URL pointing at the mock server
// (http://localhost:4010) and any value for NEXT_PUBLIC_SUPABASE_ANON_KEY.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FRONT = process.env.FRONTEND_URL || 'http://localhost:3100'
const CHROME = process.env.CHROME_PATH
const OUT = process.argv[2] || 'docs/assets'
if (!CHROME) { console.error('Set CHROME_PATH to a Chrome or Chromium executable.'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'prepwise-shots-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9444', '--no-first-run', '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'student@example.com', user_metadata: { full_name: 'Demo Student' } }
const session = { access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
const cookie = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')

try {
  await sleep(2500)
  const targets = await (await fetch('http://127.0.0.1:9444/json/list')).json()
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const evalJS = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
  // The development build shows a small floating badge; hide it so it stays out of the pictures.
  const go = async path => {
    await send('Page.navigate', { url: FRONT + path })
    await sleep(3500)
    await evalJS(`document.head.appendChild(Object.assign(document.createElement('style'), { textContent: 'nextjs-portal { display: none !important }' }))`)
  }
  const waitText = async (text, ms = 20000) => {
    const end = Date.now() + ms
    while (Date.now() < end) { if (await evalJS(`document.body.innerText.includes(${JSON.stringify(text)})`)) return; await sleep(300) }
    throw new Error('Timed out waiting for: ' + text)
  }
  const click = text => evalJS(`(() => { const el = [...document.querySelectorAll('button,a,summary')].find(e => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true })()`)
  const shot = async name => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'))
    console.log('saved', name)
  }

  await send('Page.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false })

  // public page first, signed out
  await go('/')
  await shot('landing')

  // sign in with the demo session, skip the one-time welcome and start-up screens
  await send('Network.setCookie', { name: 'sb-localhost-auth-token', value: cookie, domain: 'localhost', path: '/' })
  await evalJS(`localStorage.setItem('pw_welcome_seen', '1'); sessionStorage.setItem('pw_loaded', '1')`)

  await go('/dashboard')
  await waitText('CANDIDATE DASHBOARD')
  await sleep(800)
  await shot('dashboard')

  // interview: answer, show the claims, follow up, then finish
  await go('/interview')
  await waitText('START SESSION')
  await click('START SESSION')
  await waitText('Explain what a deadlock is')
  const answer = 'A deadlock happens when processes wait on each other forever. It needs mutual exclusion, hold and wait, no preemption and circular wait. You can prevent it by breaking one of those conditions, for example by ordering resource requests.'
  await evalJS(`document.querySelector('textarea').focus()`)
  await send('Input.insertText', { text: answer })
  await click('SUBMIT ANSWER')
  await waitText('EVALUATED')
  await click('CLAIMS CHECKED')
  await sleep(800)
  await shot('interview')

  await click('NEXT QUESTION')
  await waitText('FOLLOW-UP')
  await evalJS(`document.querySelector('textarea').focus()`)
  await send('Input.insertText', { text: 'Round-robin only decides which process gets the CPU. A circular wait is about who holds which resource, so changing the CPU order does not break the cycle.' })
  await click('SUBMIT ANSWER')
  await waitText('EVALUATED')
  await click('END SESSION')
  await waitText('AVERAGE SCORE BY TOPIC')
  await sleep(800)
  await shot('debrief')

  await go('/history')
  await waitText('PAST SESSIONS')
  await click('QUESTIONS ANSWERED')
  await waitText('YOUR ANSWER')
  await sleep(500)
  await shot('history')

  await go('/progress')
  await waitText('SCORE OVER TIME')
  await sleep(500)
  await shot('progress')

  await go('/tutor')
  await sleep(2500)
  await shot('tutor')

  ws.close()
} catch (e) {
  console.error('Failed:', e.message)
  process.exitCode = 1
} finally {
  chrome.kill()
}
