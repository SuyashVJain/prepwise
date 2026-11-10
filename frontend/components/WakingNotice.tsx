'use client'
import { useSyncExternalStore } from 'react'
import { wakeTracker } from '@/lib/wakeTracker'

// A small inline notice at the top of the page content while the backend is slow to answer (it may be waking up).
// It disappears as soon as any request gets an answer. The live region stays in the page so screen readers hear it appear.
export default function WakingNotice() {
  const waking = useSyncExternalStore(wakeTracker.subscribe, wakeTracker.isWaking, () => false)
  return (
    <div aria-live="polite">
      {waking && (
        <div className="waking-notice">
          <span className="waking-dot" aria-hidden="true" />
          Waking up the server. This takes up to a minute the first time.
        </div>
      )}
    </div>
  )
}
