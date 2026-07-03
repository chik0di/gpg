import { Metadata } from 'next'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import PrivacyContent from '@/components/legal/privacy-content'
import Link from 'next/link'

const LAST_UPDATED = '1 June 2025'

export const metadata: Metadata = {
  title: 'Privacy Policy — GetPrimeGrade',
  description: 'Learn how GetPrimeGrade collects, uses, and protects your personal data. Our privacy policy explains our commitment to your data security and privacy.',
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
    description: 'Learn how GetPrimeGrade collects, uses, and protects your personal data.',
    url: 'https://getprimegrade.com/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
        {/* Header */}
        <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
          <div className="container-narrow py-16 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E8A020] mb-4">
              Legal
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
              Privacy Policy
            </h1>
            <p className="text-[#6B7280] text-base max-w-lg mx-auto leading-relaxed">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="container-narrow py-16">
          <div className="max-w-3xl mx-auto">
            {/* Privacy Policy */}
            <div className="bg-white rounded-3xl border border-[#E8E2D9] p-8 sm:p-10" style={{ boxShadow: '0 4px 24px -4px rgba(26,26,46,0.07)' }}>
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[#E8E2D9]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F5F0E8' }}>
                  <svg className="w-5 h-5 text-[#1B2E4B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-[#1B2E4B]">Privacy Policy</h2>
              </div>

              <PrivacyContent />
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 text-center">
              <p className="text-sm text-[#9CA3AF] mb-4">
                Questions about this policy?
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#E8A020] hover:text-[#C4861A] transition-colors"
              >
                Contact us
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
