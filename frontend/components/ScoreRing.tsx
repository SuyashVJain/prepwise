import { scoreColor } from '@/lib/stats'

// Plain SVG ring: the arc is the score out of 10. The label is for screen readers.
export default function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(10, score)) / 10
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Overall score ${score} out of 10`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg4)" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth="10" strokeLinecap="butt"
        strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y={size * 0.46} textAnchor="middle" dominantBaseline="central" fill={scoreColor(score)}
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size * 0.28, fontWeight: 700 }}>{score}</text>
      <text x="50%" y={size * 0.7} textAnchor="middle" fill="var(--text-2)" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>OUT OF 10</text>
    </svg>
  )
}
