import type { SupabaseClient } from '@supabase/supabase-js'
import {
  wasUserReferred,
  getAvailableReferralCredit,
  REFERRAL_DISCOUNT_PERCENT,
  REFERRED_FRIEND_DISCOUNT_PERCENT,
} from './referral'

export const FIRST_ORDER_DISCOUNT_PERCENT = 10
export const FIRST_ORDER_DISCOUNT_DAYS = 30

export type DiscountType =
  | 'none'
  | 'first-order'
  | 'referral-credit'
  | 'referred-friend'

export interface DiscountInfo {
  type: DiscountType
  percent: number
  label: string
  creditId?: string // For referral credits
}

/**
 * Check if a user is eligible for the first-time order discount.
 * Returns true if the user has never placed a completed or paid order.
 */
export async function isEligibleForFirstOrderDiscount(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['completed', 'paid', 'pending'])
    .limit(1)

  if (error) {
    console.error('[discount] failed to check order history:', error)
    return false
  }

  // If no orders exist, user is eligible
  return !data || data.length === 0
}

/**
 * Apply the first-time order discount to a subtotal amount.
 * Returns the discounted amount and the discount value.
 */
export function applyFirstOrderDiscount(subtotal: number): {
  discountedAmount: number
  discountAmount: number
} {
  const discountAmount = subtotal * (FIRST_ORDER_DISCOUNT_PERCENT / 100)
  const discountedAmount = subtotal - discountAmount

  return {
    discountedAmount: Math.max(0, discountedAmount),
    discountAmount,
  }
}

/**
 * Check if user account is within the discount eligibility window.
 * Discount expires 30 days after account creation.
 */
export async function isWithinDiscountWindow(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  const accountAge = Date.now() - new Date(data.created_at).getTime()
  const daysOld = accountAge / (1000 * 60 * 60 * 24)

  return daysOld <= FIRST_ORDER_DISCOUNT_DAYS
}

/**
 * Determine the best discount to apply for a user
 * Priority: Referred friend (15%) > Referral credit (10%) > First order (10%)
 * Only one discount can be applied per order
 */
export async function getBestDiscount(
  supabase: SupabaseClient,
  userId: string
): Promise<DiscountInfo> {
  const isFirstOrder = await isEligibleForFirstOrderDiscount(supabase, userId)

  if (!isFirstOrder) {
    // Not first order - check for referral credit
    const credit = await getAvailableReferralCredit(supabase, userId)
    if (credit) {
      return {
        type: 'referral-credit',
        percent: REFERRAL_DISCOUNT_PERCENT,
        label: 'Referral credit',
        creditId: credit.id,
      }
    }
    return { type: 'none', percent: 0, label: '' }
  }

  // First order - check if user was referred
  const isReferred = await wasUserReferred(supabase, userId)

  if (isReferred) {
    // Referred friend gets 15% (better than standard 10%)
    return {
      type: 'referred-friend',
      percent: REFERRED_FRIEND_DISCOUNT_PERCENT,
      label: 'Referred friend discount',
    }
  }

  // Standard first order discount (10%)
  const isInWindow = await isWithinDiscountWindow(supabase, userId)
  if (isInWindow) {
    return {
      type: 'first-order',
      percent: FIRST_ORDER_DISCOUNT_PERCENT,
      label: 'First order discount',
    }
  }

  return { type: 'none', percent: 0, label: '' }
}
