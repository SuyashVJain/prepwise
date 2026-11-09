import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Voice tutor',
  description: 'Learn a subject by talking to Aria.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
