import { createClient } from '@/lib/supabase/client'

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

// WebSocket address for a backend path, e.g. wsUrl('/tutor/ws').
export function wsUrl(path: string): string {
  return API.replace(/^http/, 'ws') + path
}

// Single entry point for backend calls: attaches the current Supabase
// access token, sends the user to /login if the backend rejects it, and throws
// RATE_LIMIT_MESSAGE when the backend returns 429.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()

  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API}${path}`, { ...init, headers })

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
