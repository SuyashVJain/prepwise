import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Progress',
  description: 'Your scores and weak topics over time.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
