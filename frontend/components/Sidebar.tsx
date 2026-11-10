'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const NAV_ITEMS = [
  { label: 'DASHBOARD', href: '/dashboard' },
  { label: 'NEW SESSION', href: '/interview' },
  { label: 'STUDY MODE', href: '/study' },
  { label: 'VOICE TUTOR', href: '/tutor' },
  { label: 'HISTORY', href: '/history' },
  { label: 'PROGRESS', href: '/progress' },
  { label: 'SETTINGS', href: '/settings' },
]

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// One sidebar for every signed-in page. Under 900px it becomes a top bar with a drawer (see globals.css).
export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  // Until the profile answers, a neutral placeholder is shown so the name never changes text.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoaded(true); return }
      const { data } = await supabase.from('profiles').select('full_name, university').eq('id', user.id).single()
      setName(data?.full_name || '')
      setUniversity(data?.university || '')
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  return (
    <>
      <div className="app-topbar">
        <Link href="/dashboard" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</Link>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="app-sidebar"
          style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 14px', cursor: 'pointer' }}>
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </div>
      <aside id="app-sidebar" className={`app-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', display: 'block' }}>Prepwise</Link>
          <div style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginTop: '3px' }}>INTERVIEW PREP</div>
        </div>
        <nav aria-label="Main" style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} className="nav-link" aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderLeft: `2px solid ${active ? 'var(--lime)' : 'transparent'}`, background: active ? 'var(--bg2)' : 'transparent' }}>
                <span style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: active ? 'var(--lime)' : 'var(--text-2)', fontWeight: active ? 700 : 400 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div aria-hidden="true" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '12px', color: 'var(--lime)', fontWeight: 700, flexShrink: 0 }}>
              {loaded ? (name?.[0]?.toUpperCase() || 'U') : ''}
            </div>
            <div style={{ minWidth: 0 }}>
              {loaded ? (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Student'}</div>
                  <div style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', color: 'var(--text-2)', marginTop: '2px' }}>{university || '-'}</div>
                </>
              ) : (
                <div aria-hidden="true">
                  <div className="skeleton" style={{ width: '96px', height: '14px', marginBottom: '6px' }} />
                  <div className="skeleton" style={{ width: '56px', height: '11px' }} />
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={signOut}
            style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            SIGN OUT →
          </button>
        </div>
      </aside>
    </>
  )
}
