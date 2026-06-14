import type { SupabaseClient } from '@supabase/supabase-js'

export const REFERRAL_CODE_LENGTH = 6
export const REFERRAL_COOKIE_NAME = 'gpg_ref'
export const REFERRAL_COOKIE_DAYS = 30
export const REFERRAL_CREDIT_EXPIRY_DAYS = 90
export const REFERRAL_DISCOUNT_PERCENT = 10
export const REFERRED_FRIEND_DISCOUNT_PERCENT = 15

/**
 * Generate a random 6-character alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars: 0, O, 1, I
  let code = ''
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Create a unique referral code for a user
 * Retries up to 5 times if code collision occurs
 */
export async function createReferralCodeForUser(
  supabase: SupabaseClient,
  userId: string,
  maxRetries = 5
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateReferralCode()

    const { error } = await supabase
      .from('referral_codes')
      .insert({ user_id: userId, code })

    if (!error) {
      return code
    }

    // If it's not a unique constraint violation, bail out
    if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
      console.error('[referral] failed to create code:', error)
      return null
    }

    // Otherwise retry with a new code
  }

  console.error('[referral] failed to create unique code after', maxRetries, 'attempts')
  return null
}

/**
 * Get referral code for a user
 */
export async function getReferralCodeForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.code
}

/**
 * Get user ID from a referral code
 */
export async function getUserIdFromReferralCode(
  supabase: SupabaseClient,
  code: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    return null
  }

  return data.user_id
}

/**
 * Create a referral relationship
 * Returns false if already referred or self-referral
 */
export async function createReferral(
  supabase: SupabaseClient,
  referrerCode: string,
  referredUserId: string
): Promise<boolean> {
  // Get referrer user ID from code
  const referrerId = await getUserIdFromReferralCode(supabase, referrerCode)
  if (!referrerId) {
    return false
  }

  // Prevent self-referral
  if (referrerId === referredUserId) {
    console.log('[referral] self-referral attempt blocked')
    return false
  }

  // Check if user is already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .single()

  if (existing) {
    console.log('[referral] user already referred')
    return false
  }

  // Create referral
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredUserId,
      status: 'pending',
    })

  if (error) {
    console.error('[referral] failed to create referral:', error)
    return false
  }

  return true
}

/**
 * Check if a user was referred
 */
export async function wasUserReferred(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', userId)
    .single()

  return !!data
}

/**
 * Get available referral credit for a user
 * Returns the first unused, non-expired credit
 */
export async function getAvailableReferralCredit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; referral_id: string } | null> {
  const { data, error } = await supabase
    .from('referral_credits')
    .select('id, referral_id')
    .eq('user_id', userId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Mark a referral credit as used
 */
export async function markCreditAsUsed(
  supabase: SupabaseClient,
  creditId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('referral_credits')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
    })
    .eq('id', creditId)

  if (error) {
    console.error('[referral] failed to mark credit as used:', error)
    return false
  }

  return true
}

/**
 * Issue a referral credit to a user
 */
export async function issueReferralCredit(
  supabase: SupabaseClient,
  userId: string,
  referralId: string
): Promise<boolean> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFERRAL_CREDIT_EXPIRY_DAYS)

  const { error } = await supabase
    .from('referral_credits')
    .insert({
      user_id: userId,
      referral_id: referralId,
      amount: 0, // Percentage-based discount
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('[referral] failed to issue credit:', error)
    return false
  }

  return true
}

/**
 * Complete a referral and issue credit to referrer
 */
export async function completeReferral(
  supabase: SupabaseClient,
  referredUserId: string
): Promise<boolean> {
  // Get the referral record
  const { data: referral, error: fetchError } = await supabase
    .from('referrals')
    .select('id, referrer_id, status')
    .eq('referred_id', referredUserId)
    .single()

  if (fetchError || !referral) {
    return false
  }

  // Already completed
  if (referral.status === 'completed') {
    return true
  }

  // Update referral status to completed
  const { error: updateError } = await supabase
    .from('referrals')
    .update({ status: 'completed' })
    .eq('id', referral.id)

  if (updateError) {
    console.error('[referral] failed to update referral status:', updateError)
    return false
  }

  // Issue credit to referrer
  const issued = await issueReferralCredit(supabase, referral.referrer_id, referral.id)

  return issued
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  totalReferred: number
  completedReferrals: number
  pendingReferrals: number
  availableCredits: number
}> {
  // Get all referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', userId)

  const totalReferred = referrals?.length ?? 0
  const completedReferrals = referrals?.filter((r) => r.status === 'completed').length ?? 0
  const pendingReferrals = referrals?.filter((r) => r.status === 'pending').length ?? 0

  // Get available credits
  const { data: credits } = await supabase
    .from('referral_credits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())

  const availableCredits = credits?.length ?? 0

  return {
    totalReferred,
    completedReferrals,
    pendingReferrals,
    availableCredits,
  }
}
