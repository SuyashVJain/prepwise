import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Only the public pages are for search engines; the signed-in app is not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/privacy', '/terms'], disallow: ['/dashboard', '/interview', '/history', '/progress', '/settings', '/study', '/tutor', '/onboarding', '/auth/'] },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
