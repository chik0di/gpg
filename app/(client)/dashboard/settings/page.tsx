'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, isPasswordValid } from '@/lib/utils/password'

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

  const [accountId, setAccountId] = useState('')
  const [accountReady, setAccountReady] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [oauthOnly, setOauthOnly] = useState(false)
  const [confirmPw, setConfirmPw] = useState('')
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const emailUpdated = searchParams.get('email_updated') === 'true'

  useEffect(() => {
    let active = true
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!user?.email) { router.replace('/login?next=/dashboard/settings'); return }
        if (!active) return
        setAccountId(user.id)
        setCurrentEmail(user.email)
        setOauthOnly(!!user.identities?.length && !user.identities.some(identity => identity.provider === 'email'))
        setAccountReady(true)
        // Confirm against an actual Auth email-change record, not the URL or local storage.
        try {
          const response = await fetch('/api/auth/email-change-notification', { method: 'POST' })
          if (response.ok) {
            const result = await response.json()
            if (active && emailUpdated && result.changed) setShowEmailUpdatedBanner(true)
          }
        } catch { /* Account controls remain usable if the notification request fails. */ }
      } catch {
        if (active) setAccountError('Could not load your account. Please refresh and try again.')
      } finally {
        if (active && emailUpdated) {
          const url = new URL(window.location.href)
          url.searchParams.delete('email_updated')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }
    loadUser()
    return () => { active = false }
  }, [emailUpdated, router])

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!accountReady || pwLoading) return
    setPwLoading(true)
    setPwMsg(null)
    try {
      if (!isPasswordValid(newPw)) throw new Error('Use at least 8 characters, including uppercase, lowercase, a number and a special character.')
      if (newPw !== confirmPw) throw new Error('New passwords do not match.')
      if (newPw === currentPw) throw new Error('Choose a different password from your current one.')
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || user?.id !== accountId || !user.email) throw new Error('Your account session changed. Please refresh before updating your password.')
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
      if (signInError) throw new Error(signInError.status === 400 ? 'Current password is incorrect.' : signInError.message)
      if (signedIn.user?.id !== accountId) throw new Error('Could not verify your account. Please refresh and try again.')
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setShowCurrentPw(false); setShowNewPw(false)
    } catch (error) {
      setPwMsg({ type: 'err', text: error instanceof Error ? error.message : 'Could not update your password. Please try again.' })
    } finally { setPwLoading(false) }
  }

  async function handleResetPassword() {
    if (!accountReady || resetPwLoading) return
    setResetPwLoading(true); setResetPwMsg(null)
    try {
      const supabase = createClient()
      const next = encodeURIComponent('/reset-password')
      const { error } = await supabase.auth.resetPasswordForEmail(currentEmail, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${next}`,
      })
      if (error) throw error
      setResetPwMsg({ type: 'ok', text: `Password reset link sent to ${currentEmail}. Check your inbox and spam folder.` })
    } catch (error) {
      setResetPwMsg({ type: 'err', text: error instanceof Error ? error.message : 'Could not send the reset link. Please try again.' })
    } finally { setResetPwLoading(false) }
  }

  function handleStartEmailChange() { setEmailStep('enter-new'); setEmailMsg(null) }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!accountReady || emailLoading) return
    setEmailLoading(true); setEmailMsg(null)
    try {
      const address = newEmail.trim().toLowerCase()
      if (address !== confirmNewEmail.trim().toLowerCase()) throw new Error('Email addresses do not match.')
      if (address === currentEmail.toLowerCase()) throw new Error('New email must be different from current email.')
      const supabase = createClient()
      const next = encodeURIComponent('/dashboard/settings?email_updated=true')
      const { data, error } = await supabase.auth.updateUser({ email: address }, {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${next}`,
      })
      if (error) throw error
      if (data.user?.email?.toLowerCase() === address) {
        setCurrentEmail(data.user.email)
        setEmailMsg({ type: 'ok', text: 'Email address updated successfully.' })
        await fetch('/api/auth/email-change-notification', { method: 'POST' }).catch(() => undefined)
      } else {
        setEmailMsg({ type: 'ok', text: 'Check your current and new email inboxes for confirmation links. Your email stays unchanged until the required confirmations are complete.' })
      }
      setNewEmail(''); setConfirmNewEmail(''); setEmailStep('idle')
    } catch (error) {
      setEmailMsg({ type: 'err', text: error instanceof Error ? error.message : 'Could not update your email. Please try again.' })
    } finally { setEmailLoading(false) }
  }

  function cancelEmailChange() {
    setEmailStep('idle'); setEmailMsg(null); setNewEmail(''); setConfirmNewEmail('')
  }

  async function handleSignOutEverywhere() {
    if (signOutLoading) return
    setSignOutLoading(true); setSignOutError(null)
    try {
      const { error } = await createClient().auth.signOut({ scope: 'global' })
      if (error) throw error
      window.location.assign('/')
    } catch {
      setSignOutError('Could not sign out all sessions. Please try again.')
      setSignOutLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#64748B] disabled:bg-[#F5F0E8] disabled:text-[#64748B] disabled:cursor-not-allowed'

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-[#1B2E4B]">Account Settings</h1>

      {!accountReady && !accountError && <p role="status" className="text-sm text-[#64748B]">Loading your account…</p>}
      {accountError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{accountError}</p>}

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
        <h2 className="text-base font-semibold text-[#1B2E4B] mb-2">Email Address</h2>
        <p className="text-sm text-[#6B7280] mb-5">
          Current email: <strong className="text-[#1A1A2E]">{currentEmail || 'Loading…'}</strong>
        </p>

        {emailMsg && (
          <div
            role="status"
            aria-live="polite"
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
            disabled={!accountReady || emailLoading}
            className="ui-button-primary hover:bg-[#16253d] disabled:opacity-60"
          >
            Change email address
          </button>
        )}

        {emailStep === 'enter-new' && (
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label htmlFor="new-email" className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                New Email Address
              </label>
              <input
                id="new-email"
                autoComplete="email"
                disabled={!accountReady || emailLoading}
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="your-new-email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-email" className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
                Confirm New Email
              </label>
              <input
                id="confirm-email"
                autoComplete="email"
                disabled={!accountReady || emailLoading}
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
                disabled={!accountReady || emailLoading}
                className="ui-button-primary hover:bg-[#16253d] disabled:opacity-60"
              >
                {emailLoading ? 'Updating…' : 'Update email'}
              </button>
              <button
                type="button"
                onClick={cancelEmailChange}
                disabled={emailLoading}
                className="text-sm font-semibold text-[#64748B] hover:text-[#1B2E4B] transition-colors px-4"
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
        <h2 className="text-base font-semibold text-[#1B2E4B] mb-5">Change Password</h2>

        {pwMsg && (
          <div
            role="status"
            aria-live="polite"
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
            role="status"
            aria-live="polite"
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm ${
              resetPwMsg.type === 'ok'
                ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A]'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {resetPwMsg.text}
          </div>
        )}

        {oauthOnly && <p className="mb-5 text-sm text-[#64748B]">You sign in through an external provider. Use the reset link to set a password for email sign-in.</p>}
        {oauthOnly && <button type="button" onClick={handleResetPassword} disabled={!accountReady || resetPwLoading} className="ui-button-primary disabled:opacity-60">{resetPwLoading ? 'Sending…' : 'Send password setup link'}</button>}
        {!oauthOnly && <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="current-password" className="text-sm font-semibold text-[#1B2E4B]">
                Current Password
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={!accountReady || resetPwLoading}
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors disabled:opacity-60"
              >
                {resetPwLoading ? 'Sending...' : 'Forgot your password?'}
              </button>
            </div>
            <div className="relative">
              <input
                id="current-password"
                autoComplete="current-password"
                disabled={!accountReady || pwLoading}
                type={showCurrentPw ? 'text' : 'password'}
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                aria-pressed={showCurrentPw}
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1B2E4B] transition-colors"
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
            <label htmlFor="new-password" className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                autoComplete="new-password"
                disabled={!accountReady || pwLoading}
                type={showNewPw ? 'text' : 'password'}
                minLength={8}
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                aria-pressed={showNewPw}
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1B2E4B] transition-colors"
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
            <p className="text-xs text-[#64748B] mt-2">
              At least 8 characters, with uppercase, lowercase, a number and a special character
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">Confirm new password</label>
            <input id="confirm-password" type={showNewPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} disabled={!accountReady || pwLoading} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputClass} placeholder="Enter your new password again" />
          </div>

          <button
            type="submit"
            disabled={!accountReady || pwLoading}
            className="ui-button-primary hover:bg-[#16253d] disabled:opacity-60"
          >
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-base font-semibold text-[#1B2E4B] mb-2">Sign out everywhere</h2>
        <p className="text-sm text-[#64748B] mb-4">
          Sign out of all active sessions on all devices.
        </p>
        {signOutError && <p role="alert" className="mb-3 text-sm text-red-600">{signOutError}</p>}
        <button
          onClick={handleSignOutEverywhere}
          disabled={signOutLoading || !accountReady}
          className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
        >
          {signOutLoading ? 'Signing out…' : 'Sign out all sessions'}
        </button>
      </div>
    </div>
  )
}
