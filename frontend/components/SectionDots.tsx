'use client'
import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'hero', label: 'Start' },
  { id: 'try', label: 'Try one question' },
  { id: 'how', label: 'How it works' },
  { id: 'product', label: 'The product' },
  { id: 'start', label: 'Get started' },
]

// Five dots on the right edge, one per section; the current one is lime. Hidden below 1024px by the stylesheet.
export default function SectionDots() {
  const [current, setCurrent] = useState('hero')

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setCurrent(e.target.id) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])

  return (
    <nav className="dots" aria-label="Sections">
      {SECTIONS.map(s => (
        <a key={s.id} href={`#${s.id}`} aria-label={s.label} aria-current={current === s.id ? 'true' : undefined} data-on={current === s.id} />
      ))}
    </nav>
  )
}
