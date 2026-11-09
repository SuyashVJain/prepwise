import Link from 'next/link'
import Logo from '@/components/Logo'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const eyebrow: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.12em', color: 'var(--lime)', marginBottom: 'var(--space-3)' }
const h2: React.CSSProperties = { fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1.05, marginBottom: 'var(--space-4)' }
const section: React.CSSProperties = { padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)', borderTop: '1px solid var(--border)' }
const inner: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto' }
const primary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', background: 'var(--lime)', color: '#0e0e0e', padding: '16px 28px', display: 'inline-flex', alignItems: 'center', minHeight: '48px' }
const secondary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', border: '1px solid var(--border-2)', color: 'var(--text)', padding: '16px 28px', display: 'inline-flex', alignItems: 'center', minHeight: '48px' }

const STEPS = [
  { n: '01', title: 'Set up a session', text: 'Upload your syllabus or pick topics, choose an interview type and a company style, and decide how many questions you want.' },
  { n: '02', title: 'Answer in your own way', text: 'Type your answer or speak it. A timer shows your pace against a soft target. Nothing cuts you off.' },
  { n: '03', title: 'Get checked feedback', text: 'Each claim in your answer is checked and marked, then scored. You see exactly what was right, wrong or unclear.' },
]

const FEATURES = [
  { title: 'Every answer fact-checked', text: 'Your answer is broken into claims. Each one is marked correct, incorrect or unverifiable before a score is given, and a confident, critical mistake caps the score.' },
  { title: 'Adaptive follow-ups', text: 'If an answer is weak or has a doubtful claim, the next question can probe that exact point once, then move on.' },
  { title: 'A voice tutor', text: 'Learn a subject by talking to Aria. Interrupt, ask for a re-explanation, get notes and flashcards at the end.' },
  { title: 'Replay and progress', text: 'Open any past session to see each question, answer, score and claim. Track your scores and weak topics over time.' },
]

const FAQ = [
  { q: 'Is it free to use?', a: 'Prepwise is a student project and has no payment system. Every scored answer is a paid call to a language model for the person hosting it, so usage limits apply and the service can change.' },
  { q: 'Where do my answers go?', a: 'Your sessions, answers, scores and feedback are stored in your account. Answers are sent to a language model provider to be scored, and voice audio is handled by a speech provider. You can delete your data from Settings. The Privacy page has the details.' },
  { q: 'How far can I trust the score?', a: 'A language model does the checking, so it can be wrong. Treat the score as a guide. Doubtful claims are marked unverifiable instead of wrong, and only confident critical errors lower the cap.' },
  { q: 'Do I need a syllabus?', a: 'No. You can upload a syllabus PDF or choose topics yourself during setup. Questions come from the topics and text you provide.' },
  { q: 'Which browser should I use for voice?', a: 'Chrome or Edge on a laptop or desktop. The browser will ask for microphone access the first time. Typing works everywhere.' },
]

const CLAIMS = [
  { verdict: 'CORRECT', color: '#d4fe42', items: ['Dijkstra repeatedly picks the unvisited vertex with the smallest distance.', 'With a binary heap it runs in O((V + E) log V).'] },
  { verdict: 'INCORRECT', color: '#ef4444', items: ['[CRITICAL] It works on graphs with negative edge weights.'] },
  { verdict: 'UNVERIFIABLE', color: '#f59e0b', items: ['It is usually fast in practice.'] },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 clamp(16px, 4vw, 40px)', minHeight: '60px', borderBottom: '1px solid var(--border)', background: 'rgba(14,14,14,0.94)' }}>
        <Link href="/" aria-label="Prepwise home"><Logo size="sm" /></Link>
        <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <a href="#how" className="landing-link hide-mobile" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)' }}>HOW IT WORKS</a>
          <a href="#faq" className="landing-link hide-mobile" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)' }}>FAQ</a>
          <Link href="/login" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text)' }}>LOG IN</Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section style={{ padding: 'clamp(48px, 9vw, 112px) clamp(16px, 4vw, 40px) clamp(40px, 6vw, 80px)', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '80px 80px', opacity: 0.25, pointerEvents: 'none' }} />
          <div style={{ ...inner, position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)', alignItems: 'center' }}>
            <div>
              <div style={eyebrow}>[MOCK INTERVIEWS FOR CS STUDENTS]</div>
              <h1 style={{ fontSize: 'clamp(44px, 8vw, 92px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-.03em', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
                Practise<br />interviews that<br /><span style={{ color: 'var(--lime)' }}>check your facts.</span>
              </h1>
              <p style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--text-2)', maxWidth: '52ch', marginBottom: 'var(--space-2)' }}>
                Prepwise asks questions from your own syllabus and fact-checks every answer claim by claim, so the score tells you what to fix.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--text-2)', marginBottom: 'var(--space-4)' }}>Made for computer science students preparing for campus placements.</p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Link href="/signup" className="btn-primary" style={primary}>CREATE FREE ACCOUNT →</Link>
                <Link href="/login" style={secondary}>LOG IN</Link>
              </div>
            </div>

            {/* static sample of the claims view */}
            <div aria-label="Sample of a checked answer" role="group" style={{ background: 'var(--bg2)', border: '1px solid var(--lime-border)', padding: 'var(--space-4)' }}>
              <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>SAMPLE · NOT A REAL SESSION</div>
              <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                Explain how Dijkstra&apos;s algorithm works and what it needs from the graph.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                <span style={{ ...mono, fontSize: '48px', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>3.5<span style={{ fontSize: '14px', color: 'var(--text-2)' }}>/10</span></span>
                <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>
                  <span style={{ color: '#d4fe42' }}>2 correct</span> / <span style={{ color: '#ef4444' }}>1 incorrect</span> / <span style={{ color: '#f59e0b' }}>1 unverifiable</span>
                </span>
              </div>
              {CLAIMS.map(g => (
                <div key={g.verdict} style={{ marginBottom: 'var(--space-2)' }}>
                  <div style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', color: g.color, marginBottom: 'var(--space-1)' }}>{g.verdict} ({g.items.length})</div>
                  {g.items.map(c => <div key={c} style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, marginBottom: 'var(--space-1)' }}>{c}</div>)}
                </div>
              ))}
              <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>One confident, critical mistake caps the score, however much else was right.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ ...section, background: 'var(--bg2)' }}>
          <div style={inner}>
            <div style={eyebrow}>[HOW IT WORKS]</div>
            <h2 style={h2}>Three steps per session</h2>
            <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              {STEPS.map(s => (
                <li key={s.n}>
                  <div style={{ ...mono, fontSize: '44px', fontWeight: 700, color: 'var(--lime)', lineHeight: 1, marginBottom: 'var(--space-2)' }}>{s.n}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>{s.title}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7 }}>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WHAT MAKES IT DIFFERENT */}
        <section id="features" style={section}>
          <div style={inner}>
            <div style={eyebrow}>[WHAT IS DIFFERENT]</div>
            <h2 style={h2}>Feedback you can act on</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{ background: 'var(--bg)', padding: 'var(--space-4)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>{f.title}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7 }}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ ...section, background: 'var(--bg2)' }}>
          <div style={{ ...inner, maxWidth: '760px' }}>
            <div style={eyebrow}>[FAQ]</div>
            <h2 style={h2}>Honest answers</h2>
            {FAQ.map(item => (
              <details key={item.q} className="faq-item" style={{ borderTop: '1px solid var(--border-2)', padding: 'var(--space-3) 0' }}>
                <summary style={{ fontSize: '16px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)', minHeight: '40px', display: 'flex', alignItems: 'center' }}>{item.q}</summary>
                <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, marginTop: 'var(--space-2)' }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CLOSING CALL */}
        <section style={{ ...section, textAlign: 'center' }}>
          <div style={{ ...inner, maxWidth: '720px' }}>
            <h2 style={{ ...h2, fontSize: 'clamp(34px, 6vw, 64px)' }}>Run your first session today</h2>
            <p style={{ fontSize: '16px', color: 'var(--text-2)', marginBottom: 'var(--space-4)' }}>It takes about two minutes to set up.</p>
            <Link href="/signup" className="btn-primary" style={primary}>CREATE FREE ACCOUNT →</Link>
          </div>
        </section>
      </main>

      <footer style={{ padding: 'var(--space-4) clamp(16px, 4vw, 40px)', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...mono, fontSize: '12px', color: 'var(--text-2)' }}>© 2026 Prepwise</span>
        <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          {[['/privacy', 'PRIVACY'], ['/terms', 'TERMS'], ['/login', 'LOG IN'], ['/signup', 'SIGN UP']].map(([href, label]) => (
            <Link key={href} href={href} className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>{label}</Link>
          ))}
          <a href="https://suyashvjain.web.app/" target="_blank" rel="noopener noreferrer" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>CONTACT</a>
        </nav>
      </footer>
    </div>
  )
}
