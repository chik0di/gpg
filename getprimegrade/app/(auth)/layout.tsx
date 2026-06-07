import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#F5F0E8' }}
    >
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
