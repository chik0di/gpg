'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReferralStats {
  code: string
  totalReferred: number
  completedReferrals: number
  availableCredits: number
}

export default function ReferralSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReferralData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Get referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .single()

      if (!codeData) {
        setLoading(false)
        return
      }

      // Get referral stats
      const { data: referrals } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', user.id)

      const totalReferred = referrals?.length ?? 0
      const completedReferrals = referrals?.filter((r) => r.status === 'completed').length ?? 0

      // Get available credits
      const { data: credits } = await supabase
        .from('referral_credits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())

      const availableCredits = credits?.length ?? 0

      setStats({
        code: codeData.code,
        totalReferred,
        completedReferrals,
        availableCredits,
      })
      setLoading(false)
    }

    loadReferralData()
  }, [])

  async function copyToClipboard() {
    if (!stats) return

    const referralLink = `${window.location.origin}?ref=${stats.code}`

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#F5F0E8] rounded w-1/3"></div>
          <div className="h-10 bg-[#F5F0E8] rounded"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'getprimegrade.com'}?ref=${stats.code}`

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#FDF3DC] flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#E8A020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-[#1B2E4B] mb-1">Refer a Friend</h2>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            When a friend you refer places their first order, you get <strong>10% off your next order</strong>.
            Your friend gets <strong>15% off</strong> their first order — better than our standard welcome discount.
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-[#1B2E4B] mb-2">Your unique referral link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-4 py-2.5 border border-[#E8E2D9] rounded-xl text-sm bg-[#FDFAF6] text-[#6B7280] font-mono"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2.5 bg-[#1B2E4B] hover:bg-[#16253d] text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#F5F0E8] rounded-xl px-3 py-3">
          <p className="text-xs text-[#9CA3AF] mb-1">Referred</p>
          <p className="text-xl font-bold text-[#1B2E4B]">{stats.totalReferred}</p>
        </div>
        <div className="bg-[#F5F0E8] rounded-xl px-3 py-3">
          <p className="text-xs text-[#9CA3AF] mb-1">Ordered</p>
          <p className="text-xl font-bold text-[#1B2E4B]">{stats.completedReferrals}</p>
        </div>
        <div className="bg-[#FDF3DC] rounded-xl px-3 py-3">
          <p className="text-xs text-[#C4861A] mb-1">Credits</p>
          <p className="text-xl font-bold text-[#E8A020]">{stats.availableCredits}</p>
        </div>
      </div>
    </div>
  )
}
