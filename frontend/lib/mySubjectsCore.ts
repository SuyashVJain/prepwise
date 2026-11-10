// The user's own subjects, as ids from the shared subject list (frontend/data/subjects.json). Pure functions, so they
// can be tested without a browser or a database; lib/mySubjects.ts does the reading.

export type SubjectInfo = { id: string; name: string }

// What a first-time user sees before the app knows anything about them.
export const FIRST_TIME_IDS = ['python', 'dsa', 'dbms', 'os', 'cn']

// Other names students and syllabi use for a shared subject. Keys are lower case.
const ALIASES: Record<string, string> = {
  'data structures and algorithms': 'dsa', 'data structures': 'dsa', 'algorithms': 'dsa',
  'database management systems': 'dbms', 'database management system': 'dbms', 'databases': 'dbms',
  'object oriented programming': 'oop', 'object-oriented programming': 'oop',
  'operating system': 'os',
  'computer network': 'cn', 'networks': 'cn',
  'compiler design': 'compilers',
  'computer organisation and architecture': 'coa', 'computer architecture': 'coa',
  'discrete maths': 'discrete', 'digital logic': 'digital',
}

// The shared subject a piece of text refers to (its id, name or a known alias), or null.
export function matchSubjectId(text: string, subjects: SubjectInfo[]): string | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const hit = subjects.find(s => s.id === t || s.name.toLowerCase() === t)
  if (hit) return hit.id
  const alias = ALIASES[t]
  return alias && subjects.some(s => s.id === alias) ? alias : null
}

type Sources = {
  subjects: SubjectInfo[]
  // Subjects picked at onboarding (the topics saved with the first syllabus).
  onboarding: string[]
  // Topics of the student's other syllabi, newest first.
  syllabus: string[]
  // Subjects used lately (picked from More, tutor visits), most recent first.
  recent: string[]
}

// Onboarding picks first, then syllabus subjects, then recent use; each id once, in that order. Text that is not a
// shared subject is ignored. With nothing to go on, the first-time list.
export function orderMySubjects({ subjects, onboarding, syllabus, recent }: Sources): string[] {
  const out: string[] = []
  for (const text of [...onboarding, ...syllabus, ...recent]) {
    const id = matchSubjectId(text, subjects)
    if (id && !out.includes(id)) out.push(id)
  }
  return out.length ? out : FIRST_TIME_IDS.filter(id => subjects.some(s => s.id === id))
}

// Subjects the user picked from the More panel, kept in this browser only (one key per user).
const KEY = 'pw_my_subjects:'
const CAP = 20

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function readPicked(store: Store | null, userId: string): string[] {
  try {
    const list = JSON.parse(store?.getItem(KEY + userId) || '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

// Puts `id` first (most recent) and returns the new list. Storage can be blocked, so failures are ignored.
export function rememberPicked(store: Store | null, userId: string, id: string): string[] {
  const next = [id, ...readPicked(store, userId).filter(x => x !== id)].slice(0, CAP)
  try { store?.setItem(KEY + userId, JSON.stringify(next)) } catch { /* blocked or full: the pick just is not remembered */ }
  return next
}
