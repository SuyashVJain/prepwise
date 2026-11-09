'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// Compact sign-up button in the top bar. It appears once the hero has scrolled out of view,
// because the hero carries its own buttons. Without script it stays visible.
export default function StickySignup() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0 })
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  return (
    <Link
      href="/signup"
      className="btn-primary"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', minHeight: '40px', opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity .2s' }}
    >
      Sign up
    </Link>
  )
}
