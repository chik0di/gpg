'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/lib/auth/signout'

const RESOURCE_LINKS = [
  { href: '/resources/reference-generator', label: 'Reference Generator', icon: '📝' },
  { href: '/resources/research-finder', label: 'Research Finder', icon: '🔍' },
]

interface Props {
  user: User
  profile: { first_name: string | null; last_name: string | null } | null
}

export default function DashboardNav({ user, profile }: Props) {
  const pathname = usePathname()
  const [resourcesOpen, setResourcesOpen] = useState(false)
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
            <Image
              src="/gpg-logo-transparent.png"
              alt="GetPrimeGrade"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="font-extrabold text-base tracking-tight text-[#1B2E4B]">
              GetPrimeGrade
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {/* Overview */}
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: pathname === '/dashboard' ? '#FDF3DC' : 'transparent',
                color: pathname === '/dashboard' ? '#C4861A' : '#6B7280',
              }}
            >
              Overview
            </Link>

            {/* Resources dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center gap-1"
                style={{
                  background: pathname.startsWith('/resources') ? '#FDF3DC' : 'transparent',
                  color: pathname.startsWith('/resources') ? '#C4861A' : '#6B7280',
                }}
              >
                Resources
                <svg className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {resourcesOpen && (
                <div className="absolute top-full left-0 pt-2 w-60 z-50">
                  <div className="bg-white rounded-xl border border-[#E8E2D9] shadow-lg overflow-hidden">
                    {RESOURCE_LINKS.map(({ href, label, icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F0E8] transition-colors"
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium text-[#1B2E4B]">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: pathname === '/dashboard/settings' ? '#FDF3DC' : 'transparent',
                color: pathname === '/dashboard/settings' ? '#C4861A' : '#6B7280',
              }}
            >
              Settings
            </Link>

            {/* My Orders */}
            <Link
              href="/dashboard/orders"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: pathname === '/dashboard/orders' ? '#FDF3DC' : 'transparent',
                color: pathname === '/dashboard/orders' ? '#C4861A' : '#6B7280',
              }}
            >
              My Orders
            </Link>
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

            <button
              onClick={() => signOut()}
              className="text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex gap-1 pb-3 overflow-x-auto">
          {/* Overview */}
          <Link
            href="/dashboard"
            className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: pathname === '/dashboard' ? '#FDF3DC' : 'transparent',
              color: pathname === '/dashboard' ? '#C4861A' : '#6B7280',
            }}
          >
            Overview
          </Link>

          {/* Resources (mobile expands to show both) */}
          {RESOURCE_LINKS.map(({ href, label }) => {
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

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: pathname === '/dashboard/settings' ? '#FDF3DC' : 'transparent',
              color: pathname === '/dashboard/settings' ? '#C4861A' : '#6B7280',
            }}
          >
            Settings
          </Link>

          {/* My Orders */}
          <Link
            href="/dashboard/orders"
            className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: pathname === '/dashboard/orders' ? '#FDF3DC' : 'transparent',
              color: pathname === '/dashboard/orders' ? '#C4861A' : '#6B7280',
            }}
          >
            My Orders
          </Link>
        </nav>
      </div>
    </header>
  )
}
