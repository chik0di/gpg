import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — GetPrimeGrade',
  description:
    'Learn how GetPrimeGrade collects, uses, and protects your personal data. Our privacy policy explains our commitment to your data security and privacy.',
  keywords: [
    'privacy policy',
    'data protection',
    'GDPR compliance',
    'privacy',
  ],
  alternates: {
    canonical: 'https://getprimegrade.com/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — GetPrimeGrade',
    description:
      'Learn how GetPrimeGrade collects, uses, and protects your personal data.',
    url: 'https://getprimegrade.com/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
