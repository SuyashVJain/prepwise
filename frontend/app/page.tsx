import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'
import Reveal from '@/components/Reveal'
import ClaimDemo from '@/components/ClaimDemo'
import TryDemo from '@/components/TryDemo'
import TryLink from '@/components/TryLink'
import StickySignup from '@/components/StickySignup'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const gutter = 'clamp(16px, 3vw, 48px)'
const eyebrow: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 'var(--space-3)' }
const primary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const secondary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', border: '1px solid var(--border-2)', color: 'var(--text)', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const footLink: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }
const bigTitle: React.CSSProperties = { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.03em', lineHeight: 0.95 }

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

const INTERVIEW_TYPES = ['Technical', 'HR / Behavioural', 'System Design', 'Subject-Specific']
const COMPANY_STYLES = ['FAANG / Big Tech', 'Product Startups', 'Service Companies', 'Core CS Campus']

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Reveal />
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: `0 ${gutter}`, height: '60px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Link href="/" aria-label="Prepwise home"><Logo size="sm" /></Link>
        <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 24px)', whiteSpace: 'nowrap' }}>
          <TryLink className="landing-link hide-mobile" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>Try it</TryLink>
          <Link href="/login" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '40px', display: 'inline-flex', alignItems: 'center' }}>Log in</Link>
          <StickySignup />
        </nav>
      </header>

      <main>
        {/* HERO: full bleed. Headline left, live claim check right on wide screens; stacked below 1100px. */}
        <section id="hero" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 60px)' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '80px 80px', opacity: 0.3, pointerEvents: 'none' }} />
          <div className="hero-grid" style={{ position: 'relative', flex: 1, padding: `clamp(24px, 4svh, 56px) ${gutter}` }}>
            <div className="hero-copy">
              <div style={{ ...eyebrow, marginBottom: 'var(--space-3)' }}>[Interview coach]</div>
              <h1 className="hero-title" style={{ ...bigTitle, marginBottom: 'clamp(20px, 4svh, 48px)' }}>
                <span className="h-line"><span>Prep</span></span>
                <span className="h-line"><span>smarter.</span></span>
                <span className="h-line" style={{ color: 'var(--lime)' }}><span>Not generic.</span></span>
              </h1>
              <div className="hero-actions" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 'clamp(24px, 3vw, 48px)', rowGap: 'var(--space-3)' }}>
                <p style={{ fontSize: '16px', color: 'var(--text-2)', maxWidth: '460px', lineHeight: 1.7 }}>
                  Mock interviews built from your own syllabus, with every answer checked claim by claim. Made for computer science students preparing for campus placements.
                </p>
                <div className="hero-buttons" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <Link href="/signup" className="btn-primary" style={primary}>Start preparing →</Link>
                  <Link href="#how" className="landing-link" style={secondary}>See how it works</Link>
                  <TryLink className="landing-link" style={secondary}>Try a question ↓</TryLink>
                </div>
              </div>
              <p style={{ ...mono, fontSize: 'clamp(13px, 1.1vw, 16px)', fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.7, marginTop: 'clamp(16px, 2.5svh, 28px)' }}>
                For campus placements<span aria-hidden="true" style={{ color: 'var(--lime)' }}> · </span>Technical rounds<span aria-hidden="true" style={{ color: 'var(--lime)' }}> · </span>HR rounds<span aria-hidden="true" style={{ color: 'var(--lime)' }}> · </span>System design
              </p>
            </div>
            <div className="hero-demo"><ClaimDemo compact /></div>
          </div>
          <div aria-hidden="true" className="ticker" style={{ position: 'relative', borderTop: '1px solid var(--border)', height: '44px', display: 'flex', alignItems: 'center', background: 'var(--bg)' }}>
            <div className="ticker-track">
              {[...SUBJECTS, ...SUBJECTS, ...SUBJECTS].map((s, i) => (
                <span key={i} style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                  {s} <span style={{ color: 'var(--lime)', marginLeft: '24px' }}>·</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* THE CHECK: the explanation only; the live card is in the hero */}
        <section className="reveal" style={{ padding: `clamp(56px, 8vw, 120px) ${gutter} clamp(72px, 10vw, 160px)`, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'clamp(24px, 5vw, 96px)', alignItems: 'end' }}>
          <div>
            <div style={eyebrow}>[02 - The check]</div>
            <h2 style={{ ...bigTitle, fontSize: 'clamp(40px, 7.5vw, 128px)' }}>Every claim<br />gets a<br />verdict.</h2>
          </div>
          <p style={{ fontSize: 'clamp(16px, 1.5vw, 22px)', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '46ch' }}>
            Your answer is split into claims. Each one is marked correct, incorrect or unverifiable before a score is given, and one confident, critical mistake caps the score however fluent the rest sounds.
          </p>
        </section>

        {/* TRY IT: one real question, no account */}
        <section id="try" className="reveal" style={{ scrollMarginTop: '60px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: `clamp(48px, 7vw, 112px) ${gutter}` }}>
          <div style={eyebrow}>[Try it without signing up]</div>
          <h2 style={{ ...bigTitle, fontSize: 'clamp(32px, 5vw, 72px)', marginBottom: 'var(--space-5)' }}>Try one question.</h2>
          <TryDemo />
        </section>

        {/* BUILT FOR: full-width strip, names as the app shows them */}
        <section className="reveal" aria-label="Interview types and company styles" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
          {[['Interview types', INTERVIEW_TYPES], ['Company styles', COMPANY_STYLES]].map(([label, items]) => (
            <div key={label as string} style={{ padding: `var(--space-4) ${gutter}`, borderRight: '1px solid var(--border)' }}>
              <div style={{ ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 'var(--space-3)' }}>[Built for - {label as string}]</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', columnGap: 'var(--space-4)', rowGap: 'var(--space-2)' }}>
                {(items as string[]).map(t => <li key={t} style={{ fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.01em' }}>{t}</li>)}
              </ul>
            </div>
          ))}
        </section>

        {/* PRODUCT: two real screens from the app, shown with made-up demo data */}
        <section className="reveal" style={{ padding: `clamp(56px, 8vw, 120px) ${gutter}` }}>
          <div style={eyebrow}>[03 - The product]</div>
          <h2 style={{ ...bigTitle, fontSize: 'clamp(32px, 5vw, 72px)', marginBottom: 'var(--space-5)' }}>See the feedback.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 'clamp(16px, 2vw, 32px)' }}>
            {[
              { src: '/landing/interview.webp', alt: 'The interview screen after an answer: the score, the claims list with correct, incorrect and unverifiable claims, and a hint', cap: 'Interview: every claim marked' },
              { src: '/landing/debrief.webp', alt: 'The debrief screen with the score ring, strengths and fix-next cards and a chart of scores by topic', cap: 'Debrief: what to fix next' },
            ].map((f, i) => (
              <figure key={f.src}>
                <div style={{ border: '1px solid var(--border-2)', background: 'var(--bg2)' }}>
                  <Image src={f.src} alt={f.alt} width={1600} height={1000} sizes="(min-width: 900px) 50vw, 100vw" loading={i === 0 ? undefined : 'lazy'} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                <figcaption style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginTop: 'var(--space-2)' }}>{f.cap} · demo data</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* TOOLKIT: edge to edge hairline grid */}
        <section className="reveal" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: `clamp(32px, 4vw, 56px) ${gutter}` }}>
            <div style={eyebrow}>[04 - What it does]</div>
            <h2 style={{ ...bigTitle, fontSize: 'clamp(32px, 5vw, 72px)' }}>The toolkit</h2>
          </div>
          <div className="tool-grid" style={{ display: 'grid', gap: '1px', background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
            {FEATURES.map(f => (
              <div key={f.n} style={{ background: 'var(--bg)', padding: `clamp(24px, 3vw, 48px) ${gutter}`, minHeight: '220px' }}>
                <div style={{ ...mono, fontSize: '13px', letterSpacing: '.1em', color: 'var(--lime)', marginBottom: 'var(--space-4)' }}>{f.n}</div>
                <h3 style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 'var(--space-2)' }}>{f.title}</h3>
                <p style={{ ...mono, fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STEPS: oversized numerals across the full width */}
        <section id="how" className="reveal" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: `clamp(40px, 5vw, 72px) 0 clamp(48px, 7vw, 112px)` }}>
          <div style={{ ...eyebrow, padding: `0 ${gutter}`, marginBottom: 'var(--space-4)' }}>[05 - How it works]</div>
          <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
            {STEPS.map(s => (
              <li key={s.n} style={{ padding: `0 ${gutter}` }}>
                <div aria-hidden="true" style={{ fontSize: 'clamp(96px, 16vw, 280px)', fontWeight: 700, color: 'var(--lime)', lineHeight: 0.9, letterSpacing: '-.05em', marginBottom: 'var(--space-3)' }}>{s.n}</div>
                <h3 style={{ fontSize: 'clamp(18px, 1.8vw, 28px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 'var(--space-2)' }}>{s.title}</h3>
                <p style={{ ...mono, fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8, maxWidth: '38ch' }}>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CLOSING */}
        <section className="reveal" style={{ borderTop: '1px solid var(--border)', padding: `clamp(56px, 9vw, 140px) ${gutter} clamp(40px, 5vw, 72px)` }}>
          <div style={{ ...eyebrow, color: 'var(--text-2)', marginBottom: 'var(--space-3)' }}>[06 - Start]</div>
          <h2 style={{ ...bigTitle, fontSize: 'clamp(48px, 15vw, 300px)', marginBottom: 'clamp(24px, 4vw, 56px)' }}>Ready<br />to prep?</h2>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 'clamp(24px, 4vw, 64px)', rowGap: 'var(--space-3)' }}>
            <Link href="/signup" className="btn-primary" style={{ ...primary, padding: '20px 48px' }}>Create free account →</Link>
            <p style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '52ch' }}>
              Scores come from a language model, so treat them as a guide. Usage limits apply.
            </p>
          </div>
        </section>
      </main>

      <footer style={{ padding: `var(--space-3) ${gutter}`, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
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
