import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a free Prepwise account and run your first mock interview.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
