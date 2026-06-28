import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://getprimegrade.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/order',
          '/faq',
          '/contact',
          '/terms',
          '/privacy',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/checkout',
          '/checkout/*',
          '/api/*',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
