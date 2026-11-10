// One score chart for the dashboard, progress and history: a 0 to 10 scale with light gridlines, the first and last
// dates, and a hover title on every point. Labels are HTML so they stay 12px at any width.
export type ChartPoint = { score: number; at: string }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const when = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

export default function ScoreChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const n = points.length
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50)
  const y = (v: number) => 100 - Math.max(0, Math.min(10, v)) * 10
  const first = day(points[0].at), last = day(points[n - 1].at)
  return (
    <div className="chart" role="img" aria-label={label}>
      <div className="chart-plot">
        {[10, 5, 0].map(v => (
          <div key={v} className="chart-grid" style={{ top: `${100 - v * 10}%` }}><span>{v}</span></div>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
            points={points.map((p, i) => `${x(i)},${y(p.score)}`).join(' ')} />
        </svg>
        {points.map((p, i) => (
          <span key={i} className="chart-dot" style={{ left: `${x(i)}%`, top: `${y(p.score)}%` }} title={`${p.score}/10 on ${when(p.at)}`} />
        ))}
      </div>
      <div className="chart-x">
        <span>{first}</span>
        {last !== first && <span>{last}</span>}
      </div>
    </div>
  )
}
