'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  {
    href: '/admin',
    label: 'Orders',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/admin' && pathname.startsWith(href))
  }

  return (
    <>
      {/* ── Mobile top bar (hidden on md+) ───────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 border-b"
        style={{ background: '#FDFAF6', borderColor: '#E8E2D9' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: '#1B2E4B' }}
            >
              G
            </span>
            <div>
              <p className="text-sm font-extrabold text-[#1B2E4B] leading-none">GetPrimeGrade</p>
              <p className="text-[0.6rem] font-bold text-[#E8A020] uppercase tracking-wide mt-0.5">Admin</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              {LINKS.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: isActive(href) ? '#FDF3DC' : 'transparent',
                    color:      isActive(href) ? '#C4861A' : '#6B7280',
                  }}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </nav>

            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Desktop sidebar (hidden below md) ────────────────────────────── */}
      <aside
        className="hidden md:flex w-52 shrink-0 min-h-screen flex-col p-4 border-r"
        style={{ background: '#FDFAF6', borderColor: '#E8E2D9' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 px-2 py-3 mb-6">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#1B2E4B' }}
          >
            G
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#1B2E4B] leading-none">GetPrimeGrade</p>
            <p className="text-[0.6rem] font-bold text-[#E8A020] uppercase tracking-wide mt-0.5">Admin</p>
          </div>
        </Link>

        <nav className="space-y-1 flex-1">
          {LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: isActive(href) ? '#FDF3DC' : 'transparent',
                color:      isActive(href) ? '#C4861A' : '#6B7280',
              }}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] hover:bg-[#F5F0E8] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </form>
      </aside>
    </>
  )
}
