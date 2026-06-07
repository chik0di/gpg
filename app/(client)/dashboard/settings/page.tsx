'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [newPw, setNewPw]         = useState('')

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPwLoading(true)
    setPwMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setNewPw('')
    }
    setPwLoading(false)
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all text-[#1A1A2E] placeholder:text-[#C4C0B8] disabled:bg-[#F5F0E8] disabled:text-[#9CA3AF] disabled:cursor-not-allowed'

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Account Settings</h1>

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

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
              New password
            </label>
            <input
              type="password"
              minLength={8}
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              className={inputClass}
            />
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
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            Sign out all sessions
          </button>
        </form>
      </div>
    </div>
  )
}
