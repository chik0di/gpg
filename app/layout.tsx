import type { Metadata } from 'next'
import './globals.css'
import WhatsAppButton from '@/components/shared/whatsapp-button'

const siteUrl = 'https://getprimegrade.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GetPrimeGrade — Expert Model Answers & Study Materials for Students',
    template: '%s | GetPrimeGrade',
  },
  description:
    'Expert model answers and study materials crafted to your brief — delivered before your deadline. Trusted by university and college students worldwide.',
  keywords: [
    'model answers UK',
    'custom assignment help',
    'academic study materials',
    'assignment writing service',
    'essay help online',
    'university coursework help',
    'assignment reference',
    'academic writing support',
    'student study materials',
    'model essay examples',
  ],
  authors: [{ name: 'GetPrimeGrade' }],
  creator: 'GetPrimeGrade',
  publisher: 'GetPrimeGrade',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
    siteName: 'GetPrimeGrade',
    title: 'GetPrimeGrade — Expert Model Answers & Study Materials for Students',
    description:
      'Expert model answers and study materials crafted to your brief — delivered before your deadline. Trusted by university and college students worldwide.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'GetPrimeGrade — Expert Model Answers & Study Materials',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetPrimeGrade — Expert Model Answers & Study Materials for Students',
    description:
      'Expert model answers and study materials crafted to your brief — delivered before your deadline. Trusted by university and college students worldwide.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  )
}
