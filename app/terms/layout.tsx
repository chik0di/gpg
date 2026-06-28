import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions — GetPrimeGrade',
  description:
    'Read our terms and conditions for using GetPrimeGrade services, including model answers, study materials, payment terms, and user responsibilities.',
  keywords: [
    'terms and conditions',
    'service terms',
    'academic services terms',
  ],
  alternates: {
    canonical: 'https://getprimegrade.com/terms',
  },
  openGraph: {
    title: 'Terms & Conditions — GetPrimeGrade',
    description:
      'Read our terms and conditions for using GetPrimeGrade services.',
    url: 'https://getprimegrade.com/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
