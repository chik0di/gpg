import type { SupabaseClient } from '@supabase/supabase-js'

export const FIRST_ORDER_DISCOUNT_PERCENT = 10
export const FIRST_ORDER_DISCOUNT_DAYS = 30

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
