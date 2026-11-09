import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'History',
  description: 'Replay your past interview sessions.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
