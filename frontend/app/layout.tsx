import './globals.css'
import type { Metadata, Viewport } from 'next'
import Providers from '@/components/Providers'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const DESCRIPTION = 'Mock interviews for CS students that fact-check every answer claim by claim, with adaptive follow-ups, a voice tutor, replay and progress.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Prepwise - Prep smarter. Not generic.', template: '%s | Prepwise' },
  description: DESCRIPTION,
  applicationName: 'Prepwise',
  openGraph: { title: 'Prepwise - Prep smarter. Not generic.', description: DESCRIPTION, siteName: 'Prepwise', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Prepwise', description: DESCRIPTION },
}

export const viewport: Viewport = { themeColor: '#0e0e0e' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
