'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/reviews', label: 'Reviews' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

const RESOURCE_LINKS = [
  { href: '/resources/reference-generator', label: 'Reference Generator', icon: '📝' },
  { href: '/resources/research-finder', label: 'Research Finder', icon: '🔍' },
]

export default function Navbar() {
  const [open, setOpen]   = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [user, setUser]   = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Resolve initial session without a network round-trip
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Keep in sync with any sign-in / sign-out that happens in another tab or component
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[#FDFAF6] border-b border-[#E8E2D9]">
      <div className="container-narrow">
        <div className="flex items-center justify-between h-18 py-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/gpg-logo-transparent.png"
              alt="GetPrimeGrade"
              width={40}
              height={40}
              className="w-10 h-10"
              priority
            />
            <span className="font-extrabold text-lg tracking-tight text-[#1B2E4B]">
              GetPrimeGrade
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {/* Resources dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-sm font-medium text-[#6B7280] hover:text-[#1B2E4B] transition-colors flex items-center gap-1"
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

            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-[#6B7280] hover:text-[#1B2E4B] transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA — auth-aware */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-[#1B2E4B] hover:text-[#E8A020] transition-colors"
              >
                My Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-[#1B2E4B] hover:text-[#E8A020] transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 bg-[#E8A020] hover:bg-[#C4861A] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#1B2E4B] hover:bg-[#F5F0E8] transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu — auth-aware */}
      {open && (
        <div className="md:hidden bg-[#FDFAF6] border-t border-[#E8E2D9] px-6 py-5 space-y-1">
          {/* Resources section in mobile */}
          <div className="mb-2">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-[#1A1A2E] hover:text-[#E8A020] transition-colors"
            >
              Resources
              <svg className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {resourcesOpen && (
              <div className="pl-4 space-y-1 mt-1">
                {RESOURCE_LINKS.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => {
                      setOpen(false)
                      setResourcesOpen(false)
                    }}
                    className="flex items-center gap-2 py-2 text-sm text-[#6B7280] hover:text-[#E8A020] transition-colors"
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-[#1A1A2E] hover:text-[#E8A020] transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-4 border-t border-[#E8E2D9] mt-2 space-y-3">
            {user ? (
              <Link
                href="/dashboard"
                className="block text-sm font-semibold text-[#1B2E4B]"
                onClick={() => setOpen(false)}
              >
                My Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="block text-sm font-semibold text-[#1B2E4B]"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
            <Link
              href="/order"
              onClick={() => setOpen(false)}
              className="block w-full text-center bg-[#E8A020] hover:bg-[#C4861A] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
