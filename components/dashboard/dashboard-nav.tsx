'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

const LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/orders', label: 'My Orders' },
]

interface Props {
  user: User
  profile: { first_name: string | null; last_name: string | null } | null
}

export default function DashboardNav({ user, profile }: Props) {
  const pathname = usePathname()
  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name[0] + '.' : ''}`
    : user.email

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: '#FDFAF6', borderColor: '#E8E2D9' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: '#1B2E4B' }}
            >
              G
            </span>
            <span className="font-extrabold text-base tracking-tight text-[#1B2E4B]">
              GetPrimeGrade
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{
                    background: active ? '#FDF3DC' : 'transparent',
                    color: active ? '#C4861A' : '#6B7280',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Avatar + name */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: '#1B2E4B' }}
              >
                {(profile?.first_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-[#6B7280]">{displayName}</span>
            </div>

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

        {/* Mobile nav */}
        <nav className="sm:hidden flex gap-1 pb-3 overflow-x-auto">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
                style={{
                  background: active ? '#FDF3DC' : 'transparent',
                  color: active ? '#C4861A' : '#6B7280',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
