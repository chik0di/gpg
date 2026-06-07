'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#what-we-offer', label: 'What we offer' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen]   = useState(false)
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
          <Link href="/" className="flex items-center gap-2 group">
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
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
