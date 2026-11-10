'use client'
import { useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ToastProvider } from '@/components/Toast'

const LoadingScreen = dynamic(() => import('@/components/LoadingScreen'), { ssr: false })

// Only the signed-in app screens get the start-up animation. Public pages and unknown addresses (the 404) appear at once.
const APP = ['/dashboard', '/interview', '/study', '/tutor', '/history', '/progress', '/settings', '/onboarding']

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // The server render and first paint show the loader; after that the stored flag decides.
  const seen = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem('pw_loaded') === '1',
    () => false,
  )
  const [finished, setFinished] = useState(false)
  const loading = APP.some(p => pathname === p || pathname.startsWith(p + '/')) && !seen && !finished

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
