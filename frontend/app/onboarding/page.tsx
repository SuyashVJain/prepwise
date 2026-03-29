'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const CS_SUBJECTS = [
  'Data Structures and Algorithms',
  'Operating Systems',
  'Database Management Systems',
  'Computer Networks',
  'Object Oriented Programming',
  'System Design',
  'Compiler Design',
  'Theory of Computation',
  'Computer Organization and Architecture',
  'Software Engineering',
  'Artificial Intelligence',
  'Machine Learning',
  'Web Technologies',
  'Discrete Mathematics',
  'Digital Electronics',
]

const TARGETS = [
  { id: 'faang', num: '01', name: 'FAANG / BIG TECH', desc: 'LeetCode-style DSA, system design at scale, behavioral STAR format.', companies: ['Google', 'Meta', 'Amazon', 'Microsoft'] },
  { id: 'product', num: '02', name: 'PRODUCT STARTUPS', desc: 'Full-stack thinking, product sense, system trade-offs, culture fit.', companies: ['Razorpay', 'Zepto', 'CRED', 'Groww'] },
  { id: 'service', num: '03', name: 'SERVICE COMPANIES', desc: 'Aptitude rounds, verbal ability, basic CS fundamentals, HR rounds.', companies: ['TCS', 'Infosys', 'Wipro', 'Cognizant'] },
  { id: 'core', num: '04', name: 'CORE CS CAMPUS', desc: 'University placement cell rounds - syllabus-specific, theory + coding.', companies: ['Campus drives', 'Placement cell'] },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [university, setUniversity] = useState('')
  const [customUni, setCustomUni] = useState('')
  const [targets, setTargets] = useState<string[]>([])
  const [syllabusMode, setSyllabusMode] = useState('pdf')
  const [semester, setSemester] = useState(1)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [customTopic, setCustomTopic] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [syllabusData, setSyllabusData] = useState<{ topics: string[]; raw_chunks: string[]; metadata: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
  const grotesk: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }

  function toggleTarget(id: string) {
    setTargets(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  function toggleSubject(s: string) {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function addCustomTopic() {
    const t = customTopic.trim()
    if (t && !selectedSubjects.includes(t)) {
      setSelectedSubjects(prev => [...prev, t])
      setCustomTopic('')
    }
  }

  async function handlePdfUpload(file: File) {
    setPdfFile(file)
    setUploading(true)
    setSyllabusData(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('university', university || customUni)
    formData.append('semester', semester.toString())
    try {
      const res = await fetch(`${API}/syllabus/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setSyllabusData({ topics: data.topics, raw_chunks: data.raw_chunks, metadata: data.metadata })
    } catch (err) {
      console.error('PDF upload error:', err)
    }
    setUploading(false)
  }

  async function handleManualSubmit() {
    if (!selectedSubjects.length) return
    setUploading(true)
    try {
      const res = await fetch(`${API}/syllabus/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: selectedSubjects, university: university || customUni, semester }),
      })
      const data = await res.json()
      setSyllabusData({ topics: data.topics, raw_chunks: data.raw_chunks, metadata: data.metadata })
    } catch (err) {
      console.error('Manual topics error:', err)
    }
    setUploading(false)
  }

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const finalUni = university || customUni || 'Custom'
    const topics = syllabusData?.topics || selectedSubjects || []
    const rawChunks = syllabusData?.raw_chunks || []
    const metadata = syllabusData?.metadata || []

    await supabase.from('profiles').upsert({
      id: user.id,
      university: finalUni,
      semester,
      target_role: targets.join(','),
      onboarding_complete: true,
    })

    await supabase.from('syllabi').insert({
      user_id: user.id,
      name: `${finalUni} - Sem ${semester}`,
      university: finalUni,
      semester,
      source: syllabusMode as 'pdf' | 'manual',
      topics,
      raw_chunks: rawChunks,
      vectors: metadata,
    })

    router.push('/dashboard')
  }

  const canContinueStep1 = university || customUni.trim().length > 0
  const canContinueStep2 = targets.length > 0
  const canFinish = syllabusData !== null || (syllabusMode === 'manual' && selectedSubjects.length > 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', ...grotesk, display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: 'var(--lime)' }}>PREPWISE</span>
        <span style={{ ...mono, fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Step <span style={{ color: 'var(--text-2)' }}>{step}</span> of <span style={{ color: 'var(--text-2)' }}>3</span>
        </span>
      </div>

      {/* PROGRESS */}
      <div style={{ display: 'flex', gap: '4px', height: '2px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: '2px', background: s <= step ? 'var(--lime)' : 'var(--border-2)', opacity: s === step ? 0.6 : 1, transition: 'background .3s' }} />
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: '9px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
            ONBOARDING // SYSTEM.CONFIG // V.1
          </span>
        </div>

        <div style={{ flex: 1, padding: '40px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

          {/* ── STEP 1: UNIVERSITY ── */}
          {step === 1 && (
            <div>
              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px', display: 'block' }}>[01 - INSTITUTION]</span>
              <h1 style={{ fontSize: '42px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '8px' }}>Where do you study?</h1>
              <p style={{ ...mono, fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.04em', marginBottom: '32px' }}>Select your university or enter a custom one below.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {['SUAS', 'VTU', 'RGPV', 'Mumbai Uni', 'GTU', 'AKTU', 'Anna Univ', 'JNTU'].map(u => (
                  <div key={u} onClick={() => { setUniversity(u); setCustomUni('') }}
                    style={{ background: university === u ? 'var(--lime-dim)' : 'var(--bg3)', border: `1px solid ${university === u ? 'var(--lime)' : 'var(--border)'}`, padding: '16px', cursor: 'pointer', position: 'relative', transition: 'all .1s' }}>
                    {university === u && <span style={{ position: 'absolute', top: '10px', right: '12px', ...mono, fontSize: '10px', color: 'var(--lime)' }}>✓</span>}
                    <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: '3px' }}>{u}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                <label style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>OR ENTER CUSTOM UNIVERSITY</label>
                <input type="text" value={customUni}
                  onChange={e => { setCustomUni(e.target.value); setUniversity('') }}
                  placeholder="e.g. IIT Bombay, NIT Trichy..."
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '12px 0', fontSize: '14px', color: 'var(--text)', outline: 'none', letterSpacing: '.02em' }}
                  onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                  onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
              </div>
            </div>
          )}

          {/* ── STEP 2: TARGET ── */}
          {step === 2 && (
            <div>
              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px', display: 'block' }}>[02 - TARGET COMPANY]</span>
              <h1 style={{ fontSize: '42px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '8px' }}>Who are you preparing for?</h1>
              <p style={{ ...mono, fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.04em', marginBottom: '8px' }}>Prepwise calibrates question style, difficulty, and vocabulary to match.</p>
              <p style={{ ...mono, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '24px' }}>SELECT ALL THAT APPLY</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {TARGETS.map(t => (
                  <div key={t.id} onClick={() => toggleTarget(t.id)}
                    style={{ background: targets.includes(t.id) ? 'var(--lime-dim)' : 'var(--bg3)', border: `1px solid ${targets.includes(t.id) ? 'var(--lime)' : 'var(--border)'}`, padding: '24px', cursor: 'pointer', transition: 'all .1s' }}>
                    <span style={{ ...mono, fontSize: '10px', color: targets.includes(t.id) ? 'var(--lime)' : 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>[{t.num}]</span>
                    <div style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.01em', marginBottom: '8px' }}>{t.name}</div>
                    <div style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '14px' }}>{t.desc}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {t.companies.map(c => (
                        <span key={c} style={{ ...mono, fontSize: '9px', letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', background: 'var(--bg4)', color: targets.includes(t.id) ? 'var(--text-2)' : 'var(--text-3)', border: `1px solid ${targets.includes(t.id) ? 'var(--lime-border)' : 'var(--border)'}` }}>{c}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: SYLLABUS ── */}
          {step === 3 && (
            <div>
              <span style={{ ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: '12px', display: 'block' }}>[03 - SYLLABUS]</span>
              <h1 style={{ fontSize: '42px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, marginBottom: '8px' }}>Load your syllabus</h1>
              <p style={{ ...mono, fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.04em', marginBottom: '32px' }}>This is what makes Prepwise different. Every question is grounded in what you actually study.</p>

              {/* mode selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '28px' }}>
                {[
                  { id: 'pdf', icon: '[PDF]', name: 'UPLOAD PDF', desc: 'Upload your syllabus PDF. We parse, chunk, and embed it into a vector store.' },
                  { id: 'manual', icon: '[MAN]', name: 'PICK TOPICS', desc: 'Select from our curated CS subject list and add your own topics.' },
                ].map(s => (
                  <div key={s.id} onClick={() => setSyllabusMode(s.id)}
                    style={{ background: syllabusMode === s.id ? 'var(--lime-dim)' : 'var(--bg3)', border: `1px solid ${syllabusMode === s.id ? 'var(--lime)' : 'var(--border)'}`, padding: '24px 20px', cursor: 'pointer', transition: 'all .1s' }}>
                    <div style={{ ...mono, fontSize: '20px', color: 'var(--lime)', marginBottom: '12px' }}>{s.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: '8px' }}>{s.name}</div>
                    <div style={{ ...mono, fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* PDF upload */}
              {syllabusMode === 'pdf' && (
                <div style={{ marginBottom: '24px' }}>
                  <input type="file" accept=".pdf" id="pdf-upload" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f) }} />
                  <label htmlFor="pdf-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 24px', border: '1px dashed var(--border-2)', cursor: 'pointer', ...mono, fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: uploading ? 'var(--lime)' : 'var(--text-3)', transition: 'all .1s' }}>
                    {uploading ? 'PROCESSING PDF...' : pdfFile ? `✓ ${pdfFile.name}` : 'CHOOSE SYLLABUS PDF'}
                  </label>
                  {syllabusData && (
                    <div style={{ marginTop: '12px', ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.06em' }}>
                      ✓ {syllabusData.topics.length} TOPICS EXTRACTED · {syllabusData.raw_chunks.length} CHUNKS INDEXED INTO VECTOR STORE
                    </div>
                  )}
                  {syllabusData && syllabusData.topics.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {syllabusData.topics.slice(0, 12).map(t => (
                        <span key={t} style={{ ...mono, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 8px', border: '1px solid var(--lime-border)', color: 'var(--lime)', background: 'var(--lime-dim)' }}>{t}</span>
                      ))}
                      {syllabusData.topics.length > 12 && <span style={{ ...mono, fontSize: '9px', color: 'var(--text-3)' }}>+{syllabusData.topics.length - 12} more</span>}
                    </div>
                  )}
                </div>
              )}

              {/* manual topic checklist */}
              {syllabusMode === 'manual' && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>SELECT SUBJECTS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
                    {CS_SUBJECTS.map(s => (
                      <div key={s} onClick={() => toggleSubject(s)}
                        style={{ background: selectedSubjects.includes(s) ? 'var(--lime-dim)' : 'var(--bg3)', border: `1px solid ${selectedSubjects.includes(s) ? 'var(--lime)' : 'var(--border)'}`, padding: '10px 12px', cursor: 'pointer', transition: 'all .1s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedSubjects.includes(s) ? 'var(--lime)' : 'var(--border-2)', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 500, color: selectedSubjects.includes(s) ? 'var(--lime)' : 'var(--text-2)', lineHeight: 1.3 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input type="text" value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                      placeholder="Add custom topic..."
                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-2)', padding: '10px 0', fontSize: '13px', color: 'var(--text)', outline: 'none' }}
                      onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--lime)'}
                      onBlur={e => e.currentTarget.style.borderBottomColor = 'var(--border-2)'} />
                    <button onClick={addCustomTopic} style={{ ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '8px 16px', cursor: 'pointer' }}>+ ADD</button>
                  </div>
                  {selectedSubjects.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', letterSpacing: '.06em' }}>{selectedSubjects.length} TOPICS SELECTED</span>
                      {!syllabusData && (
                        <button onClick={handleManualSubmit} disabled={uploading}
                          style={{ marginLeft: '12px', ...mono, fontSize: '10px', letterSpacing: '.08em', textTransform: 'uppercase', background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '6px 14px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                          {uploading ? 'INDEXING...' : 'BUILD INDEX →'}
                        </button>
                      )}
                      {syllabusData && <span style={{ ...mono, fontSize: '10px', color: 'var(--lime)', marginLeft: '8px' }}>✓ {syllabusData.raw_chunks.length} CHUNKS INDEXED</span>}
                    </div>
                  )}
                </div>
              )}

              {/* semester */}
              <div>
                <span style={{ ...mono, fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px', display: 'block' }}>WHICH SEMESTER?</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <div key={s} onClick={() => setSemester(s)}
                      style={{ ...mono, fontSize: '11px', padding: '8px 16px', border: `1px solid ${semester === s ? 'var(--lime)' : 'var(--border)'}`, background: semester === s ? 'var(--lime)' : 'var(--bg3)', color: semester === s ? '#0e0e0e' : 'var(--text-2)', cursor: 'pointer', fontWeight: semester === s ? 700 : 400, transition: 'all .1s', letterSpacing: '.04em' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM NAV */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '32px', marginTop: '40px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/')}
              style={{ ...mono, fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              ← BACK
            </button>
            <button
              onClick={() => step < 3 ? setStep(s => s + 1) : handleFinish()}
              disabled={loading || (step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canFinish)}
              style={{ background: 'var(--lime)', color: '#0e0e0e', border: 'none', padding: '14px 32px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', opacity: (loading || (step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canFinish)) ? 0.4 : 1, transition: 'opacity .1s' }}>
              {loading ? 'LAUNCHING...' : step === 3 ? 'LAUNCH PREPWISE →' : 'CONTINUE →'}
            </button>
          </div>
        </div>

        <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: '9px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
            CANDIDATE.INIT // PROFILE.BUILD // ACTIVE
          </span>
        </div>
      </div>
    </div>
  )
}
