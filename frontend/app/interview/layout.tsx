import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mock interview',
  description: 'Run a mock interview with checked feedback.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
