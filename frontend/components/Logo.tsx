// prepwise-logo-loading/Logo.tsx
import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizes = {
  sm: { width: 120, height: 28, barW: 3, barGap: 3, bars: 5, textSize: 13 },
  md: { width: 160, height: 36, barW: 4, barGap: 3, bars: 5, textSize: 16 },
  lg: { width: 260, height: 56, barW: 6, barGap: 4, bars: 5, textSize: 26 },
}

const BAR_HEIGHTS = [0.45, 0.75, 1, 0.65, 0.85]

export default function Logo({ size = 'md', animated = false }: LogoProps) {
  const s = sizes[size]
  const waveW = (s.barW + s.barGap) * s.bars - s.barGap
  const totalW = waveW + 10 + (s.textSize * 5.2)

  return (
    <svg
      width={totalW}
      height={s.height}
      viewBox={`0 0 ${totalW} ${s.height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {animated && (
        <style>{`
          @keyframes pw-bar-1 { 0%,100%{transform:scaleY(0.45)} 50%{transform:scaleY(0.9)} }
          @keyframes pw-bar-2 { 0%,100%{transform:scaleY(0.75)} 50%{transform:scaleY(0.4)} }
          @keyframes pw-bar-3 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.55)} }
          @keyframes pw-bar-4 { 0%,100%{transform:scaleY(0.65)} 50%{transform:scaleY(1)} }
          @keyframes pw-bar-5 { 0%,100%{transform:scaleY(0.85)} 50%{transform:scaleY(0.45)} }
          .pw-bar { transform-box: fill-box; transform-origin: center bottom; }
          .pw-bar-1 { animation: pw-bar-1 1.2s ease-in-out infinite; }
          .pw-bar-2 { animation: pw-bar-2 1.4s ease-in-out infinite 0.1s; }
          .pw-bar-3 { animation: pw-bar-3 1.1s ease-in-out infinite 0.2s; }
          .pw-bar-4 { animation: pw-bar-4 1.3s ease-in-out infinite 0.05s; }
          .pw-bar-5 { animation: pw-bar-5 1.5s ease-in-out infinite 0.15s; }
        `}</style>
      )}

      {/* Waveform bars */}
      {BAR_HEIGHTS.map((h, i) => {
        const barH = s.height * h
        const x = i * (s.barW + s.barGap)
        const y = s.height - barH
        return (
          <rect
            key={i}
            className={animated ? `pw-bar pw-bar-${i + 1}` : ''}
            x={x}
            y={y}
            width={s.barW}
            height={barH}
            rx={s.barW / 2}
            fill="#d4fe42"
          />
        )
      })}

      {/* PREPWISE text */}
      <text
        x={waveW + 10}
        y={s.height * 0.72}
        fill="#d4fe42"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize={s.textSize}
        fontWeight={700}
        letterSpacing="0.06em"
      >
        PREPWISE
      </text>
    </svg>
  )
}
