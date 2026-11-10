import { createClient } from '@/lib/supabase/client'
import { wakeTracker } from '@/lib/wakeTracker'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const RATE_LIMIT_MESSAGE = 'Too many requests. Please wait a moment.'

// The current Supabase access token, or null when signed out.
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? null
}

// The backend rejected the session: clear it locally, then go to /login.
// Clearing first matters, otherwise the route guard bounces /login back to /dashboard.
export async function signOutToLogin(): Promise<void> {
  await createClient().auth.signOut()
  window.location.href = '/login'
}

let warmed = false

// Wakes a sleeping backend before the student needs it: one cheap request to the public health route, once per page
// load. It is silent (the wake tracker does not watch it) and errors are ignored.
export function warmBackend(): void {
  if (warmed) return
  warmed = true
  fetch(`${API}/health`, { cache: 'no-store' }).catch(() => {})
}

// WebSocket address for a backend path, e.g. wsUrl('/tutor/ws').
export function wsUrl(path: string): string {
  return API.replace(/^http/, 'ws') + path
}

// One fetch that the wake tracker watches: a request still waiting after a few seconds shows the "waking up" notice.
// It is never cancelled or repeated, except that a safe GET is tried once more after a network error (a sleeping
// server often drops the first connection). Calls that change data are never retried.
async function trackedFetch(url: string, init: RequestInit, retryGet: boolean): Promise<Response> {
  let end = wakeTracker.begin()
  try {
    return await fetch(url, init)
  } catch (err) {
    end()
    end = () => {}
    if (!retryGet) throw err
    await new Promise(resolve => setTimeout(resolve, 1500))
    end = wakeTracker.begin()
    return await fetch(url, init)
  } finally {
    end()
  }
}

// Single entry point for backend calls: attaches the current Supabase
// access token, sends the user to /login if the backend rejects it, and throws
// RATE_LIMIT_MESSAGE when the backend returns 429. Slow answers are reported to the wake tracker.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()

  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const isGet = !init.method || init.method.toUpperCase() === 'GET'
  const res = await trackedFetch(`${API}${path}`, { ...init, headers }, isGet)

  if (res.status === 401) {
    await signOutToLogin()
    throw new Error('Session expired. Please log in again.')
  }

  if (res.status === 429) {
    // The header is not always readable across origins, so the caller falls back to a default wait.
    const retryAfter = Number(res.headers.get('Retry-After'))
    throw Object.assign(new Error(RATE_LIMIT_MESSAGE), { retryAfter: retryAfter > 0 ? retryAfter : undefined })
  }

  return res
}
