import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Set up your profile',
  description: 'Tell Prepwise your university, target companies and syllabus.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
