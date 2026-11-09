import Link from 'next/link'
import Logo from '@/components/Logo'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const eyebrow: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 'var(--space-3)' }
const pad = 'clamp(16px, 4vw, 40px)'
const primary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const secondary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', border: '1px solid var(--border-2)', color: 'var(--text)', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const footLink: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }

const SUBJECTS = ['Data Structures', 'Operating Systems', 'Databases', 'Computer Networks', 'OOP', 'System Design', 'Compilers', 'Theory of Computation', 'Machine Learning', 'Web Technologies']

const FEATURES = [
  { n: '01', title: 'Questions from your syllabus', text: 'Upload your syllabus PDF or pick topics. Every question is built from that material, not from a fixed question bank.' },
  { n: '02', title: 'Four company styles', text: 'Big tech, product startups, service companies and campus recruiters each ask differently. Technical, HR, system design and subject rounds are covered.' },
  { n: '03', title: 'A real follow-up', text: 'If an answer is weak or has a doubtful claim, the next question can probe that exact point once, then move on.' },
  { n: '04', title: 'Type or speak', text: 'Answer by keyboard or microphone. A timer shows your pace against a soft target and never cuts you off.' },
  { n: '05', title: 'A voice tutor', text: 'Learn a subject by talking to Aria. Interrupt, ask again, switch to Hinglish, and finish with notes and flashcards.' },
  { n: '06', title: 'Replay and progress', text: 'Open any past session to see each question, answer, score and claim. Track scores and weak topics over time.' },
]

const STEPS = [
  { n: '01', title: 'Set up', text: 'Upload your syllabus or choose topics. Pick an interview type, a company style and how many questions you want.' },
  { n: '02', title: 'Answer', text: 'Questions arrive one at a time. Type your answer or speak it, and take the time you need.' },
  { n: '03', title: 'Review', text: 'Each claim in your answer is checked and marked, then scored. You see what was right, wrong or unclear.' },
]

const CLAIMS = [
  { verdict: 'CORRECT', color: '#d4fe42', items: ['Dijkstra repeatedly picks the unvisited vertex with the smallest distance.', 'With a binary heap it runs in O((V + E) log V).'] },
  { verdict: 'INCORRECT', color: '#ef4444', items: ['[CRITICAL] It works on graphs with negative edge weights.'] },
  { verdict: 'UNVERIFIABLE', color: '#f59e0b', items: ['It is usually fast in practice.'] },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: `0 ${pad}`, minHeight: '60px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Link href="/" aria-label="Prepwise home"><Logo size="sm" /></Link>
        <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Link href="/login" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>Log in</Link>
          <Link href="/signup" className="btn-primary" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', minHeight: '40px' }}>Sign up</Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: `clamp(64px, 12vh, 140px) ${pad} 0`, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '80px 80px', opacity: 0.3, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: '1100px', width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 'var(--space-5)' }}>
            <div style={{ ...eyebrow, marginBottom: 'var(--space-4)' }}>[Interview coach]</div>
            <h1 style={{ fontSize: 'clamp(40px, 11vw, 140px)', fontWeight: 700, lineHeight: 0.92, letterSpacing: '-.03em', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
              <span style={{ display: 'block' }}>Prep</span>
              <span style={{ display: 'block' }}>smarter.</span>
              <span style={{ display: 'block', color: 'var(--lime)' }}>Not generic.</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              <p style={{ fontSize: '16px', color: 'var(--text-2)', maxWidth: '420px', lineHeight: 1.7 }}>
                Mock interviews built from your own syllabus, with every answer checked claim by claim. Made for computer science students preparing for campus placements.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Link href="/signup" className="btn-primary" style={primary}>Start preparing →</Link>
                <Link href="#how" className="landing-link" style={secondary}>See how it works</Link>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="ticker" style={{ position: 'relative', margin: `0 -${pad}`, borderTop: '1px solid var(--border)', height: '44px', display: 'flex', alignItems: 'center' }}>
            <div className="ticker-track">
              {[...SUBJECTS, ...SUBJECTS, ...SUBJECTS].map((s, i) => (
                <span key={i} style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                  {s} <span style={{ color: 'var(--lime)', marginLeft: '24px' }}>·</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* THE CHECK */}
        <section style={{ padding: `clamp(64px, 10vw, 120px) ${pad}`, borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(32px, 6vw, 80px)', alignItems: 'center' }}>
            <div>
              <div style={eyebrow}>[02 - The check]</div>
              <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: 'var(--space-4)' }}>Every claim<br />gets a verdict.</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '44ch' }}>
                Your answer is split into claims. Each one is marked correct, incorrect or unverifiable before a score is given, and one confident, critical mistake caps the score however fluent the rest sounds.
              </p>
            </div>
            <div role="group" aria-label="Sample of a checked answer" style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: 'var(--space-4)' }}>
              <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>SAMPLE · NOT A REAL SESSION</div>
              <p style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>Explain how Dijkstra&apos;s algorithm works and what it needs from the graph.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                <span style={{ ...mono, fontSize: '48px', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>3.5<span style={{ fontSize: '14px', color: 'var(--text-2)' }}>/10</span></span>
                <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>
                  <span style={{ color: '#d4fe42' }}>2 correct</span> / <span style={{ color: '#ef4444' }}>1 incorrect</span> / <span style={{ color: '#f59e0b' }}>1 unverifiable</span>
                </span>
              </div>
              {CLAIMS.map(g => (
                <div key={g.verdict} style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: g.color, marginBottom: 'var(--space-1)' }}>{g.verdict} ({g.items.length})</div>
                  {g.items.map(c => <div key={c} style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: 'var(--space-1)' }}>{c}</div>)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT IT DOES */}
        <section style={{ padding: `clamp(64px, 8vw, 96px) ${pad}`, borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div style={eyebrow}>[03 - What it does]</div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1 }}>The toolkit</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
              {FEATURES.map(f => (
                <div key={f.n} style={{ background: 'var(--bg)', padding: 'var(--space-4)' }}>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--lime)', marginBottom: 'var(--space-3)' }}>{f.n}</div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 'var(--space-2)' }}>{f.title}</h3>
                  <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ padding: `clamp(64px, 8vw, 96px) ${pad}`, borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ ...eyebrow, marginBottom: 'var(--space-5)' }}>[04 - How it works]</div>
            <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
              {STEPS.map(s => (
                <li key={s.n}>
                  <div aria-hidden="true" style={{ fontSize: 'clamp(64px, 8vw, 96px)', fontWeight: 700, color: 'var(--lime)', lineHeight: 1, marginBottom: 'var(--space-3)', letterSpacing: '-.03em' }}>{s.n}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 'var(--space-2)' }}>{s.title}</h3>
                  <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.8 }}>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: `clamp(80px, 12vw, 140px) ${pad}`, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ ...eyebrow, color: 'var(--text-2)', marginBottom: 'var(--space-4)' }}>[05 - Start]</div>
            <h2 style={{ fontSize: 'clamp(44px, 9vw, 100px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 'var(--space-5)' }}>Ready<br />to prep?</h2>
            <Link href="/signup" className="btn-primary" style={{ ...primary, padding: '18px 48px' }}>Create free account →</Link>
            <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '52ch', margin: 'var(--space-5) auto 0' }}>
              A student project. Scores come from a language model, so treat them as a guide. Usage limits apply.
            </p>
          </div>
        </section>
      </main>

      <footer style={{ padding: `var(--space-3) ${pad}`, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...mono, fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span>
        <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', columnGap: 'var(--space-4)' }}>
          <Link href="/privacy" className="landing-link" style={footLink}>Privacy</Link>
          <Link href="/terms" className="landing-link" style={footLink}>Terms</Link>
          <a href="https://suyashvjain.web.app/" target="_blank" rel="noopener noreferrer" className="landing-link" style={footLink}>Contact</a>
        </nav>
      </footer>
    </div>
  )
}
