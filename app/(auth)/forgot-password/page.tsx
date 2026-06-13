'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Check if email exists in the system
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !userData) {
      setError('No account found with this email address. Please check your email or create a new account.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="bg-white rounded-3xl border border-[#E8E2D9] p-7 sm:p-8"
      style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
    >
      {sent ? (
        <div className="text-center py-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#FDF3DC' }}
          >
            <svg className="w-7 h-7 text-[#E8A020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B2E4B] mb-2">Check your inbox</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            We've sent a password reset link to <strong className="text-[#1A1A2E]">{email}</strong>.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-bold text-[#1B2E4B] mb-1">Reset your password</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#C4C0B8]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#9CA3AF]">
            <Link href="/login" className="font-semibold text-[#6B7280] hover:text-[#1B2E4B] transition-colors">
              ← Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
