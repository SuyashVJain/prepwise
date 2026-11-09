// Turns the auth provider's error text into a message a student can act on.
export function friendlyAuthError(message: string): { text: string; unconfirmed?: boolean } {
  const m = message.toLowerCase()
  if (m.includes('email not confirmed')) return { text: 'Your email is not confirmed yet. Open the confirmation link we sent you, then sign in.', unconfirmed: true }
  if (m.includes('invalid login credentials')) return { text: 'Wrong email or password. Check both and try again, or reset your password.' }
  if (m.includes('already registered') || m.includes('already been registered')) return { text: 'An account with this email already exists. Sign in instead.' }
  if (m.includes('password') && (m.includes('at least') || m.includes('weak') || m.includes('short'))) return { text: 'Choose a longer password, at least 8 characters.' }
  if (m.includes('rate limit') || m.includes('too many')) return { text: 'Too many attempts. Wait a minute and try again.' }
  if (m.includes('failed to fetch') || m.includes('network')) return { text: 'Could not reach the server. Check your connection and try again.' }
  return { text: 'Something went wrong. Please try again.' }
}
