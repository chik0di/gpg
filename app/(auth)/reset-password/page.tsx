'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, isPasswordValid } from '@/lib/utils/password'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate password requirements
    if (!isPasswordValid(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#C4C0B8]'

  return (
    <div
      className="bg-white rounded-3xl border border-[#E8E2D9] p-7 sm:p-8"
      style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
    >
      {success ? (
        <div className="text-center py-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#D1FAE5' }}
          >
            <svg className="w-7 h-7 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1B2E4B] mb-2">Password Reset Successful</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            Your password has been updated. Redirecting to dashboard...
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-bold text-[#1B2E4B] mb-1">Set New Password</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            Enter your new password below.
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
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && (() => {
                const strength = getPasswordStrength(password)
                return strength ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium text-[#6B7280]">Password strength:</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ color: strength.color, background: strength.bgColor }}
                    >
                      {strength.label}
                    </span>
                  </div>
                ) : null
              })()}
              <p className="text-xs text-[#9CA3AF] mt-2">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
              {loading ? 'Resetting password…' : 'Reset password'}
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
