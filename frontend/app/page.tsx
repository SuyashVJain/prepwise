// prepwise/app/page.tsx
'use client'
import Link from 'next/link'
import Logo from '@/components/Logo'

const features = [
  { num: '01', title: 'SYLLABUS-AWARE QUESTIONS', desc: 'Upload your university syllabus PDF. Every question is grounded in what you actually study - not generic LeetCode.' },
  { num: '02', title: 'TARGET COMPANY MODES', desc: 'FAANG, product startups, service companies - each has a distinct interview style. We calibrate to yours.' },
  { num: '03', title: 'VOICE + TEXT INTERVIEW', desc: 'Speak your answers or type them. Aria adapts to your pace and gives feedback either way.' },
  { num: '04', title: 'REAL-TIME SCORING', desc: '0–10 per answer with a brief hint immediately after. Full debrief report at the end of every session.' },
  { num: '05', title: 'WEAK TOPIC TRACKING', desc: 'Every session feeds your profile. Gaps surface automatically across sessions over time.' },
  { num: '06', title: 'BUILT FOR INDIA', desc: 'Designed specifically for Indian CS students and campus placement rounds. No fluff, just prep that works.' },
]

const universities = ['SUAS', 'VTU', 'RGPV', 'MUMBAI UNI', 'GTU', 'AKTU', 'ANNA UNIV', 'JNTU']

const steps = [
  { num: '01', title: 'INGEST', desc: 'Upload your syllabus PDF. We parse it, chunk it, embed it into a vector store calibrated to your curriculum.' },
  { num: '02', title: 'SIMULATE', desc: 'Enter a mock interview with Aria. Voice or text. Questions grounded in your actual syllabus content.' },
  { num: '03', title: 'DIAGNOSE', desc: 'Get a frame-by-frame breakdown. Score per answer, ideal answers, weak topics, and a personal debrief.' },
]

export default function LandingPage() {
  const mono = { fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties
  const grotesk = { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: '56px', borderBottom: '1px solid var(--border)', background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(12px)' }}>
        {/* <span style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span> */}
        <Logo size="sm" animated />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/login" style={{ ...mono, fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Sign in</Link>
          <Link href="/signup" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '8px 20px', display: 'inline-block' }}>Start free →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: '56px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 40px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '80px 80px', opacity: 0.3, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px' }}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '32px' }}>[AI - INTERVIEW COACH]</div>
          <h1 style={{ fontSize: 'clamp(64px, 11vw, 140px)', fontWeight: 700, lineHeight: 0.92, letterSpacing: '-.03em', textTransform: 'uppercase', marginBottom: '32px' }}>
            <span style={{ display: 'block', color: 'var(--text)' }}>PREP</span>
            <span style={{ display: 'block', color: 'var(--text)' }}>SMARTER.</span>
            <span style={{ display: 'block', color: 'var(--lime)' }}>NOT GENERIC.</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.7, letterSpacing: '.01em' }}>
              AI mock interviews calibrated to your university syllabus and target company. Built for Indian CS students.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Link href="/signup" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>START PREPARING →</Link>
              <Link href="#how" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'transparent', color: 'var(--text-2)', padding: '16px 32px', display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-2)' }}>SEE HOW IT WORKS</Link>
            </div>
          </div>
        </div>
        {/* ticker */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--border)', overflow: 'hidden', height: '40px', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center', animation: 'ticker 20s linear infinite', whiteSpace: 'nowrap', paddingLeft: '100%' }}>
            {[...universities, ...universities, ...universities].map((u, i) => (
              <span key={i} style={{ ...mono, fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                {u} <span style={{ color: 'var(--lime)', marginLeft: '24px' }}>·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 40px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px' }}>[02 - WHAT IT DOES]</div>
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', color: 'var(--text)', lineHeight: 1 }}>THE ARSENAL</h2>
            </div>
            <div style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right', lineHeight: 1.8 }}>
              PREPWISE.CORE_v1.0<br />FEATURE.SET // ACTIVE
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)' }}>
            {features.map((f) => (
              <div key={f.num} style={{ background: 'var(--bg)', padding: '28px 24px' }}>
                <div style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.1em', marginBottom: '16px' }}>{f.num}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text)', marginBottom: '10px' }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7, ...mono }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: '80px 40px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '48px' }}>[03 - THE PROTOCOL]</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            {steps.map((s) => (
              <div key={s.num}>
                <div style={{ fontSize: 'clamp(64px, 8vw, 96px)', fontWeight: 700, color: 'var(--lime)', lineHeight: 1, marginBottom: '16px', letterSpacing: '-.03em' }}>{s.num}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text)', marginBottom: '10px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.8, ...mono }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 40px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '24px' }}>[04 - INITIATE]</div>
          <h2 style={{ fontSize: 'clamp(48px, 8vw, 100px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.03em', color: 'var(--text)', lineHeight: 1, marginBottom: '48px' }}>READY TO<br />PREP?</h2>
          <Link href="/signup" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '18px 48px', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>START FOR FREE →</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '24px 40px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...mono, fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span>
        <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>© 2026 PREPWISE. TECHNICAL AUTOPSY SERIES.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Disabled links */}
          {['Privacy', 'Terms'].map(l => (
            <span
              key={l}
              style={{
                ...mono,
                fontSize: '10px',
                color: 'var(--text-3)',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              {l}
            </span>
          ))}

          {/* Real external link */}
          <a
            href="https://suyashvjain.web.app/" // <-- replace this
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...mono,
              fontSize: '10px',
              color: 'var(--text-3)',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Contact
          </a>
        </div>
      </footer>

      <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }`}</style>
    </div>
  )
}
