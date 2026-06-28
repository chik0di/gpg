import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us — GetPrimeGrade',
  description:
    'Get in touch with GetPrimeGrade for questions about our model answers and study materials. We respond to all enquiries within 24 hours.',
  keywords: [
    'contact GetPrimeGrade',
    'assignment help contact',
    'academic support enquiry',
    'student help contact',
  ],
  alternates: {
    canonical: 'https://getprimegrade.com/contact',
  },
  openGraph: {
    title: 'Contact Us — GetPrimeGrade',
    description:
      'Get in touch with GetPrimeGrade for questions about our model answers and study materials.',
    url: 'https://getprimegrade.com/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
