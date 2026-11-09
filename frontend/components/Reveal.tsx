'use client'
import { useEffect } from 'react'

// Fades each .reveal element up once as it scrolls into view. Without motion
// preference or script support the content simply stays visible.
export default function Reveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const root = document.documentElement
    root.classList.add('js-reveal')
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      })
    }, { threshold: 0.12 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => { io.disconnect(); root.classList.remove('js-reveal') }
  }, [])
  return null
}
