import Link from 'next/link'
import Logo from '@/components/Logo'
import Reveal from '@/components/Reveal'
import TryDemo from '@/components/TryDemo'
import TryLink from '@/components/TryLink'
import SectionDots from '@/components/SectionDots'
import FeedbackCard from '@/components/FeedbackCard'

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const gutter = 'clamp(16px, 3vw, 48px)'
const eyebrow: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 'var(--space-3)' }
const primary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const secondary: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', border: '1px solid var(--border-2)', color: 'var(--text)', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', minHeight: '52px' }
const footLink: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }
const bigTitle: React.CSSProperties = { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.03em', lineHeight: 0.95 }

const SUBJECTS = ['Data Structures', 'Operating Systems', 'Databases', 'Computer Networks', 'OOP', 'System Design', 'Compilers', 'Theory of Computation', 'Machine Learning', 'Web Technologies']

const POINTS = ['Questions from your syllabus', 'Every claim checked, one by one', 'Follow-ups on weak answers', 'Voice tutor, replay and progress']

const STEPS = [
  { n: '01', title: 'Set up', text: 'Upload your syllabus or choose topics. Pick an interview type, a company style and how many questions you want.' },
  { n: '02', title: 'Answer', text: 'Questions arrive one at a time. Type your answer or speak it, and take the time you need.' },
  { n: '03', title: 'Review', text: 'Each claim in your answer is checked and marked, then scored. You see what was right, wrong or unclear.' },
]

const sectionY = 'clamp(20px, 4svh, 56px)'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Reveal />
      <SectionDots />
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: `0 ${gutter}`, height: '60px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Link href="/" aria-label="Prepwise home" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}><Logo size="sm" /></Link>
        <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 24px)', whiteSpace: 'nowrap' }}>
          <TryLink className="landing-link hide-mobile" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Try it</TryLink>
          <Link href="/login" className="landing-link" style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Log in</Link>
          <Link href="/signup" className="btn-primary" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>Sign up</Link>
        </nav>
      </header>

      <main>
        {/* HERO: full bleed. Headline with the live claim card beside the end of its lines; stacked below 1100px. */}
        <section id="hero" className="frame frame-hero" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '80px 80px', opacity: 0.3, pointerEvents: 'none' }} />
          <div className="hero-grid" style={{ position: 'relative', flex: 1, padding: `clamp(24px, 4svh, 56px) ${gutter}` }}>
            <div className="hero-head">
              <div style={{ ...eyebrow, marginBottom: 'var(--space-3)' }}>[Interview coach]</div>
              <h1 className="hero-title" style={bigTitle}>
                <span className="h-line"><span>Prep</span></span>
                <span className="h-line"><span>smarter.</span></span>
                <span className="h-line" style={{ color: 'var(--lime)' }}><span>Not generic.</span></span>
              </h1>
            </div>
            <div className="hero-actions">
              <p style={{ fontSize: '16px', color: 'var(--text-2)', maxWidth: '460px', lineHeight: 1.7 }}>
                Mock interviews built from your own syllabus, with every answer fact-checked claim by claim. For CS students preparing for campus placements.
              </p>
              <div className="hero-buttons">
                <Link href="/signup" className="btn-primary" style={primary}>Start preparing →</Link>
                <TryLink className="btn-secondary" style={secondary}>Try a question ↓</TryLink>
              </div>
            </div>
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

        {/* HOW IT WORKS: three steps, then four one-line points */}
        <section id="how" className="reveal frame frame-center" style={{ borderTop: '1px solid var(--border)', padding: `${sectionY} 0 0` }}>
          <div style={{ ...eyebrow, padding: `0 ${gutter}`, marginBottom: 'var(--space-3)' }}>[How it works]</div>
          <ol className="steps" style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-4) 0', paddingBottom: sectionY }}>
            {STEPS.map(s => (
              <li key={s.n} className="step" style={{ padding: `0 ${gutter}` }}>
                <div aria-hidden="true" className="step-n" style={{ fontSize: 'clamp(48px, min(8vw, 12svh), 120px)', fontWeight: 700, color: 'var(--lime)', lineHeight: 0.9, letterSpacing: '-.05em', marginBottom: 'var(--space-2)' }}>{s.n}</div>
                <h3 style={{ fontSize: 'clamp(18px, 1.6vw, 24px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 'var(--space-1)' }}>{s.title}</h3>
                <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '38ch' }}>{s.text}</p>
              </li>
            ))}
          </ol>
          <ul aria-label="What you get" className="points" style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', borderTop: '1px solid var(--border)' }}>
            {POINTS.map(t => (
              <li key={t} style={{ padding: `var(--space-3) ${gutter}`, fontSize: '15px', fontWeight: 600, borderRight: '1px solid var(--border)', display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
                <span aria-hidden="true" style={{ color: 'var(--lime)' }}>+</span>{t}
              </li>
            ))}
          </ul>
        </section>

        {/* TRY IT: one real question, no account */}
        <section id="try" className="reveal frame frame-center" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: `${sectionY} ${gutter}` }}>
          <div style={eyebrow}>[Try it without signing up]</div>
          <h2 style={{ ...bigTitle, fontSize: 'clamp(28px, min(4.5vw, 7svh), 64px)', marginBottom: 'clamp(12px, 2.4svh, 24px)' }}>Try one question.</h2>
          <TryDemo />
        </section>

        {/* PRODUCT: one real screen, framed, shown with made-up demo data */}
        <section id="product" className="reveal product frame" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: `${sectionY} ${gutter}` }}>
          <div className="product-copy">
            <div style={eyebrow}>[The product]</div>
            <h2 style={{ ...bigTitle, fontSize: 'clamp(28px, min(4vw, 6.5svh), 56px)', marginBottom: 'clamp(8px, 1.6svh, 16px)' }}>See the feedback.</h2>
            <p className="pc-more" style={{ fontSize: '16px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '36ch', marginBottom: 'var(--space-3)' }}>Every answer comes back as a scored, claim-by-claim check.</p>
            <ul className="pc-more" style={{ listStyle: 'none', display: 'grid', gap: 'var(--space-2)' }}>
              {['A score out of 10', 'Every claim marked correct, incorrect or unverifiable', 'A short reason for each'].map(t => (
                <li key={t} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: '15px', fontWeight: 600 }}><span aria-hidden="true" style={{ color: 'var(--lime)' }}>+</span>{t}</li>
              ))}
            </ul>
          </div>
          <FeedbackCard />
        </section>

        {/* CLOSING */}
        <section id="start" className="reveal frame frame-close" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="close-main" style={{ padding: `${sectionY} ${gutter}` }}>
          <h2 style={{ ...bigTitle, fontSize: 'clamp(40px, min(11vw, 20svh), 200px)', marginBottom: 'var(--space-4)' }}>Ready<br />to prep?</h2>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 'clamp(24px, 4vw, 64px)', rowGap: 'var(--space-3)' }}>
            <Link href="/signup" className="btn-primary" style={{ ...primary, padding: '20px 40px' }}>Create free account →</Link>
            <p style={{ ...mono, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, maxWidth: '52ch' }}>
              Scores come from a language model, so treat them as a guide. Usage limits apply.
            </p>
          </div>
          </div>
        <footer style={{ padding: `var(--space-3) ${gutter}`, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...mono, fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span>
          <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', columnGap: 'var(--space-4)' }}>
            <Link href="/privacy" className="landing-link" style={footLink}>Privacy</Link>
            <Link href="/terms" className="landing-link" style={footLink}>Terms</Link>
            <a href="https://suyashvjain.web.app/" target="_blank" rel="noopener noreferrer" className="landing-link" style={footLink}>Contact</a>
          </nav>
        </footer>
        </section>
      </main>

    </div>
  )
}
