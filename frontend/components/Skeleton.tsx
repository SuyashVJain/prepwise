// Placeholder block shown while data loads. The pulse is defined in globals.css and stops for reduced motion.
export default function Skeleton({ height = 16, width = '100%', style }: { height?: number | string; width?: number | string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className="skeleton" style={{ height, width, ...style }} />
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton height={12} width={120} />
      <Skeleton height={36} width="40%" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={96} />)}
    </div>
  )
}
