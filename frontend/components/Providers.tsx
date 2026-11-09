'use client'
import { useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ToastProvider } from '@/components/Toast'

const LoadingScreen = dynamic(() => import('@/components/LoadingScreen'), { ssr: false })

// Pages a stranger can open: they should appear at once, with no start-up animation.
const PUBLIC = ['/', '/login', '/signup', '/privacy', '/terms', '/forgot-password', '/reset-password']

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The server render and first paint show the loader; after that the stored flag decides.
  const seen = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem('pw_loaded') === '1',
    () => false,
  )
  const [finished, setFinished] = useState(false)
  const loading = !PUBLIC.includes(pathname) && !seen && !finished

  function handleDone() {
    sessionStorage.setItem('pw_loaded', '1')
    setFinished(true)
  }

  return (
    <ToastProvider>
      {loading && <LoadingScreen onDone={handleDone} />}
      <div style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}>{children}</div>
    </ToastProvider>
  )
}
