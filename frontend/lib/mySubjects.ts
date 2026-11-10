'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FIRST_TIME_IDS, orderMySubjects, readPicked, rememberPicked, type SubjectInfo } from '@/lib/mySubjectsCore'

type Raw = { onboarding: string[]; syllabus: string[]; tutor: string[] }

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

// What the app already stores: the topics saved with the first syllabus are the onboarding picks, later syllabi add
// theirs, and tutor notes record the subjects used in the voice tutor (newest first). Nothing new is stored on the
// server; subjects picked from the More panel are kept in this browser (see mySubjectsCore.ts).
async function loadRaw(userId: string): Promise<Raw> {
  const supabase = createClient()
  const [syl, notes] = await Promise.all([
    supabase.from('syllabi').select('topics, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('tutor_notes').select('subject, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
  ])
  const rows = (syl.data || []) as { topics: unknown }[]
  const topics = (r?: { topics: unknown }) => (Array.isArray(r?.topics) ? (r!.topics as unknown[]).filter((t): t is string => typeof t === 'string') : [])
  return {
    onboarding: topics(rows[0]),
    syllabus: rows.slice(1).reverse().flatMap(r => topics(r)),
    tutor: ((notes.data || []) as { subject: string | null }[]).map(n => n.subject || '').filter(Boolean),
  }
}

// The signed-in user's own subjects (ids, in order) and a way to remember a subject picked from More.
export function useMySubjects(subjects: SubjectInfo[]) {
  const [ids, setIds] = useState<string[]>(() => FIRST_TIME_IDS.filter(id => subjects.some(s => s.id === id)))
  const user = useRef<string | null>(null)
  const raw = useRef<Raw>({ onboarding: [], syllabus: [], tutor: [] })

  const compute = useCallback(() => {
    const picked = user.current ? readPicked(storage(), user.current) : []
    setIds(orderMySubjects({ subjects, onboarding: raw.current.onboarding, syllabus: raw.current.syllabus, recent: [...picked, ...raw.current.tutor] }))
  }, [subjects])

  useEffect(() => {
    let cancelled = false
    createClient().auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u || cancelled) return
      user.current = u.id
      try { raw.current = await loadRaw(u.id) } catch { /* offline or tables missing: use what the browser knows */ }
      if (!cancelled) compute()
    }).catch(() => {})
    return () => { cancelled = true }
  }, [compute])

  const remember = useCallback((id: string) => {
    if (!user.current) return
    rememberPicked(storage(), user.current, id)
    compute()
  }, [compute])

  return { ids, remember }
}
