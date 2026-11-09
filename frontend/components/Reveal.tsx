'use client'
import { useEffect } from 'react'

// Fades each .reveal element in (opacity only, from 0.85) once as it scrolls into view. Without motion
// preference or script support the content simply stays visible.
export default function Reveal() {
  // Soft section snapping for this page only; the stylesheet switches it off for reduced motion and short screens.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('snap')
    const frames = Array.from(document.querySelectorAll<HTMLElement>('.frame'))
    // A frame taller than the screen scrolls freely instead of snapping.
    const mark = () => frames.forEach(f => f.setAttribute('data-tall', String(f.offsetHeight > window.innerHeight - 60 + 2)))
    mark()
    const ro = 'ResizeObserver' in window ? new ResizeObserver(mark) : null
    frames.forEach(f => ro?.observe(f))
    window.addEventListener('resize', mark)
    return () => { root.classList.remove('snap'); ro?.disconnect(); window.removeEventListener('resize', mark) }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const root = document.documentElement
    root.classList.add('js-reveal')
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      })
    }, { threshold: 0.05 })
    const all = document.querySelectorAll('.reveal')
    all.forEach(el => io.observe(el))
    // Anything the observer has not reached after a second becomes fully visible anyway.
    const fallback = window.setTimeout(() => all.forEach(el => el.classList.add('in')), 1000)
    return () => { window.clearTimeout(fallback); io.disconnect(); root.classList.remove('js-reveal') }
  }, [])
  return null
}
