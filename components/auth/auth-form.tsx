'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

interface Props {
  next: string
  initialMode: Mode
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

const inputClass =
  'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#C4C0B8]'

export default function AuthForm({ next, initialMode }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const router = useRouter()
  const supabase = createClient()

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setSuccess(null)
  }

  // ── Google OAuth ────────────────────────────────────────────────────────
  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success the browser navigates to Google — no further action needed here
  }

  // ── Email sign-in ───────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  // ── Email sign-up ───────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (data.session) {
        // Session available — user is immediately active. Upsert the profile now.
        // (The DB trigger also fires on auth.users insert, so this is belt-and-braces.)
        await supabase.from('profiles').upsert(
          { id: data.user.id, email, first_name: firstName, last_name: lastName },
          { onConflict: 'id', ignoreDuplicates: true }
        )

        router.push(next)
        router.refresh()
      } else {
        // Email confirmation is enabled — no session yet.
        // The DB trigger (handle_new_user) has already created the profile row.
        setSuccess(
          "We've sent a confirmation email. Click the link in it, then sign in here."
        )
        setLoading(false)
      }
    }
  }

  const fromOrder = next.includes('/checkout')

  return (
    <div
      className="bg-white rounded-3xl border border-[#E8E2D9] p-7 sm:p-8"
      style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
    >
      {/* Context banner — shown when coming from order flow */}
      {fromOrder && (
        <div className="flex items-start gap-3 bg-[#FDF3DC] border border-[#E8A020]/30 rounded-2xl px-4 py-3 mb-6">
          <span className="text-[#E8A020] mt-0.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 102 0V7zm-1 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
          <p className="text-sm font-medium text-[#C4861A]">
            Almost there — sign in or create your free account to complete your order.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex bg-[#F5F0E8] rounded-xl p-1 mb-7">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className="flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-150"
            style={{
              background: mode === m ? '#fff' : 'transparent',
              color: mode === m ? '#1B2E4B' : '#9CA3AF',
              boxShadow: mode === m ? '0 1px 4px rgba(26,26,46,0.10)' : 'none',
            }}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-[#E8E2D9] rounded-xl bg-white hover:border-[#1B2E4B] hover:bg-[#FDFAF6] text-sm font-semibold text-[#1A1A2E] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <svg className="w-5 h-5 animate-spin text-[#9CA3AF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#E8E2D9]" />
        <span className="text-xs font-medium text-[#9CA3AF]">or continue with email</span>
        <div className="flex-1 h-px bg-[#E8E2D9]" />
      </div>

      {/* Error / success messages */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
          <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Sign-in form */}
      {mode === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
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
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-[#1B2E4B]">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {/* Sign-up form */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                First name
              </label>
              <input
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                Last name
              </label>
              <input
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className={inputClass}
              />
            </div>
          </div>

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
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-xs text-[#9CA3AF] text-center pt-1">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-[#6B7280] underline underline-offset-2 hover:text-[#1B2E4B]">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  )
}
