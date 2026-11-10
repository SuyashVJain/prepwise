// Hand-picked and searched video suggestions for the current topic.
'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { label, mono, panel } from './ui'
import curated from '@/data/curated-videos.json'

type Video = { id: string; title: string; channel: string }
type SubjectVideos = { default: Video[]; topics: Record<string, Video[]> }

const curatedBySubject = curated as unknown as Record<string, SubjectVideos | string>

// Hand-picked videos for a subject and topic. Placeholder entries (id starting with TODO) are left out.
export function curatedFor(subjectId: string, topic: string): Video[] {
  const subject = curatedBySubject[subjectId]
  if (!subject || typeof subject === 'string') return []
  const wanted = topic.trim().toLowerCase()
  const topicKey = Object.keys(subject.topics).find(key => key.toLowerCase() === wanted)
  const picks = topicKey ? subject.topics[topicKey] : subject.default
  return picks.filter(video => !video.id.startsWith('TODO')).slice(0, 3)
}

function VideoCard({ video }: { video: Video }) {
  const id = encodeURIComponent(video.id)
  return (
    <div style={{ ...panel, display: 'flex', gap: '10px', padding: 'var(--space-2)' }}>
      <div aria-hidden="true" style={{
        width: '96px', height: '54px', flexShrink: 0, backgroundColor: 'var(--bg4)',
        backgroundImage: `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.3, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</div>
        <div style={{ ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.06em', textTransform: 'uppercase', margin: 'var(--space-1) 0' }}>{video.channel}</div>
        <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"
          style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', color: 'var(--lime)', textDecoration: 'none' }}>
          WATCH ON YOUTUBE ↗
        </a>
      </div>
    </div>
  )
}

export default function VideoPanel({ subjectId, subjectName, topic }: { subjectId: string; subjectName: string; topic: string }) {
  const picks = curatedFor(subjectId, topic)
  const pickIds = picks.map(video => video.id).join(',')
  const [more, setMore] = useState<Video[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'curated_only'>('loading')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const query = new URLSearchParams({ subject: subjectName, topic, exclude: pickIds })
        const res = await apiFetch(`/tutor/videos?${query.toString()}`)
        const data = await res.json()
        if (cancelled) return
        setMore(Array.isArray(data.videos) ? data.videos : [])
        setStatus(data.source === 'curated_only' ? 'curated_only' : 'done')
      } catch {
        if (!cancelled) { setMore([]); setStatus('curated_only') }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [subjectName, topic, pickIds])

  const note = { ...mono, fontSize: '12px', color: 'var(--text-2)', letterSpacing: '.04em' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={label}>START HERE</div>
      {picks.length === 0
        ? <p style={note}>No hand-picked videos for this topic yet.</p>
        : picks.map(video => <VideoCard key={video.id} video={video} />)}

      <div style={{ ...label, marginTop: '12px' }}>MORE VIDEOS</div>
      <div style={{ maxHeight: '52vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {status === 'loading' && <p style={note}>SEARCHING...</p>}
        {status === 'curated_only' && <p style={note}>More videos are not available right now.</p>}
        {status === 'done' && more.length === 0 && <p style={note}>No more videos found.</p>}
        {more.map(video => <VideoCard key={video.id} video={video} />)}
      </div>
    </div>
  )
}
