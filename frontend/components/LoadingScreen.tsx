// prepwise-logo-loading/LoadingScreen.tsx
'use client'
import { useEffect, useState } from 'react'

const BOOT_LINES = [
  'INITIALIZING ARIA ENGINE...',
  'LOADING VECTOR INDEX...',
  'CALIBRATING INTERVIEW MATRIX...',
  'CONNECTING TO KNOWLEDGE BASE...',
  'SYSTEM READY.',
]

const BAR_HEIGHTS = [0.45, 0.75, 1, 0.65, 0.85, 0.55, 0.9, 0.4, 0.7, 0.95, 0.6, 0.8]

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // boot lines
    const lineTimer = setInterval(() => {
      setLineIndex(prev => {
        if (prev >= BOOT_LINES.length - 1) { clearInterval(lineTimer); return prev }
        return prev + 1
      })
    }, 320)

    // progress bar
    const progTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(progTimer); return 100 }
        return prev + 2
      })
    }, 28)

    // finish
    const doneTimer = setTimeout(() => {
      setFading(true)
      setTimeout(onDone, 500)
    }, 1800)

    return () => {
      clearInterval(lineTimer)
      clearInterval(progTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0e0e0e',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.5s ease',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>

      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(212,254,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,254,66,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Center content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>

        {/* Logo with large animated waveform */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Waveform */}
          <svg width="160" height="80" viewBox="0 0 160 80">
            <style>{`
              @keyframes pw-pulse-1 { 0%,100%{transform:scaleY(0.45)} 50%{transform:scaleY(0.95)} }
              @keyframes pw-pulse-2 { 0%,100%{transform:scaleY(0.75)} 50%{transform:scaleY(0.35)} }
              @keyframes pw-pulse-3 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.5)} }
              @keyframes pw-pulse-4 { 0%,100%{transform:scaleY(0.65)} 50%{transform:scaleY(1)} }
              @keyframes pw-pulse-5 { 0%,100%{transform:scaleY(0.85)} 50%{transform:scaleY(0.4)} }
              @keyframes pw-pulse-6 { 0%,100%{transform:scaleY(0.55)} 50%{transform:scaleY(0.9)} }
              @keyframes pw-pulse-7 { 0%,100%{transform:scaleY(0.9)} 50%{transform:scaleY(0.5)} }
              @keyframes pw-pulse-8 { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(0.85)} }
              @keyframes pw-pulse-9 { 0%,100%{transform:scaleY(0.7)} 50%{transform:scaleY(0.3)} }
              @keyframes pw-pulse-10 { 0%,100%{transform:scaleY(0.95)} 50%{transform:scaleY(0.6)} }
              @keyframes pw-pulse-11 { 0%,100%{transform:scaleY(0.6)} 50%{transform:scaleY(1)} }
              @keyframes pw-pulse-12 { 0%,100%{transform:scaleY(0.8)} 50%{transform:scaleY(0.45)} }
              .pw-loading-bar { transform-box: fill-box; transform-origin: center bottom; }
            `}</style>
            {BAR_HEIGHTS.map((h, i) => {
              const barW = 8
              const gap = 5
              const totalW = BAR_HEIGHTS.length * (barW + gap) - gap
              const startX = (160 - totalW) / 2
              const barH = 80 * h
              const x = startX + i * (barW + gap)
              const y = 80 - barH
              const dur = [1.2, 1.4, 1.1, 1.3, 1.5, 1.0, 1.35, 1.25, 1.45, 1.15, 1.4, 1.2][i]
              const delay = i * 0.07
              return (
                <rect
                  key={i}
                  className="pw-loading-bar"
                  x={x} y={y}
                  width={barW} height={barH}
                  rx={4}
                  fill="#d4fe42"
                  style={{
                    animation: `pw-pulse-${i + 1} ${dur}s ease-in-out ${delay}s infinite`,
                    opacity: 0.7 + (i % 3) * 0.1,
                  }}
                />
              )
            })}
          </svg>

          {/* PREPWISE wordmark */}
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#d4fe42',
          }}>
            PREPWISE
          </div>

          {/* Tagline */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(212,254,66,0.4)',
          }}>
            PREP SMARTER. NOT GENERIC.
          </div>
        </div>

        {/* Boot lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '320px' }}>
          {BOOT_LINES.slice(0, lineIndex + 1).map((line, i) => (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              letterSpacing: '0.08em',
              color: i === lineIndex ? '#d4fe42' : 'rgba(212,254,66,0.25)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: i === lineIndex ? '#d4fe42' : 'rgba(212,254,66,0.25)' }}>
                {i < lineIndex ? '✓' : '›'}
              </span>
              {line}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: '2px', background: 'rgba(212,254,66,0.12)', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${progress}%`,
              background: '#d4fe42',
              transition: 'width 0.03s linear',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px', letterSpacing: '0.1em',
            color: 'rgba(212,254,66,0.3)',
            textTransform: 'uppercase',
          }}>
            <span>LOADING SYSTEM</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Corner markers */}
      {[
        { top: '24px', left: '24px', borderTop: '1px solid rgba(212,254,66,0.2)', borderLeft: '1px solid rgba(212,254,66,0.2)' },
        { top: '24px', right: '24px', borderTop: '1px solid rgba(212,254,66,0.2)', borderRight: '1px solid rgba(212,254,66,0.2)' },
        { bottom: '24px', left: '24px', borderBottom: '1px solid rgba(212,254,66,0.2)', borderLeft: '1px solid rgba(212,254,66,0.2)' },
        { bottom: '24px', right: '24px', borderBottom: '1px solid rgba(212,254,66,0.2)', borderRight: '1px solid rgba(212,254,66,0.2)' },
      ].map((style, i) => (
        <div key={i} style={{ position: 'absolute', width: '20px', height: '20px', ...style }} />
      ))}
    </div>
  )
}
