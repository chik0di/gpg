import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — GetPrimeGrade',
  description:
    'Find answers to common questions about our model answers, study materials, pricing, delivery times, revisions, and refund policy. Learn how GetPrimeGrade works.',
  keywords: [
    'assignment help FAQ',
    'model answers questions',
    'academic writing service FAQ',
    'student help frequently asked questions',
  ],
  alternates: {
    canonical: 'https://getprimegrade.com/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions — GetPrimeGrade',
    description:
      'Find answers to common questions about our model answers, study materials, pricing, delivery times, and more.',
    url: 'https://getprimegrade.com/faq',
  },
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
