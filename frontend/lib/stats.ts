// localStorage key for the session defaults saved on the settings page.
export const DEFAULTS_KEY = 'pw_defaults'

export type SessionRow = {
  id: string
  created_at: string
  interview_type?: string
  target_company?: string
  total_questions?: number
  score_avg?: number
  weak_topics?: string[]
}

export function scoreColor(s: number) {
  if (s >= 7) return '#d4fe42'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Display names for stored values. Known values map to their exact labels (acronyms stay in capitals);
// anything else is shown as stored.
const TYPE_LABELS: Record<string, string> = { technical: 'Technical', hr: 'HR / Behavioural', system_design: 'System Design', subject: 'Subject-Specific' }
const COMPANY_LABELS: Record<string, string> = { faang: 'FAANG / Big Tech', product: 'Product Startups', service: 'Service Companies', core: 'Core CS Campus' }

export function typeName(t?: string) {
  return t ? TYPE_LABELS[t] ?? t.replace(/_/g, ' ') : '-'
}

export function companyName(c?: string) {
  return c ? COMPANY_LABELS[c] ?? c : '-'
}

export function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

export type TopicStat = { topic: string; count: number; total: number; lastSeen: string }

// Most frequent first; ties go to the topic seen most recently.
export function weakTopicStats(sessions: SessionRow[]): TopicStat[] {
  const map = new Map<string, TopicStat>()
  for (const s of sessions) {
    for (const topic of s.weak_topics || []) {
      const cur = map.get(topic)
      if (!cur) map.set(topic, { topic, count: 1, total: sessions.length, lastSeen: s.created_at })
      else {
        cur.count++
        if (s.created_at > cur.lastSeen) cur.lastSeen = s.created_at
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1))
}

// Sessions per calendar week (Monday start) for the last `weeks` weeks, oldest first.
export function sessionsPerWeek(sessions: SessionRow[], weeks = 8, now = Date.now()) {
  const day = 86400000
  const d = new Date(now)
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime()
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: monday - (weeks - 1 - i) * 7 * day, count: 0 }))
  for (const s of sessions) {
    const t = new Date(s.created_at).getTime()
    const b = buckets.find(x => t >= x.start && t < x.start + 7 * day)
    if (b) b.count++
  }
  return buckets
}

// For each topic: appearances in the latest 5 sessions against the 5 before them.
export function topicTrends(sessionsNewestFirst: SessionRow[]) {
  const recent = sessionsNewestFirst.slice(0, 5)
  const earlier = sessionsNewestFirst.slice(5, 10)
  const count = (list: SessionRow[], t: string) => list.filter(s => (s.weak_topics || []).includes(t)).length
  return weakTopicStats(sessionsNewestFirst.slice(0, 10)).slice(0, 6).map(s => ({
    topic: s.topic, recent: count(recent, s.topic), earlier: count(earlier, s.topic),
  }))
}
