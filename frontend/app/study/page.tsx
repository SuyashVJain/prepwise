// prepwise/app/study/page.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Message = { role: 'user' | 'assistant'; content: string }
type QuizQuestion = {
    question: string
    options: Record<string, string>
    correct: string
    explanation: string
}
type Chunk = { text: string; source: string }
type Doc = { name: string; text: string; wordCount: number; chunks: Chunk[] }

export default function StudyPage() {
    const [tab, setTab] = useState<'chat' | 'quiz'>('chat')
    const [docs, setDocs] = useState<Doc[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string[]>([])
    const [uploadError, setUploadError] = useState('')

    const allChunks = docs.flatMap(d => d.chunks)
    const docText = docs.map(d => `=== ${d.name} ===\n${d.text}`).join('\n\n')
    const wordCount = docs.reduce((sum, d) => sum + d.wordCount, 0)
    const docName = docs.length === 1 ? docs[0].name : docs.length > 1 ? `${docs.length} documents` : ''

    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
    const [quizLoading, setQuizLoading] = useState(false)
    const [numQuestions, setNumQuestions] = useState(5)
    const [difficulty, setDifficulty] = useState('medium')
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [submitted, setSubmitted] = useState(false)
    const [score, setScore] = useState(0)

    const mono = { fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function uploadSingleFile(file: File): Promise<Doc | null> {
        const formData = new FormData()
        formData.append('file', file)
        try {
            const res = await fetch(`${API}/study/upload`, { method: 'POST', body: formData })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Upload failed')
            }
            const data = await res.json()
            return {
                name: data.filename,
                text: data.text,
                wordCount: data.word_count,
                chunks: (data.chunks || []) as Chunk[],
            }
        } catch {
            return null
        }
    }

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return
        setUploading(true)
        setUploadError('')
        setUploadProgress([])

        const fileArray = Array.from(files)
        const newDocs: Doc[] = []
        const progress: string[] = []

        for (const file of fileArray) {
            setUploadProgress(prev => [...prev, `Processing ${file.name}...`])
            const doc = await uploadSingleFile(file)
            if (doc) {
                newDocs.push(doc)
                progress.push(`✓ ${file.name} (${doc.wordCount.toLocaleString()} words)`)
            } else {
                progress.push(`✗ ${file.name} - failed`)
            }
            setUploadProgress([...progress])
        }

        if (newDocs.length > 0) {
            setDocs(prev => {
                const merged = [...prev]
                for (const doc of newDocs) {
                    const idx = merged.findIndex(d => d.name === doc.name)
                    if (idx >= 0) merged[idx] = doc
                    else merged.push(doc)
                }
                return merged
            })

            const isFirst = docs.length === 0
            const summary = newDocs.map(d => `${d.name} (${d.wordCount.toLocaleString()} words)`).join(', ')
            const msg: Message = {
                role: 'assistant',
                content: isFirst
                    ? `Ready. Loaded ${newDocs.length === 1 ? summary : `${newDocs.length} documents: ${summary}`}. Ask me anything.`
                    : `Added ${newDocs.length} document${newDocs.length > 1 ? 's' : ''}: ${summary}. I can now answer across all ${docs.length + newDocs.length} documents.`,
            }
            setMessages(prev => [...prev, msg])
        }

        if (newDocs.length < fileArray.length) {
            setUploadError(`${fileArray.length - newDocs.length} file(s) failed. Check format or size (max 15MB).`)
        }

        setUploading(false)
        setTimeout(() => setUploadProgress([]), 4000)
    }

    async function sendMessage() {
        if (!input.trim() || !docText || chatLoading) return
        const userMsg: Message = { role: 'user', content: input.trim() }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setChatLoading(true)
        try {
            const res = await fetch(`${API}/study/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chunks: allChunks,
                    history: messages.slice(-6),
                    message: userMsg.content,
                }),
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
        }
        setChatLoading(false)
    }

    async function generateQuiz() {
        if (!docText) return
        setQuizLoading(true)
        setQuizQuestions([])
        setAnswers({})
        setSubmitted(false)
        try {
            const res = await fetch(`${API}/study/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chunks: allChunks, num_questions: numQuestions, difficulty }),
            })
            const data = await res.json()
            setQuizQuestions(data.questions || [])
        } catch { console.error('Quiz failed') }
        setQuizLoading(false)
    }

    function submitQuiz() {
        let correct = 0
        quizQuestions.forEach((q, i) => { if (answers[i] === q.correct) correct++ })
        setScore(correct)
        setSubmitted(true)
    }

    function scoreColor(s: number, total: number) {
        const pct = s / total
        if (pct >= 0.7) return '#d4fe42'
        if (pct >= 0.5) return '#f59e0b'
        return '#ef4444'
    }

    function clearAll() {
        setDocs([])
        setMessages([])
        setQuizQuestions([])
        setAnswers({})
        setSubmitted(false)
        setUploadProgress([])
        setUploadError('')
    }
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // source tags - render as lime pills
    .replace(/\[Source: ([^\]]+)\]/g, '<span style="display:inline-flex;align-items:center;gap:4px;margin:0 2px;padding:1px 8px;background:rgba(212,254,66,0.08);border:1px solid rgba(212,254,66,0.25);font-family:JetBrains Mono,monospace;font-size:10px;color:#d4fe42;letter-spacing:.06em;vertical-align:middle;border-radius:0">↗ $1</span>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--lime);font-weight:700">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em style="color:var(--text-2)">$1</em>')
    // inline code
    .replace(/`(.+?)`/g, '<code style="background:var(--bg4);padding:2px 6px;font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text-2)">$1</code>')
    // headings
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--lime);margin:14px 0 4px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--lime);margin:16px 0 6px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--lime);margin:16px 0 6px">$1</div>')
    // bullets
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0 2px 4px"><span style="color:var(--lime);font-family:JetBrains Mono,monospace;font-size:10px;margin-top:4px;flex-shrink:0">·</span><span>$1</span></div>')
    // numbered lists
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:12px;margin:2px 0;color:var(--text)">$1</div>')
    // line breaks
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>')
}

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', fontFamily: "'Space Grotesk', sans-serif" }}>

            {/* SIDEBAR */}
            <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
                <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)' }}>
                    <Link href="/dashboard" style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)', textDecoration: 'none', display: 'block' }}>Prepwise</Link>
                    <div style={{ ...mono, fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '3px' }}>AI INTERVIEW PREP</div>
                </div>
                <nav style={{ flex: 1, padding: '16px 0' }}>
                    {[
                        { label: 'DASHBOARD', href: '/dashboard', active: false },
                        { label: 'NEW SESSION', href: '/interview', active: false },
                        { label: 'STUDY MODE', href: '/study', active: true },
                    ].map(item => (
                        <Link key={item.label} href={item.href} style={{
                            display: 'flex', alignItems: 'center', padding: '11px 24px',
                            borderLeft: `2px solid ${item.active ? 'var(--lime)' : 'transparent'}`,
                            background: item.active ? 'var(--bg2)' : 'transparent', textDecoration: 'none',
                        }}>
                            <span style={{ ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: item.active ? 'var(--lime)' : 'var(--text-3)', fontWeight: item.active ? 700 : 400 }}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* MAIN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* TOP BAR */}
                <div style={{ padding: '28px 40px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '6px' }}>[STUDY MODE]</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1 }}>
                            {docName ? `STUDYING: ${docName.toUpperCase().slice(0, 40)}` : 'UPLOAD DOCUMENTS'}
                        </h1>
                        {wordCount > 0 && (
                            <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.06em' }}>
                                {wordCount.toLocaleString()} TOTAL WORDS · {allChunks.length} CHUNKS
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex' }}>
                        {(['chat', 'quiz'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                ...mono, fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase',
                                padding: '10px 24px', background: 'transparent', border: 'none',
                                borderBottom: `2px solid ${tab === t ? 'var(--lime)' : 'transparent'}`,
                                color: tab === t ? 'var(--lime)' : 'var(--text-3)', cursor: 'pointer',
                            }}>
                                {t === 'chat' ? 'CHAT WITH ARIA' : 'QUIZ MODE'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DOC LIST BAR */}
                {docs.length > 0 && (
                    <div style={{ padding: '10px 40px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg2)' }}>
                        <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginRight: '4px' }}>LOADED:</span>
                        {docs.map((doc, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--lime-dim)', border: '1px solid var(--lime-border)' }}>
                                <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                <span style={{ ...mono, fontSize: '9px', color: 'var(--text-3)' }}>{doc.wordCount.toLocaleString()}w</span>
                                <button onClick={() => setDocs(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', ...mono, fontSize: '13px', lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                            </div>
                        ))}
                        <input type="file" id="doc-add" multiple style={{ display: 'none' }}
                            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                            onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
                        <label htmlFor="doc-add" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
                            border: '1px dashed var(--border-2)', cursor: uploading ? 'not-allowed' : 'pointer',
                            ...mono, fontSize: '10px', color: uploading ? 'var(--lime)' : 'var(--text-3)',
                            letterSpacing: '.06em', textTransform: 'uppercase',
                        }}>
                            {uploading ? 'PROCESSING...' : '+ ADD MORE'}
                        </label>
                        <button onClick={clearAll} style={{
                            ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase',
                            color: '#ef4444', background: 'none', border: '1px solid rgba(239,68,68,0.2)',
                            padding: '4px 10px', cursor: 'pointer', marginLeft: 'auto',
                        }}>CLEAR ALL</button>
                    </div>
                )}

                {/* UPLOAD PROGRESS */}
                {uploadProgress.length > 0 && (
                    <div style={{ padding: '8px 40px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
                        {uploadProgress.map((p, i) => (
                            <span key={i} style={{ ...mono, fontSize: '10px', color: p.startsWith('✓') ? 'var(--lime)' : p.startsWith('✗') ? '#ef4444' : 'var(--text-3)', letterSpacing: '.06em' }}>{p}</span>
                        ))}
                    </div>
                )}

                {/* UPLOAD ERROR */}
                {uploadError && (
                    <div style={{ padding: '8px 40px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}>
                        <span style={{ ...mono, fontSize: '10px', color: '#ef4444', letterSpacing: '.06em' }}>{uploadError}</span>
                    </div>
                )}

                {/* UPLOAD ZONE - no docs yet */}
                {docs.length === 0 && !uploading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}>
                            <div style={{ ...mono, fontSize: '32px', color: 'var(--lime)', marginBottom: '16px' }}>[DOC]</div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.01em', marginBottom: '8px' }}>Upload your study material</h2>
                            <p style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '6px' }}>Select one or multiple files at once</p>
                            <p style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '32px' }}>PDF · DOCX · TXT · PNG · JPG</p>
                            <input type="file" id="doc-upload" multiple style={{ display: 'none' }}
                                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={e => handleFiles(e.target.files)} />
                            <label htmlFor="doc-upload" style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '8px', padding: '40px', border: '1px dashed var(--border-2)', cursor: 'pointer',
                                ...mono, fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-2)',
                            }}>
                                <span style={{ fontSize: '24px' }}>↑</span>
                                CHOOSE FILES
                                <span style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>Hold Ctrl / Cmd to select multiple</span>
                            </label>
                            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                {['Lecture notes', 'Textbook chapter', 'Research paper', 'Study guide', 'Past paper'].map(ex => (
                                    <span key={ex} style={{ ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '4px 10px', border: '1px solid var(--border)', color: 'var(--text-3)' }}>{ex}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* UPLOADING SPINNER */}
                {docs.length === 0 && uploading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--lime)', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                        </div>
                        <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>PROCESSING FILES...</span>
                    </div>
                )}

                {/* CHAT TAB */}
                {docs.length > 0 && tab === 'chat' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                        background: msg.role === 'user' ? 'var(--bg3)' : 'var(--lime-dim)',
                                        border: `1px solid ${msg.role === 'user' ? 'var(--border)' : 'var(--lime-border)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        ...mono, fontSize: '9px', fontWeight: 700, color: msg.role === 'user' ? 'var(--text-2)' : 'var(--lime)',
                                    }}>
                                        {msg.role === 'user' ? 'U' : 'Ar'}
                                    </div>
                                    <div
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                        style={{
                                            maxWidth: '70%', padding: '12px 16px',
                                            background: msg.role === 'user' ? 'var(--bg3)' : 'var(--bg2)',
                                            border: `1px solid ${msg.role === 'user' ? 'var(--border)' : 'var(--lime-border)'}`,
                                            fontSize: '14px', lineHeight: 1.7, color: 'var(--text)',
                                        }}
                                    />
                                </div>
                            ))}

                            {chatLoading && (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--lime-dim)', border: '1px solid var(--lime-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...mono, fontSize: '9px', fontWeight: 700, color: 'var(--lime)' }}>Ar</div>
                                    <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--lime-border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lime)', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {messages.length <= 1 && (
                            <div style={{ padding: '0 40px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['Summarize the key points', 'Explain the main concepts', 'What are the most important topics?', 'Compare topics across documents'].map(q => (
                                    <button key={q} onClick={() => setInput(q)} style={{
                                        ...mono, fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase',
                                        padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--bg2)',
                                        color: 'var(--text-3)', cursor: 'pointer',
                                    }}>{q}</button>
                                ))}
                            </div>
                        )}

                        <div style={{ padding: '16px 40px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-end', flexShrink: 0 }}>
                            <textarea value={input} onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                                placeholder={`Ask anything across ${docs.length} document${docs.length > 1 ? 's' : ''}... (Enter to send)`}
                                rows={2}
                                style={{
                                    flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', padding: '12px 16px',
                                    fontSize: '14px', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.5,
                                    caretColor: 'var(--lime)', fontFamily: "'Space Grotesk', sans-serif",
                                }}
                                onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--lime)'}
                                onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => e.currentTarget.style.borderColor = 'var(--border)'} />
                            <button onClick={sendMessage} disabled={chatLoading || !input.trim()} style={{
                                background: chatLoading || !input.trim() ? 'var(--bg3)' : 'var(--lime)',
                                color: chatLoading || !input.trim() ? 'var(--text-3)' : '#0e0e0e',
                                border: 'none', padding: '12px 20px', ...mono, fontSize: '11px', fontWeight: 700,
                                letterSpacing: '.08em', textTransform: 'uppercase',
                                cursor: chatLoading || !input.trim() ? 'not-allowed' : 'pointer', height: '48px',
                            }}>SEND →</button>
                        </div>
                    </div>
                )}

                {/* QUIZ TAB */}
                {docs.length > 0 && tab === 'quiz' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
                        {!quizQuestions.length && !quizLoading && (
                            <div style={{ maxWidth: '500px' }}>
                                <div style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '24px' }}>[QUIZ GENERATOR]</div>
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>NUMBER OF QUESTIONS</div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[5, 10, 15, 20].map(n => (
                                            <div key={n} onClick={() => setNumQuestions(n)} style={{
                                                padding: '10px 20px', cursor: 'pointer', ...mono, fontSize: '12px', fontWeight: 700,
                                                border: `1px solid ${numQuestions === n ? 'var(--lime)' : 'var(--border)'}`,
                                                background: numQuestions === n ? 'var(--lime)' : 'var(--bg2)',
                                                color: numQuestions === n ? '#0e0e0e' : 'var(--text-2)',
                                            }}>{n}</div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginBottom: '32px' }}>
                                    <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>DIFFICULTY</div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {(['easy', 'medium', 'hard'] as const).map(d => (
                                            <div key={d} onClick={() => setDifficulty(d)} style={{
                                                padding: '10px 20px', cursor: 'pointer', ...mono, fontSize: '11px',
                                                fontWeight: difficulty === d ? 700 : 400, textTransform: 'uppercase', letterSpacing: '.06em',
                                                border: `1px solid ${difficulty === d ? 'var(--lime)' : 'var(--border)'}`,
                                                background: difficulty === d ? 'var(--lime-dim)' : 'var(--bg2)',
                                                color: difficulty === d ? 'var(--lime)' : 'var(--text-2)',
                                            }}>{d}</div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={generateQuiz} style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                                    GENERATE QUIZ →
                                </button>
                            </div>
                        )}

                        {quizLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', ...mono, fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lime)', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                                </div>
                                ARIA IS GENERATING YOUR QUIZ...
                            </div>
                        )}

                        {quizQuestions.length > 0 && (
                            <div>
                                {submitted && (
                                    <div style={{ marginBottom: '28px', padding: '20px 24px', border: '1px solid var(--lime-border)', background: 'var(--lime-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>QUIZ COMPLETE</div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>You scored {score} out of {quizQuestions.length} correctly.</div>
                                        </div>
                                        <div style={{ fontSize: '48px', fontWeight: 700, color: scoreColor(score, quizQuestions.length), ...mono, lineHeight: 1 }}>{score}/{quizQuestions.length}</div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                                    {quizQuestions.map((q, qi) => (
                                        <div key={qi} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px' }}>
                                            <div style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.08em', marginBottom: '10px' }}>Q{qi + 1}</div>
                                            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)', marginBottom: '16px', lineHeight: 1.5 }}>{q.question}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {Object.entries(q.options).map(([key, val]) => {
                                                    const isSelected = answers[qi] === key
                                                    const isCorrect = submitted && key === q.correct
                                                    const isWrong = submitted && isSelected && key !== q.correct
                                                    let bg = 'var(--bg3)', border = 'var(--border)', color = 'var(--text-2)'
                                                    if (isCorrect) { bg = 'rgba(212,254,66,0.1)'; border = 'var(--lime)'; color = 'var(--lime)' }
                                                    else if (isWrong) { bg = 'rgba(239,68,68,0.1)'; border = '#ef4444'; color = '#ef4444' }
                                                    else if (isSelected && !submitted) { bg = 'var(--lime-dim)'; border = 'var(--lime)'; color = 'var(--lime)' }
                                                    return (
                                                        <div key={key} onClick={() => !submitted && setAnswers((prev: Record<number, string>) => ({ ...prev, [qi]: key }))} style={{
                                                            padding: '12px 16px', background: bg, border: `1px solid ${border}`,
                                                            cursor: submitted ? 'default' : 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start',
                                                        }}>
                                                            <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color, flexShrink: 0 }}>{key}</span>
                                                            <span style={{ fontSize: '13px', color, lineHeight: 1.5 }}>{val as string}</span>
                                                            {isCorrect && <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', marginLeft: 'auto', flexShrink: 0 }}>✓</span>}
                                                            {isWrong && <span style={{ ...mono, fontSize: '10px', color: '#ef4444', marginLeft: 'auto', flexShrink: 0 }}>✗</span>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {submitted && (
                                                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                                                    <span style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>EXPLANATION: </span>
                                                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{q.explanation}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {!submitted ? (
                                    <button onClick={submitQuiz} disabled={Object.keys(answers).length < quizQuestions.length} style={{
                                        background: Object.keys(answers).length < quizQuestions.length ? 'var(--bg3)' : 'var(--lime)',
                                        color: Object.keys(answers).length < quizQuestions.length ? 'var(--text-3)' : '#0e0e0e',
                                        border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700,
                                        letterSpacing: '.08em', textTransform: 'uppercase',
                                        cursor: Object.keys(answers).length < quizQuestions.length ? 'not-allowed' : 'pointer',
                                        opacity: Object.keys(answers).length < quizQuestions.length ? 0.5 : 1,
                                    }}>
                                        SUBMIT QUIZ ({Object.keys(answers).length}/{quizQuestions.length} ANSWERED)
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => { setQuizQuestions([]); setAnswers({}); setSubmitted(false) }} style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                                            NEW QUIZ →
                                        </button>
                                        <button onClick={() => setTab('chat')} style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                                            ASK ARIA ABOUT WRONG ANSWERS
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
        </div>
    )
}