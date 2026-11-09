// Local stand-in for Supabase and the Prepwise API, used only to take README screenshots.
// It serves made-up demo data, needs no accounts or keys, and writes nothing anywhere.
//
//   node scripts/screenshots/mock-server.mjs          (listens on port 4010)
import http from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 4010)
const USER = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'student@example.com', user_metadata: { full_name: 'Demo Student' } }

const day = 86400000
const iso = n => new Date(Date.now() - n * day).toISOString()
const SESSIONS = [
  [1, 'technical', 8.0, 5, ['Deadlock detection']],
  [3, 'subject', 7.2, 5, ['Paging and segmentation']],
  [5, 'technical', 6.4, 5, ['Deadlock detection', 'CPU scheduling']],
  [8, 'hr', 7.8, 5, []],
  [10, 'system_design', 5.9, 5, ['Caching strategy']],
  [14, 'technical', 5.2, 5, ['Normalisation', 'CPU scheduling']],
  [18, 'subject', 6.1, 5, ['Normalisation']],
  [24, 'technical', 4.6, 5, ['Deadlock detection', 'Process synchronisation']],
].map(([ago, type, score, n, weak], i) => ({
  id: `s${i + 1}`, user_id: USER.id, created_at: iso(ago), interview_type: type, target_company: 'product',
  total_questions: n, score_avg: score, weak_topics: weak, completed: true,
}))

const CLAIMS = [
  { claim: 'A deadlock needs mutual exclusion, hold and wait, no preemption and circular wait.', verdict: 'correct', critical: false, confidence: 'high', reason: 'These are the four Coffman conditions.' },
  { claim: 'Breaking any one of the four conditions prevents deadlock.', verdict: 'correct', critical: false, confidence: 'high', reason: 'True for prevention strategies.' },
  { claim: 'Round-robin scheduling avoids deadlock.', verdict: 'incorrect', critical: false, confidence: 'high', reason: 'Scheduling order does not remove circular wait.' },
  { claim: 'Modern kernels usually detect it with a timer.', verdict: 'unverifiable', critical: false, confidence: 'low', reason: 'Too vague to confirm.' },
]

const QUESTIONS = [
  ['Explain what a deadlock is and the conditions needed for it to occur.', 7.0, false, 78],
  ['You said a circular wait is needed. How would you break it in a real system?', 6.5, true, 121],
  ['Compare paging and segmentation, and say where internal fragmentation appears.', 8.0, false, 96],
  ['What does a TLB miss cost, and how can software reduce it?', 8.5, false, 64],
  ['Describe how a semaphore differs from a mutex.', 7.0, false, 88],
].map(([q, score, fu, t], i) => ({
  id: `q${i + 1}`, session_id: 's1', created_at: iso(1), question_text: q,
  user_answer: 'A deadlock happens when processes wait on each other forever. It needs mutual exclusion, hold and wait, no preemption and circular wait. You can prevent it by breaking one of those conditions, for example by ordering resource requests.',
  score, hint: 'Good coverage of the four conditions and a sound prevention idea. One scheduling claim was wrong, and detection was left vague.',
  ideal_answer: 'A deadlock is a state where a set of processes each hold a resource and wait for one held by another. It needs all four Coffman conditions. Prevent it by denying one, avoid it with safe-state checks, or detect and recover.',
  claims: CLAIMS, is_follow_up: fu, time_taken_seconds: t,
}))

const FIRST = { question_number: 1, total_questions: 5, topic: 'Operating Systems', topics_pool: ['Operating Systems', 'Computer Networks', 'Database Management Systems'], rag_chunks_used: 3,
  question: 'Explain what a deadlock is, the conditions that must all hold for it to occur, and one way an operating system can prevent it.', topic_tag: 'Deadlocks',
  expected_keywords: ['mutual exclusion', 'hold and wait', 'no preemption', 'circular wait'], ideal_answer_hint: 'Four necessary conditions; prevention by denying one of them.' }

function json(res, code, body, extra = {}) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*', ...extra })
  res.end(JSON.stringify(body))
}

const TABLES = {
  profiles: { id: USER.id, full_name: 'Demo Student', university: 'Demo University', semester: 5, onboarding_complete: true },
  syllabi: { id: 'syl1', user_id: USER.id, name: 'Operating Systems and Networks', topics: ['Operating Systems', 'Computer Networks', 'Database Management Systems'], raw_chunks: [], vectors: [], created_at: iso(30) },
  sessions: SESSIONS,
  questions: QUESTIONS,
  tutor_notes: [],
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'OPTIONS') return json(res, 204, {})
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    const p = url.pathname
    if (p === '/auth/v1/user') return json(res, 200, USER)
    if (p === '/auth/v1/token') return json(res, 200, { access_token: 'demo', token_type: 'bearer', expires_in: 3600, refresh_token: 'demo', user: USER })
    if (p.startsWith('/rest/v1/')) {
      const table = p.slice('/rest/v1/'.length)
      const data = TABLES[table]
      const single = (req.headers.accept || '').includes('vnd.pgrst.object')
      if (req.method === 'GET') {
        if (single) return json(res, 200, Array.isArray(data) ? data[0] : data)
        return json(res, 200, Array.isArray(data) ? data : [data])
      }
      if (req.method === 'POST') return single ? json(res, 201, { id: 'new-session' }) : json(res, 201, [])
      return json(res, 204, {})
    }
    if (p === '/interview/start') return json(res, 200, FIRST)
    if (p === '/interview/submit-answer') return json(res, 200, { score: 6.5, hint: 'Good coverage of the four conditions and a sound prevention idea. One scheduling claim was wrong, and detection was left vague.', ideal_answer: QUESTIONS[0].ideal_answer, weak_areas: ['Deadlock detection'], claims: CLAIMS })
    if (p === '/interview/next-question') return json(res, 200, { question_number: 2, topic: 'Operating Systems', is_follow_up: true, rag_chunks_used: 3, question: 'You mentioned round-robin. Why does the scheduling order not remove a circular wait?', topic_tag: 'Deadlocks', expected_keywords: ['circular wait', 'resource ordering'], ideal_answer_hint: 'Circular wait is about resource ownership, not CPU order.' })
    if (p === '/interview/debrief') return json(res, 200, { debrief: 'You covered the core of deadlocks well and kept your answers organised. Your strongest moment was naming all four conditions without prompting. The costly gap is mixing up scheduling with resource ordering, which an interviewer will notice at once. Before your next session, write one example for each way of breaking a condition.', avg_score: 6.5, weak_topics: ['Deadlock detection', 'CPU scheduling'], total_questions: 2, scores: [6.5, 6.5] })
    if (p === '/tutor/config') return json(res, 200, { stt: { active: 'local-whisper-base-cpu', fell_back: false }, tts: { active: 'local-kokoro', fell_back: false } })
    if (p === '/tutor/videos') return json(res, 200, [])
    return json(res, 404, { detail: 'not mocked' })
  })
}).listen(PORT, () => console.log(`mock server on http://localhost:${PORT}`))
