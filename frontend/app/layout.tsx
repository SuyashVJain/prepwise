// prepwise/app/layout.tsx
'use client'
import './globals.css'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const LoadingScreen = dynamic(() => import('@/components/LoadingScreen'), { ssr: false })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const seen = sessionStorage.getItem('pw_loaded')
    if (seen) { setLoading(false); return }
  }, [])

  function handleDone() {
    sessionStorage.setItem('pw_loaded', '1')
    setLoading(false)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Prepwise - Prep smarter. Not generic.</title>
        <meta name="description" content="AI mock interviews calibrated to your university syllabus and target company." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230e0e0e'/><rect x='4' y='14' width='4' height='10' rx='2' fill='%23d4fe42'/><rect x='10' y='9' width='4' height='15' rx='2' fill='%23d4fe42'/><rect x='16' y='6' width='4' height='18' rx='2' fill='%23d4fe42'/><rect x='22' y='11' width='4' height='13' rx='2' fill='%23d4fe42'/><rect x='28' y='8' width='4' height='16' rx='2' fill='%23d4fe42'/></svg>" />
      </head>
      <body>
        {loading && <LoadingScreen onDone={handleDone} />}
        <div style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
