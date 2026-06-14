import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import WhatsAppButton from '@/components/shared/whatsapp-button'
import ReferralTracker from '@/components/referral/referral-tracker'

export const metadata: Metadata = {
  title: {
    default: 'GetPrimeGrade — Expert Model Answers & Study Materials',
    template: '%s | GetPrimeGrade',
  },
  description:
    'Expert model answers and study materials crafted to your brief — delivered before your deadline. Trusted by university and college students worldwide.',
  keywords: [
    'model answers',
    'academic study materials',
    'assignment reference',
    'university coursework help',
    'essay help online',
  ],
  openGraph: {
    title: 'GetPrimeGrade — Expert Model Answers & Study Materials',
    description:
      'Expert model answers and study materials crafted to your brief — delivered before your deadline.',
    type: 'website',
    locale: 'en_GB',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  )
}
