import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to Prepwise to continue your interview practice.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
