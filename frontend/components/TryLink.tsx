'use client'

// Link to the "Try one question" box: scrolls there (a jump for reduced motion) and focuses the answer field.
export default function TryLink({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    const section = document.getElementById('try')
    if (!section) return
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    const box = document.getElementById('demo-answer')
    // preventScroll: the smooth scroll above is already under way.
    window.setTimeout(() => box?.focus({ preventScroll: true }), reduce ? 0 : 500)
    history.replaceState(null, '', '#try')
  }
  return <a href="#try" onClick={go} className={className} style={style}>{children}</a>
}
