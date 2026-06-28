import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#F5F0E8' }}
    >
      {/* Back to home link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#1B2E4B] transition-colors group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>

      {/* Logo link */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: '#1B2E4B' }}
        >
          G
        </span>
        <span className="font-extrabold text-lg tracking-tight text-[#1B2E4B]">
          GetPrimeGrade
        </span>
      </Link>

      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  )
}
