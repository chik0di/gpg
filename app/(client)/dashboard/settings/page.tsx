'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, isPasswordValid } from '@/lib/utils/password'
import { signOut } from '@/lib/auth/signout'

type EmailStep = 'idle' | 'enter-new'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentEmail, setCurrentEmail] = useState('')
  const [showEmailUpdatedBanner, setShowEmailUpdatedBanner] = useState(false)

  // Password change state
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwMsg, setResetPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Email change state
  const [emailStep, setEmailStep] = useState<EmailStep>('idle')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [confirmNewEmail, setConfirmNewEmail] = useState('')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentEmail(user.email)
      }
    }
    loadUser()

    // Check for email_updated query parameter
    if (searchParams.get('email_updated') === 'true') {
      setShowEmailUpdatedBanner(true)
      // Clear the query parameter from URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('email_updated')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPwLoading(true)
    setPwMsg(null)

    // Validate new password requirements
    if (!isPasswordValid(newPw)) {
      setPwMsg({
        type: 'err',
        text: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      })
      setPwLoading(false)
      return
    }

    const supabase = createClient()

    // First verify current password by attempting sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPw,
    })

    if (signInError) {
      setPwMsg({ type: 'err', text: 'Current password is incorrect.' })
      setPwLoading(false)
      return
    }

    // Now update to new password
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrentPw('')
      setNewPw('')
    }
    setPwLoading(false)
  }

  async function handleResetPassword() {
    setResetPwLoading(true)
    setResetPwMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setResetPwMsg({ type: 'err', text: error.message })
    } else {
      setResetPwMsg({ type: 'ok', text: `Password reset link sent to ${currentEmail}` })
    }
    setResetPwLoading(false)
  }

  function handleStartEmailChange() {
    setEmailStep('enter-new')
    setEmailMsg(null)
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailMsg(null)

    if (newEmail !== confirmNewEmail) {
      setEmailMsg({ type: 'err', text: 'Email addresses do not match.' })
      setEmailLoading(false)
      return
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailMsg({ type: 'err', text: 'New email must be different from current email.' })
      setEmailLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      {
        emailRedirectTo: `${window.location.origin}/dashboard/settings?email_updated=true`
      }
    )

    if (error) {
      setEmailMsg({ type: 'err', text: error.message })
      setEmailLoading(false)
    } else {
      setEmailMsg({
        type: 'ok',
        text: `A confirmation link has been sent to ${newEmail}. Click the link in that email to complete the change.`
      })
      setNewEmail('')
      setConfirmNewEmail('')
      setEmailLoading(false)
      // Stay on the 'enter-new' step so user can see the message
    }
  }

  function cancelEmailChange() {
    setEmailStep('idle')
    setEmailMsg(null)
    setNewEmail('')
    setConfirmNewEmail('')
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#C4C0B8] disabled:bg-[#F5F0E8] disabled:text-[#9CA3AF] disabled:cursor-not-allowed'

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Account Settings</h1>

      {/* Email Updated Success Banner */}
      {showEmailUpdatedBanner && (
        <div className="flex items-start gap-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#16A34A]">Your email address has been successfully updated.</p>
            <p className="text-xs text-[#16A34A] mt-1">All future communications will be sent to your new email address.</p>
          </div>
          <button
            onClick={() => setShowEmailUpdatedBanner(false)}
            className="text-[#16A34A] hover:text-[#15803D] transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Change Email */}
      <div
        className="bg-white rounded-2xl border border-[#E8E2D9] p-6"
        style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
      >
        <h2 className="text-base font-bold text-[#1B2E4B] mb-2">Email Address</h2>
        <p className="text-sm text-[#6B7280] mb-5">
          Current email: <strong className="text-[#1A1A2E]">{currentEmail}</strong>
        </p>

        {emailMsg && (
          <div
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm ${
              emailMsg.type === 'ok'
                ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A]'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {emailMsg.text}
          </div>
        )}

        {emailStep === 'idle' && (
          <button
            onClick={handleStartEmailChange}
            disabled={emailLoading}
            className="flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            Change email address
          </button>
        )}

        {emailStep === 'enter-new' && (
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                New Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your-new-email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                Confirm New Email
              </label>
              <input
                type="email"
                required
                value={confirmNewEmail}
                onChange={(e) => setConfirmNewEmail(e.target.value)}
                placeholder="Confirm your new email"
                className={inputClass}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={emailLoading}
                className="flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {emailLoading ? 'Updating…' : 'Update email'}
              </button>
              <button
                type="button"
                onClick={cancelEmailChange}
                className="text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Change password */}
      <div
        className="bg-white rounded-2xl border border-[#E8E2D9] p-6"
        style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
      >
        <h2 className="text-base font-bold text-[#1B2E4B] mb-5">Change Password</h2>

        {pwMsg && (
          <div
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm ${
              pwMsg.type === 'ok'
                ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A]'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {pwMsg.text}
          </div>
        )}

        {resetPwMsg && (
          <div
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm ${
              resetPwMsg.type === 'ok'
                ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A]'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {resetPwMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-[#1B2E4B]">
                Current Password
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetPwLoading}
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors disabled:opacity-60"
              >
                {resetPwLoading ? 'Sending...' : 'Forgot your password?'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
              >
                {showCurrentPw ? (
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

          <div>
            <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                minLength={8}
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
              >
                {showNewPw ? (
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
            {newPw && (() => {
              const strength = getPasswordStrength(newPw)
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

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-base font-bold text-[#1B2E4B] mb-2">Sign out everywhere</h2>
        <p className="text-sm text-[#9CA3AF] mb-4">
          Sign out of all active sessions on all devices.
        </p>
        <button
          onClick={() => signOut()}
          className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
        >
          Sign out all sessions
        </button>
      </div>
    </div>
  )
}
