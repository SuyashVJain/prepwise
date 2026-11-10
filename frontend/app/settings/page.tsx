'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import { optionStyle, fieldStyle, cardBase } from '@/lib/ui'
import PageHeader from '@/components/PageHeader'
import { PageSkeleton } from '@/components/Skeleton'
import { DEFAULTS_KEY } from '@/lib/stats'
import { useToast } from '@/components/Toast'
import { cleanDisplayName } from '@/lib/displayName'
import { announceName } from '@/lib/profileEvents'

const TYPES: Record<string, string> = { technical: 'Technical', hr: 'HR / Behavioural', system_design: 'System Design', subject: 'Subject-Specific' }
const COUNTS = [5, 10, 15]

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const label: React.CSSProperties = { ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '8px', display: 'block' }

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <span style={label}>{k}</span>
      <div style={{ fontSize: '16px', color: 'var(--text)', overflowWrap: 'anywhere' }}>{v || '-'}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [savedName, setSavedName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')
  const [type, setType] = useState('technical')
  const [count, setCount] = useState(5)
  const [saved, setSaved] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setName(data?.full_name || '')
      setSavedName(data?.full_name || '')
      try {
        const d = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || '{}')
        if (d.type in TYPES) setType(d.type)
        if (COUNTS.includes(d.count)) setCount(d.count)
      } catch { /* no saved defaults, or storage is blocked */ }
      setLoading(false)
    }
    load()
    // Runs once on mount; router and supabase are stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function save() {
    try {
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ type, count }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast('Defaults saved.')
    } catch { toast('Could not save defaults in this browser.', 'error') }
  }

  // Removes this student's own rows. Row level security limits every delete to the signed-in user.
  async function deleteMyData() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: mine } = await supabase.from('sessions').select('id').eq('user_id', user.id)
    const ids = (mine || []).map(r => r.id)
    const steps = [
      ids.length ? supabase.from('questions').delete().in('session_id', ids) : Promise.resolve({ error: null }),
    ]
    const [q] = await Promise.all(steps)
    const s = await supabase.from('sessions').delete().eq('user_id', user.id)
    const n = await supabase.from('tutor_notes').delete().eq('user_id', user.id)
    setDeleting(false)
    if (q.error || s.error || n.error) {
      setDeleteMsg('Some data could not be deleted. Please try again.')
      toast('Some data could not be deleted.', 'error')
      return
    }
    setConfirmText('')
    setDeleteMsg('Your sessions, answers and tutor notes were deleted.')
    toast('Your data was deleted.')
  }


  const tile = optionStyle

  // Live check of what is typed; the cleaned value is what gets saved.
  const cleaned = cleanDisplayName(name)
  const canSaveName = !cleaned.error && cleaned.value !== savedName && !nameSaving
  const shownNameError = nameError || (name !== savedName ? cleaned.error : '')

  // Saves to the signed-in user's own profile row only (row level security allows nothing else).
  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!canSaveName || !userId) return
    setNameSaving(true)
    setNameSaved(false)
    setNameError('')
    const { error } = await supabase.from('profiles').update({ full_name: cleaned.value }).eq('id', userId).select('full_name').single()
    setNameSaving(false)
    if (error) { setNameError('We could not save your name. Check your connection and try again.'); return }
    setSavedName(cleaned.value)
    setName(cleaned.value)
    setNameSaved(true)
    announceName(cleaned.value)
  }

  return (
    <PageShell>
        {loading ? <PageSkeleton rows={2} /> : (
          <div>
            <PageHeader label="SETTINGS" title="Settings" />
            <div style={{ maxWidth: '760px' }}>

            <section aria-label="Account" style={{ ...cardBase, padding: '24px', marginBottom: '24px' }}>
              <h2 className="sec-title">Account</h2>
              <Row k="Email" v={email} />
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '-12px 0 20px' }}>Email can&apos;t be changed here.</p>
              <form onSubmit={saveName} noValidate>
                <label htmlFor="display-name" style={label}>Display name</label>
                <input id="display-name" value={name} autoComplete="name" maxLength={80} aria-invalid={shownNameError ? true : undefined} aria-describedby="display-name-msg"
                  onChange={e => { setName(e.target.value); setNameSaved(false); setNameError('') }}
                  style={{ ...fieldStyle, width: '100%', display: 'block' }} />
                <p id="display-name-msg" role="status" style={{ fontSize: '14px', minHeight: '22px', margin: '8px 0 12px', color: shownNameError ? '#ef4444' : 'var(--lime)' }}>
                  {shownNameError || (nameSaved ? 'Saved' : '')}
                </p>
                <button type="submit" disabled={!canSaveName} className="btn-primary"
                  style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', minHeight: '44px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', cursor: canSaveName ? 'pointer' : 'not-allowed', opacity: canSaveName ? 1 : 0.5 }}>
                  {nameSaving ? 'SAVING...' : 'SAVE NAME'}
                </button>
              </form>
            </section>

            <section aria-label="Session defaults" style={{ ...cardBase, padding: '24px', marginBottom: '24px' }}>
              <h2 className="sec-title" style={{ marginBottom: '4px' }}>Session defaults</h2>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-2)', marginBottom: '20px' }}>Used to pre-fill the new session screen. Saved in this browser only.</p>
              <span style={label}>Interview type</span>
              <div role="group" aria-label="Interview type" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {Object.entries(TYPES).map(([id, name]) => (
                  <button key={id} type="button" aria-pressed={type === id} onClick={() => setType(id)} style={tile(type === id)}>{name}</button>
                ))}
              </div>
              <span style={label}>Number of questions</span>
              <div role="group" aria-label="Number of questions" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {COUNTS.map(n => (
                  <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} style={tile(count === n)}>{n}</button>
                ))}
              </div>
              <button type="button" onClick={save} className="btn-primary"
                style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', cursor: 'pointer' }}>
                {saved ? 'SAVED ✓' : 'SAVE DEFAULTS'}
              </button>
            </section>

            <section aria-label="Delete my data" style={{ ...cardBase, border: '1px solid rgba(239,68,68,0.5)', padding: '24px', marginBottom: '24px' }}>
              <h2 className="sec-title" style={{ color: '#ef4444', marginBottom: '8px' }}>Delete my data</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '16px' }}>
                This permanently deletes all of your sessions, answers, scores and voice tutor notes. It cannot be undone. Your account stays; to remove it too, use the contact link on the home page.
              </p>
              <label htmlFor="confirm-delete" style={label}>TYPE DELETE TO CONFIRM</label>
              <input id="confirm-delete" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off"
                style={{ ...fieldStyle, width: '100%', maxWidth: '240px', marginBottom: '16px', display: 'block' }} />
              <button type="button" onClick={deleteMyData} disabled={confirmText !== 'DELETE' || deleting}
                style={{ background: '#ef4444', color: '#0e0e0e', border: 'none', padding: '12px 24px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', minHeight: '44px' }}>
                {deleting ? 'DELETING...' : 'DELETE MY DATA'}
              </button>
              {deleteMsg && <p role="status" style={{ fontSize: '14px', color: 'var(--text)', marginTop: '12px' }}>{deleteMsg}</p>}
            </section>
            </div>
          </div>
        )}
    </PageShell>
  )
}
