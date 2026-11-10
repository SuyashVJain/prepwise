'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { NAME_EVENT } from '@/lib/profileEvents'
import { DashboardIcon, NewSessionIcon, StudyIcon, TutorIcon, HistoryIcon, ProgressIcon, SettingsIcon, LogoutIcon } from '@/components/icons'

type NavItem = { label: string; href: string; icon: () => React.JSX.Element }

const DASHBOARD: NavItem = { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon }
const SETTINGS: NavItem = { label: 'Settings', href: '/settings', icon: SettingsIcon }

// The main navigation: Dashboard on its own, then two labelled groups. Settings sits in the bottom area.
export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [DASHBOARD] },
  {
    label: 'PRACTISE',
    items: [
      { label: 'New session', href: '/interview', icon: NewSessionIcon },
      { label: 'Study mode', href: '/study', icon: StudyIcon },
      { label: 'Voice tutor', href: '/tutor', icon: TutorIcon },
    ],
  },
  { label: 'TRACK', items: [{ label: 'History', href: '/history', icon: HistoryIcon }, { label: 'Progress', href: '/progress', icon: ProgressIcon }] },
]

export const NAV_ITEMS = [...NAV_GROUPS.flatMap(g => g.items), SETTINGS]

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

  // Settings announces a new display name, so the block updates at once.
  useEffect(() => {
    const onName = (e: Event) => setName(String((e as CustomEvent<string>).detail || ''))
    window.addEventListener(NAME_EVENT, onName)
    return () => window.removeEventListener(NAME_EVENT, onName)
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  function navLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    return (
      <Link key={item.href} href={item.href} className="nav-link" aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
        <Icon />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      <div className="app-topbar">
        <Link href="/dashboard" aria-label="Prepwise dashboard"><Logo size="sm" /></Link>
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="app-sidebar"
          style={{ ...mono, fontSize: '12px', letterSpacing: '.1em', color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-2)', padding: '8px 14px', cursor: 'pointer' }}>
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </div>
      <aside id="app-sidebar" className={`app-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" aria-label="Prepwise dashboard" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}><Logo size="sm" /></Link>
        </div>
        <nav aria-label="Main" className="nav-main">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? gi} className="nav-group">
              {group.label && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(item => navLink(item))}
            </div>
          ))}
        </nav>
        <div className="nav-bottom">
          <nav aria-label="Account" className="nav-account">
            {navLink(SETTINGS)}
          </nav>
          {/* The user block is one link to Settings, where the name can be changed. */}
          <Link href="/settings" className="nav-user" onClick={() => setOpen(false)} aria-label={loaded ? `${name || 'Student'}, account settings` : 'Account settings'}>
            <span aria-hidden="true" className="nav-avatar">{loaded ? (name?.[0]?.toUpperCase() || 'U') : ''}</span>
            <span className="nav-user-text">
              {loaded ? (
                <>
                  <span className="nav-user-name">{name || 'Student'}</span>
                  <span className="nav-user-sub">{university || '-'}</span>
                </>
              ) : (
                <span aria-hidden="true" className="nav-user-skeleton">
                  <span className="skeleton" style={{ display: 'block', width: '96px', height: '14px', marginBottom: '6px' }} />
                  <span className="skeleton" style={{ display: 'block', width: '56px', height: '11px' }} />
                </span>
              )}
            </span>
          </Link>
          <button type="button" onClick={signOut} className="nav-link nav-signout">
            <LogoutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
